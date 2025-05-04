// server.js

const express = require('express');
const mysql   = require('mysql2/promise');
const path    = require('path');
const bcrypt  = require('bcrypt');

const app = express();
app.use(express.json());

// --- CONFIGURAÇÃO DO POOL --- 
let pool;

// Em produção (Railway) a variável MYSQL_URL já estará definida:
const databaseUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;

if (databaseUrl) {
  // Conecta via URL única (Railway)
  console.log('▶️  Conectando ao MySQL via URL:', databaseUrl);
  pool = mysql.createPool(databaseUrl);
} else {
  // Em desenvolvimento local, usa variáveis ou valores padrões:
  pool = mysql.createPool({
    host:               process.env.MYSQLHOST     || '127.0.0.1',
    port:               process.env.MYSQLPORT     || 3306,
    user:               process.env.MYSQLUSER     || 'root',
    password:           process.env.MYSQLPASSWORD || 'SUA_NOVA_SENHA',
    database:           process.env.MYSQLDATABASE || 'recicla_soft',
    waitForConnections: true,
    connectionLimit:    10,
  });
}

// --- Registro ---
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name, email, hash]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    const msg = err.code === 'ER_DUP_ENTRY'
      ? 'Email já cadastrado'
      : 'Erro ao cadastrar';
    res.status(400).json({ error: msg });
  }
});

// --- Login ---
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const [rows] = await pool.query(
      'SELECT user_id, name, password FROM users WHERE email = ?',
      [email]
    );
    if (!rows.length) return res.status(400).json({ error: 'Credenciais inválidas' });
    const valid = await bcrypt.compare(password, rows[0].password);
    if (!valid)  return res.status(400).json({ error: 'Credenciais inválidas' });

    // Retorna userId e nome para o frontend
    res.json({ success: true, userId: rows[0].user_id, name: rows[0].name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

// --- Listar materiais ---
app.get('/api/materials', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT material_id, name, price_per_kg FROM materials'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Falha ao buscar materiais' });
  }
});

// --- Adicionar material ---
app.post('/api/materials', async (req, res) => {
  try {
    const { name, price } = req.body;
    await pool.query(
      'INSERT INTO materials (name, price_per_kg) VALUES (?, ?)',
      [name, price]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    const msg = err.code === 'ER_DUP_ENTRY'
      ? 'Material já existe'
      : 'Falha ao adicionar';
    res.status(400).json({ error: msg });
  }
});

// --- Alterar preço de material ---
app.put('/api/materials/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { price } = req.body;
    await pool.query(
      'UPDATE materials SET price_per_kg = ? WHERE material_id = ?',
      [price, id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Falha ao atualizar' });
  }
});

// --- Registrar venda ---
app.post('/api/sales', async (req, res) => {
  try {
    const { material, quantity, total, userId } = req.body;
    const [mat] = await pool.query(
      'SELECT material_id FROM materials WHERE name = ?',
      [material]
    );
    if (!mat.length) return res.status(400).json({ error: 'Material não cadastrado' });

    await pool.query(
      `INSERT INTO sales
         (material_id, quantity_kg, total_price, sale_datetime, user_id)
       VALUES (?, ?, ?, NOW(), ?)`,
      [mat[0].material_id, quantity, total, userId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Falha ao registrar venda' });
  }
});

// --- Listar últimas 3 vendas do usuário ---

app.get('/api/sales', async (req, res) => {
  const userId = parseInt(req.query.userId, 10);
  if (!userId) return res.status(400).json({ error: 'userId é obrigatório' });

  try {
    const [rows] = await pool.query(
      `SELECT
         m.name       AS material,
         s.quantity_kg,
         s.total_price,
         s.sale_datetime
       FROM sales s
       JOIN materials m ON s.material_id = m.material_id
       WHERE s.user_id = ?
       ORDER BY s.sale_datetime DESC
       LIMIT 3`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Falha ao buscar vendas' });
  }
});

app.get('/api/stock', async (req, res) => {
  const userId = parseInt(req.query.userId, 10);
  if (!userId) return res.status(400).json({ error: 'userId é obrigatório' });

  try {
    const [rows] = await pool.query(
      `SELECT
         m.name                                       AS material,
         SUM(s.quantity_kg)                           AS total_qty,
         SUM(s.total_price)                           AS total_value
       FROM sales s
       JOIN materials m ON s.material_id = m.material_id
       WHERE s.user_id = ?
       GROUP BY m.material_id, m.name
       ORDER BY total_qty DESC`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Falha ao buscar estoque' });
  }
});

app.delete('/api/materials/:id', async (req, res) => {
  const id = req.params.id;
  try {
    await pool.query('DELETE FROM materials WHERE material_id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Não foi possível remover o material' });
  }
});

// --- Resumo Mensal (atualizado) ---
app.get('/api/summary', async (req, res) => {
  try {
    const userId = parseInt(req.query.userId, 10);
    const month  = req.query.month; // “YYYY‑MM”
    if (!userId || !month) {
      return res.status(400).json({ error: 'userId e month são obrigatórios' });
    }

    // define início e fim do mês
    const start = `${month}-01 00:00:00`;
    // calcula fim do mês
    const endDate = new Date(`${month}-01`);
    endDate.setMonth(endDate.getMonth() + 1);
    endDate.setSeconds(endDate.getSeconds() - 1);
    const end = endDate.toISOString().slice(0,19).replace('T',' ');

    const conn = await pool.getConnection();

    // 1) Material mais vendido (somando apenas saídas)
    const [[mostSold]] = await conn.query(`
      SELECT m.name AS material,
             SUM(ABS(s.quantity_kg)) AS quantity
      FROM sales s
      JOIN materials m ON s.material_id = m.material_id
      WHERE s.user_id = ? AND s.sale_datetime BETWEEN ? AND ?
        AND s.quantity_kg < 0
      GROUP BY m.name
      ORDER BY SUM(ABS(s.quantity_kg)) DESC
      LIMIT 1
    `, [userId, start, end]);

    // 2) Maior venda individual (total_price > 0)
    const [[highestSale]] = await conn.query(`
      SELECT m.name       AS material,
             s.total_price AS total,
             s.sale_datetime AS date
      FROM sales s
      JOIN materials m ON s.material_id = m.material_id
      WHERE s.user_id = ? AND s.sale_datetime BETWEEN ? AND ?
        AND s.total_price > 0
      ORDER BY s.total_price DESC
      LIMIT 1
    `, [userId, start, end]);

    // 3) Contagem de vendas (total_price > 0)
    const [[{ salesCount }]] = await conn.query(`
      SELECT COUNT(*) AS salesCount
      FROM sales
      WHERE user_id = ? AND sale_datetime BETWEEN ? AND ?
        AND total_price > 0
    `, [userId, start, end]);

    // 4) Total de Gastos (compras: total_price < 0)
    const [[{ totalExpenses }]] = await conn.query(`
      SELECT -COALESCE(SUM(total_price),0) AS totalExpenses
      FROM sales
      WHERE user_id = ? AND sale_datetime BETWEEN ? AND ?
        AND total_price < 0
    `, [userId, start, end]);

    // 5) Faturamento (vendas: total_price > 0)
    const [[{ revenue }]] = await conn.query(`
      SELECT COALESCE(SUM(total_price),0) AS revenue
      FROM sales
      WHERE user_id = ? AND sale_datetime BETWEEN ? AND ?
        AND total_price > 0
    `, [userId, start, end]);

    conn.release();

    res.json({
      mostSold:       mostSold   || { material:null, quantity:0 },
      highestSale:    highestSale|| { material:null, total:0, date:null },
      salesCount:     salesCount || 0,
      totalExpenses:  totalExpenses,
      revenue:        revenue
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Falha ao gerar resumo mensal' });
  }
});


app.use(express.static(path.join(__dirname, 'docs')));

app.get(/.*/,(req, res) => {
  res.sendFile(path.join(__dirname, 'docs', 'index.html'));
});


// Inicia o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server rodando em http://localhost:${PORT}`);
});

