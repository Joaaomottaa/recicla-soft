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
    host:               process.env.MYSQLHOST     || 'shuttle.proxy.rlwy.net',
    port:               process.env.MYSQLPORT     || 35053,
    user:               process.env.MYSQLUSER     || 'root',
    password:           process.env.MYSQLPASSWORD || 'uEwIsvRoeapKEtOwGdZanzmAeuNEIWkB',
    database:           process.env.MYSQLDATABASE || 'railway',
    waitForConnections: true,
    connectionLimit:    10,
  });
}

// --- GET único material (pela PK) ---
app.get('/api/materials/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'ID inválido' });
  }
  try {
    const [rows] = await pool.query(
      'SELECT material_id, name, price_per_kg FROM materials WHERE material_id = ?',
      [id]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Material não encontrado' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Erro em GET /api/materials/:id', err);
    res.status(500).json({ error: 'Falha ao buscar material' });
  }
});

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
    if (!valid) return res.status(400).json({ error: 'Credenciais inválidas' });

    res.json({
      success: true,
      userId: rows[0].user_id,
      name:   rows[0].name
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

// --- Listar materiais (globais + do usuário) ---
app.get('/api/materials', async (req, res) => {
  const userId = parseInt(req.query.userId, 10);
  if (!userId) return res.status(400).json({ error: 'userId é obrigatório' });
  try {
    const [rows] = await pool.query(
      `SELECT material_id, name, price_per_kg
         FROM materials
        WHERE user_id IS NULL
           OR user_id = ?
        ORDER BY name`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error('Erro em GET /api/materials:', err);
    res.status(500).json({ error: 'Falha ao buscar materiais' });
  }
});

// --- Adicionar material (só para o usuário) ---
app.post('/api/materials', async (req, res) => {
  const { name, price, userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId é obrigatório' });
  try {
    await pool.query(
      'INSERT INTO materials (name, price_per_kg, user_id) VALUES (?, ?, ?)',
      [name, price, userId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Erro em POST /api/materials:', err);
    res.status(400).json({
      error: err.code === 'ER_DUP_ENTRY'
        ? 'Você já tem um material com esse nome'
        : 'Falha ao adicionar material'
    });
  }
});

// --- Atualizar preço (qualquer usuário sobre qualquer material) ---
app.put('/api/materials/:id', async (req, res) => {
  const id    = parseInt(req.params.id, 10);
  const { price } = req.body;

  if (isNaN(id) || isNaN(price)) {
    return res.status(400).json({ error: 'ID ou preço inválido' });
  }

  try {
    const [result] = await pool.query(
      'UPDATE materials SET price_per_kg = ? WHERE material_id = ?',
      [price, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Material não encontrado' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Erro em PUT /api/materials/:id:', err);
    res.status(500).json({ error: 'Falha ao atualizar material' });
  }
});



// --- Remover material (usuário -> pode remover mesmo com vendas; system/global -> não pode) ---
app.delete('/api/materials/:id', async (req, res) => {
  const id     = parseInt(req.params.id, 10);
  const userId = parseInt(req.query.userId, 10) || req.body.userId;
  if (!userId) {
    return res.status(400).json({ error: 'userId é obrigatório' });
  }

  try {
    // 1) Busco o material
    const [[material]] = await pool.query(
      'SELECT user_id FROM materials WHERE material_id = ?',
      [id]
    );
    if (!material) {
      return res.status(404).json({ error: 'Material não encontrado' });
    }

    // 2) Se for global (user_id IS NULL), proíbo a exclusão
    if (material.user_id === null) {
      return res
        .status(403)
        .json({ error: 'Material do sistema não pode ser removido' });
    }

    // 3) Senão for global, é material do usuário: remover vendas dele primeiro
    await pool.query(
      'DELETE FROM sales WHERE material_id = ? AND user_id = ?',
      [id, userId]
    );

    // 4) E então remover o próprio material
    const [del] = await pool.query(
      'DELETE FROM materials WHERE material_id = ? AND user_id = ?',
      [id, userId]
    );
    if (del.affectedRows === 0) {
      return res
        .status(404)
        .json({ error: 'Material não pertence a este usuário' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Erro em DELETE /api/materials/:id:', err);
    res.status(500).json({ error: 'Falha ao remover material' });
  }
});

// --- Registrar venda ---
app.post('/api/sales', async (req, res) => {
  try {
    const { material, quantity, total, userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId é obrigatório' });

    // busca o material pelo nome (sem filtrar user_id)
    const [matRows] = await pool.query(
      'SELECT material_id FROM materials WHERE name = ?',
      [material]
    );
    if (!matRows.length) {
      return res.status(400).json({ error: 'Material não cadastrado' });
    }

    // insere a venda / compra
    await pool.query(
      `INSERT INTO sales
         (material_id, quantity_kg, total_price, sale_datetime, user_id)
       VALUES (?, ?, ?, NOW(), ?)`,
      [matRows[0].material_id, quantity, total, userId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Falha ao registrar venda' });
  }
});

// --- Últimas 3 vendas do usuário ---
app.get('/api/sales', async (req, res) => {
  try {
    const userId = parseInt(req.query.userId, 10);
    if (!userId) return res.status(400).json({ error: 'userId é obrigatório' });

    const [rows] = await pool.query(
      `SELECT
         m.name        AS material,
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

// --- Estoque agregado do usuário ---
app.get('/api/stock', async (req, res) => {
  try {
    const userId = parseInt(req.query.userId, 10);
    if (!userId) return res.status(400).json({ error: 'userId é obrigatório' });

    const [rows] = await pool.query(
      `SELECT
         m.name             AS material,
         SUM(s.quantity_kg) AS total_qty,
         SUM(s.total_price) AS total_value
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

// --- Resumo Mensal ---
app.get('/api/summary', async (req, res) => {
  try {
    const userId = parseInt(req.query.userId, 10);
    const month  = req.query.month; // ex: "2025-05"
    if (!userId || !month) {
      return res.status(400).json({ error: 'userId e month são obrigatórios' });
    }

    const start = `${month}-01 00:00:00`;
    const [year, mon] = month.split('-').map(Number);
    const nextMonth = mon === 12
      ? `${year+1}-01-01`
      : `${year}-${String(mon+1).padStart(2,'0')}-01`;
    const end = `${nextMonth} 00:00:00`;

    const conn = await pool.getConnection();

    const [[mostSold]] = await conn.query(`
      SELECT m.name               AS material,
             SUM(ABS(s.quantity_kg)) AS quantity
        FROM sales s
        JOIN materials m ON s.material_id = m.material_id
       WHERE s.user_id = ? AND s.sale_datetime >= ? AND s.sale_datetime < ? AND s.quantity_kg < 0
       GROUP BY m.name
       ORDER BY quantity DESC
       LIMIT 1
    `, [userId, start, end]);

    const [[highestSale]] = await conn.query(`
      SELECT m.name         AS material,
             s.total_price  AS total,
             s.sale_datetime AS date
        FROM sales s
        JOIN materials m ON s.material_id = m.material_id
       WHERE s.user_id = ? AND s.sale_datetime >= ? AND s.sale_datetime < ? AND s.total_price > 0
       ORDER BY s.total_price DESC
       LIMIT 1
    `, [userId, start, end]);

    const [[{ salesCount }]] = await conn.query(`
      SELECT COUNT(*) AS salesCount
        FROM sales
       WHERE user_id = ? AND sale_datetime >= ? AND sale_datetime < ? AND total_price > 0
    `, [userId, start, end]);

    const [[{ totalExpenses }]] = await conn.query(`
      SELECT -COALESCE(SUM(total_price),0) AS totalExpenses
        FROM sales
       WHERE user_id = ? AND sale_datetime >= ? AND sale_datetime < ? AND total_price < 0
    `, [userId, start, end]);

    const [[{ revenue }]] = await conn.query(`
      SELECT COALESCE(SUM(total_price),0) AS revenue
        FROM sales
       WHERE user_id = ? AND sale_datetime >= ? AND sale_datetime < ? AND total_price > 0
    `, [userId, start, end]);

    conn.release();

    res.json({
      mostSold:       mostSold    || { material:null, quantity:0 },
      highestSale:    highestSale || { material:null, total:0, date:null },
      salesCount:     salesCount  || 0,
      totalExpenses:  totalExpenses,
      revenue:        revenue
    });
  } catch (err) {
    console.error('Erro em /api/summary:', err);
    res.status(500).json({ error: 'Falha ao gerar resumo mensal' });
  }
});

app.use(express.static(path.join(__dirname, 'public')));

// Inicia o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server rodando em http://localhost:${PORT}`);
});
