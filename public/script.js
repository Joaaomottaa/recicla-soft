// public/script.js
document.addEventListener('DOMContentLoaded', () => {
  console.log('🔧 script.js carregado');

  let currentUserId   = null;
  let currentUserName = null;
  let lastCalc        = {};

  // Mapas de preços
  let materialPricesByName = {};
  let materialPricesById   = {};

const removeSelect = document.getElementById('removeSelect');
const btnRemove    = document.getElementById('btnRemove');
const removeMsg    = document.getElementById('removeMsg');

  // --- DOM refs ---
  const loginModal    = document.getElementById('loginModal');
  const appContainer  = document.getElementById('appContainer');
  const greetingEl    = document.getElementById('greeting');

  const views = {
    mainView:  document.getElementById('mainView'),
    salesView: document.getElementById('salesView'),
    alterView: document.getElementById('alterView'),
    addView:   document.getElementById('addView'),
    removeView: document.getElementById('removeView'),
    stockView:  document.getElementById('stockView')
  };

  const stockBody  = document.getElementById('stockBody');
  views.stockView = document.getElementById('stockView');

  // Menu items
  const menuItems = document.querySelectorAll('.menu-item[data-view]');
  const btnLogout = document.getElementById('btnLogout');

  // Login/Cadastro refs
  const loginView      = document.getElementById('loginView');
  const registerView   = document.getElementById('registerView');
  const btnLogin       = document.getElementById('btnLogin');
  const btnShowRegister= document.getElementById('btnShowRegister');
  const btnBackToLogin = document.getElementById('btnBackToLogin');
  const btnRegister    = document.getElementById('btnRegister');
  const loginEmail     = document.getElementById('loginEmail');
  const loginPass      = document.getElementById('loginPass');
  const regName        = document.getElementById('regName');
  const regEmail       = document.getElementById('regEmail');
  const regPass        = document.getElementById('regPass');
  const loginMsg       = document.getElementById('loginMsg');
  const regMsg         = document.getElementById('regMsg');

  // Calculadora refs
  const materialSelect = document.getElementById('materialSelect');
  const quantityInput  = document.getElementById('quantityInput');
  const btnCalc        = document.getElementById('btnCalc');
  const btnRegSale     = document.getElementById('btnRegSale');
  const calcResult     = document.getElementById('calcResult');

  // Vendas refs
  const salesBody      = document.getElementById('salesBody');

  // Alterar material refs
  const alterSelect    = document.getElementById('alterMaterial');
  const currentPriceEl = document.getElementById('currentPrice');
  const alterPrice     = document.getElementById('alterPrice');
  const btnAlter       = document.getElementById('btnAlter');
  const alterMsg       = document.getElementById('alterMsg');

  // Adicionar material refs
  const newNameInput   = document.getElementById('newName');
  const newPriceInput  = document.getElementById('newPrice');
  const btnAdd         = document.getElementById('btnAdd');
  const addMsg         = document.getElementById('addMsg');

  // --- Função para mostrar views ---
  function showView(viewId) {
    console.log('🔀 showView:', viewId);
    Object.values(views).forEach(v => v.style.display = 'none');
    views[viewId].style.display = 'block';
    menuItems.forEach(mi => {
      mi.classList.toggle('active', mi.dataset.view === viewId);
    });
  }

  // --- Carrega materiais do backend ---
  async function loadMaterials() {
    console.log('⏳ loadMaterials()');
    materialSelect.innerHTML = '<option disabled>Carregando...</option>';
    alterSelect.innerHTML    = '<option disabled>Carregando...</option>';
    currentPriceEl.innerText = 'Preço atual: R$ 0,00';

    const resp = await fetch('/api/materials');
    const list = await resp.json();

    materialPricesByName = {};
    materialPricesById   = {};
    materialSelect.innerHTML = '<option value="" disabled selected>-- Escolha um material --</option>';
    alterSelect.innerHTML    = '<option value="" disabled selected>-- Escolha um material --</option>';
    removeSelect.innerHTML = '<option value="" disabled selected>-- Escolha um material --</option>';

    list.forEach(m => {
      const price = parseFloat(m.price_per_kg);
      materialPricesByName[m.name]      = price;
      materialPricesById[m.material_id] = price;

      materialSelect.innerHTML += 
        `<option value="${m.name}">
           ${m.name} (R$ ${price.toFixed(2)}/kg)
         </option>`;
      alterSelect.innerHTML += 
        `<option value="${m.material_id}">
           ${m.name}
         </option>`;

            // select de remoção
            removeSelect.innerHTML += `<option value="${m.material_id}">${m.name}</option>`;

    });
    console.log('✅ loadMaterials concluído:', materialPricesByName);
  }

  // --- Atualiza parágrafo de preço atual ao mudar seleção ---
  alterSelect.addEventListener('change', () => {
    const id    = alterSelect.value;
    const price = materialPricesById[id] || 0;
    currentPriceEl.innerText = `Preço atual: R$ ${price.toFixed(2)}`;
  });

  // --- Carrega últimas vendas ---
  async function loadSales() {
    console.log('⏳ loadSales() para user', currentUserId);
    salesBody.innerHTML = '<tr><td colspan="4">Carregando...</td></tr>';
    const resp  = await fetch(`/api/sales?userId=${currentUserId}`);
    const sales = await resp.json();

    if (!sales.length) {
      salesBody.innerHTML = '<tr><td colspan="4">Nenhuma venda</td></tr>';
    } else {
      salesBody.innerHTML = sales.map(s => {
        const q  = parseFloat(s.quantity_kg).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
        const t  = parseFloat(s.total_price).toFixed(2);
        const dt = new Date(s.sale_datetime).toLocaleString('pt-BR');
        return `<tr>
          <td>${s.material}</td>
          <td>${q}</td>
          <td>R$ ${t}</td>
          <td>${dt}</td>
        </tr>`;
      }).join('');
    }
    console.log('✅ loadSales concluído');
  }

  async function loadStock() {
    stockBody.innerHTML = '<tr><td colspan="3">Carregando…</td></tr>';
    const resp = await fetch(`/api/stock?userId=${currentUserId}`);
    const data = await resp.json();
  
    if (!Array.isArray(data) || !data.length) {
      stockBody.innerHTML = '<tr><td colspan="3">Nenhum estoque registrado</td></tr>';
      return;
    }
  
    stockBody.innerHTML = data.map(item => {
      const q = parseFloat(item.total_qty).toLocaleString('pt-BR',{minimumFractionDigits:2});
      const v = parseFloat(item.total_value).toLocaleString('pt-BR',{minimumFractionDigits:2});
      return `<tr>
        <td>${item.material}</td>
        <td>${q}</td>
        <td>R$ ${v}</td>
      </tr>`;
    }).join('');
  }

  // --- Handlers do menu lateral ---
  menuItems.forEach(item => {
    item.addEventListener('click', async () => {
      const viewId = item.dataset.view;
      console.log('🔘 menu click:', viewId);
      if (viewId === 'mainView')  await loadMaterials();
      if (viewId === 'salesView') await loadSales();
      if (viewId === 'alterView') await loadMaterials();
      if (viewId === 'addView')   { addMsg.innerText = ''; newNameInput.value = ''; newPriceInput.value = ''; }
      if (viewId === 'removeView')  { await loadMaterials(); removeMsg.innerText=''; }
      if (viewId === 'stockView')  {
        console.log('⏳ loadStock() para user', currentUserId);
        await loadStock();
      }
      showView(viewId);
    });
  });

  // --- Logout ---
  btnLogout.addEventListener('click', () => {
    console.log('👋 Logout');
    currentUserId = null;
    loginModal.style.display   = 'flex';
    appContainer.style.display = 'none';
    showView('mainView');
  });

  // --- Fluxo Cadastro / Login ---
  btnShowRegister.addEventListener('click', () => {
    loginView.style.display    = 'none';
    registerView.style.display = 'block';
  });
  btnBackToLogin.addEventListener('click', () => {
    registerView.style.display = 'none';
    loginView.style.display    = 'block';
  });

  btnRegister.addEventListener('click', async () => {
    const name  = regName.value.trim(),
          email = regEmail.value.trim(),
          pass  = regPass.value;
    if (!name || !email || !pass) {
      regMsg.innerText = 'Preencha todos os campos';
      return;
    }
    const resp = await fetch('/api/register', {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ name, email, password: pass })
    });
    const data = await resp.json();
    regMsg.innerText = data.success ? 'Cadastrado com sucesso!' : data.error;
    if (data.success) setTimeout(() => btnBackToLogin.click(), 1500);
  });

  btnLogin.addEventListener('click', async () => {
    const email = loginEmail.value.trim(),
          pass  = loginPass.value;
    if (!email || !pass) {
      loginMsg.innerText = 'Email e senha são obrigatórios';
      return;
    }
    const resp = await fetch('/api/login', {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ email, password: pass })
    });
    const data = await resp.json();
    if (data.success) {
      currentUserId   = data.userId;
      currentUserName = data.name;
      greetingEl.innerText    = `Olá, ${currentUserName}`;
      loginModal.style.display   = 'none';
      appContainer.style.display = 'flex';
      showView('mainView');
      await loadMaterials();
    } else {
      loginMsg.innerText = data.error;
    }
  });

  // --- Cálculo dinâmico ---
  btnCalc.addEventListener('click', () => {
    const mat = materialSelect.value;
    const qty = parseFloat(quantityInput.value);
    if (!mat || isNaN(qty)) {
      calcResult.innerText = 'Selecione material e informe quantidade.';
      calcResult.classList.add('error');
      calcResult.style.display = 'inline-block';
      btnRegSale.disabled = true;
      return;
    }
    const price = materialPricesByName[mat];
    const tot   = parseFloat((qty * price).toFixed(2));
    lastCalc    = { material: mat, quantity: qty, total: tot };
  
    calcResult.classList.remove('error');
    calcResult.innerText = `Total: R$ ${tot.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
    calcResult.style.display = 'inline-block';
    btnRegSale.disabled = false;
  });

  // --- Registrar venda ---
  btnRegSale.addEventListener('click', async () => {
    const resp = await fetch('/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...lastCalc, userId: currentUserId })
    });
    const data = await resp.json();
  
    if (data.success) {
      calcResult.classList.remove('error');
  
      // recalcula a string de total
      const totalStr = lastCalc.total
        .toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  
      // agora usamos innerHTML para incluir o ícone
      calcResult.innerHTML = 
        `Total: R$ ${totalStr} | Venda registrada com sucesso 
         <img 
           src="https://cdn-icons-png.flaticon.com/512/1370/1370674.png" 
           alt="✓" 
           class="success-icon"
         />`;
    } else {
      calcResult.classList.add('error');
      calcResult.innerText = `Erro: ${data.error}`;
    }
  
    calcResult.style.display = 'inline-block';
    btnRegSale.disabled      = false;
  });

  // --- Alterar valor do material ---
  btnAlter.addEventListener('click', async () => {
    const id    = alterSelect.value;
    const price = parseFloat(alterPrice.value);
    if (!id || isNaN(price)) {
      alterMsg.innerText = 'Selecione material e informe preço.';
      return;
    }
    const resp = await fetch(`/api/materials/${id}`, {
      method:'PUT',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ price })
    });
    const data = await resp.json();
    alterMsg.innerText = data.success ? 'Preço atualizado!' : data.error;
    if (data.success) {
      await loadMaterials();
      setTimeout(() => alterMsg.innerText = '', 1500);
    }
  });

  // --- Adicionar material ---
  btnAdd.addEventListener('click', async () => {
    const name  = newNameInput.value.trim();
    const price = parseFloat(newPriceInput.value);
    if (!name || isNaN(price)) {
      addMsg.innerText = 'Informe nome e preço.';
      return;
    }
    const resp = await fetch('/api/materials', {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ name, price })
    });
    const data = await resp.json();
    addMsg.innerText = data.success ? 'Material adicionado!' : data.error;
    if (data.success) {
      await loadMaterials();
      setTimeout(() => addMsg.innerText = '', 1500);
    }
  });

  btnRemove.addEventListener('click', async () => {
    const id = removeSelect.value;
    if (!id) {
      removeMsg.innerText = 'Selecione um material';
      return;
    }
    const resp = await fetch(`/api/materials/${id}`, {
      method: 'DELETE'
    });
    const data = await resp.json();
    if (data.success) {
      removeMsg.style.color = '#1b5e20';
      removeMsg.innerText = 'Material removido com sucesso';
      await loadMaterials();  // atualiza todos os selects
    } else {
      removeMsg.style.color = '#d32f2f';
      removeMsg.innerText = `Erro: ${data.error}`;
    }
  });

  // --- Inicialização ---
  loginModal.style.display   = 'flex';
  appContainer.style.display = 'none';
  showView('mainView');
});
