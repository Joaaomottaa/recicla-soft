// public/script.js
document.addEventListener('DOMContentLoaded', () => {
  console.log('🔧 script.js carregado');

  // === Mobile menu toggle ===
  const sidebar      = document.querySelector('.sidebar');
  const mobileToggle = document.getElementById('mobileMenuToggle');
  if (mobileToggle) {
    mobileToggle.addEventListener('click', () => {
      console.log('🔀 mobile menu toggle');
      sidebar.classList.toggle('open');
    });
  }

  // === Application state ===
  let currentUserId   = null;
  let currentUserName = null;
  let lastCalc        = {};

  let materialPricesByName = {};
  let materialPricesById   = {};

  // === DOM references ===
  const loginModal   = document.getElementById('loginModal');
  const appContainer = document.getElementById('appContainer');
  const greetingEl   = document.getElementById('greeting');
  const toggleBtn = document.getElementById('chat-toggle');
  const widget   = document.getElementById('chat-widget');
  const closeBtn = document.getElementById('chat-close');
  const sendBtn  = document.getElementById('chat-send');
  const inputEl  = document.getElementById('chat-input');
  const bodyEl   = document.getElementById('chat-body');

toggleBtn.onclick = () => widget.style.display = 'flex';
closeBtn.onclick  = () => widget.style.display = 'none';

  // add summaryView reference
  const views = {
    mainView:    document.getElementById('mainView'),
    sellView:    document.getElementById('sellView'),
    salesView:   document.getElementById('salesView'),
    alterView:   document.getElementById('alterView'),
    addView:     document.getElementById('addView'),
    removeView:  document.getElementById('removeView'),
    stockView:   document.getElementById('stockView'),
    summaryView: document.getElementById('summaryView')
  };

  const menuItems = document.querySelectorAll('.menu-item[data-view]');
  const btnLogout = document.getElementById('btnLogout');
  const salesBody = document.getElementById('salesBody');
  const stockBody = document.getElementById('stockBody');

  // summary DOM refs
  const buyPriceInfo  = document.getElementById('buyPriceInfo');
  const summaryMonth   = document.getElementById('summaryMonth');
  const btnLoadSummary = document.getElementById('btnLoadSummary');
  const summaryCards   = document.getElementById('summaryCards');

  // ensure date-picker opens on focus or click
  if (summaryMonth && summaryMonth.showPicker) {
    summaryMonth.addEventListener('focus', () => summaryMonth.showPicker());
    summaryMonth.addEventListener('click', () => summaryMonth.showPicker());
  }

  // Login/Register
  const loginView       = document.getElementById('loginView');
  const registerView    = document.getElementById('registerView');
  const btnLogin        = document.getElementById('btnLogin');
  const btnShowRegister = document.getElementById('btnShowRegister');
  const btnBackToLogin  = document.getElementById('btnBackToLogin');
  const btnRegister     = document.getElementById('btnRegister');
  const loginEmail      = document.getElementById('loginEmail');
  const loginPass       = document.getElementById('loginPass');
  const regName         = document.getElementById('regName');
  const regEmail        = document.getElementById('regEmail');
  const regPass         = document.getElementById('regPass');
  const loginMsg        = document.getElementById('loginMsg');
  const regMsg          = document.getElementById('regMsg');

  // Calculator
  const materialSelect = document.getElementById('materialSelect');
  const quantityInput  = document.getElementById('quantityInput');
  const btnCalc        = document.getElementById('btnCalc');
  const btnRegSale     = document.getElementById('btnRegSale');
  const calcResult     = document.getElementById('calcResult');

  // Sell-from-stock view refs
  const sellMaterialSelect = document.getElementById('sellMaterialSelect');
  const sellAvailable      = document.getElementById('sellAvailable');
  const sellQuantity       = document.getElementById('sellQuantity');
  const sellPricePerKg =    document.getElementById('sellPricePerKg');
  const btnSellCalc        = document.getElementById('btnSellCalc');
  const btnConfirmSell     = document.getElementById('btnConfirmSell');
  const sellCalcResult     = document.getElementById('sellCalcResult');

  // Modify/Add/Remove
  const alterSelect    = document.getElementById('alterMaterial');
  const currentPriceEl = document.getElementById('currentPrice');
  const alterPrice     = document.getElementById('alterPrice');
  const btnAlter       = document.getElementById('btnAlter');
  const alterMsg       = document.getElementById('alterMsg');

  const newNameInput  = document.getElementById('newName');
  const newPriceInput = document.getElementById('newPrice');
  const btnAdd        = document.getElementById('btnAdd');
  const addMsg        = document.getElementById('addMsg');

  const removeSelect = document.getElementById('removeSelect');
  const btnRemove    = document.getElementById('btnRemove');
  const removeMsg    = document.getElementById('removeMsg');
  
  function appendMessage(text, fromUser = false) {
    const msg = document.createElement('div');
    msg.classList.add('message', fromUser ? 'user' : 'bot');
    if (fromUser) {
      msg.innerText = text;
    } else {
      msg.innerHTML = text;        // usa innerHTML para permitir <a> clicável
    }
    bodyEl.appendChild(msg);
    bodyEl.scrollTop = bodyEl.scrollHeight;
  }

  function getBotReply(txt) {
    txt = txt.toLowerCase();
  
    // Preço
    if (txt.includes('preço')) {
      return 'O preço atual de qualquer material é R$ 2,50 por kg.';
    }
  
    // Compras
    if (txt.includes('comprar') || txt.includes('compra')) {
      return 'Para registrar uma compra, acesse "Compra de Material", escolha o item, informe quantidade e clique em "Registrar compra".';
    }
  
    // Vendas
    if (txt.includes('vender') || txt.includes('venda')) {
      return 'Para vender, vá em "Venda de Estoque", selecione o material, informe quantidade e clique em "Registrar venda".';
    }
  
    // Estoque
    if (txt.includes('estoque')) {
      return 'Atualmente você tem 120 kg disponíveis no estoque.';
    }
  
    // Adicionar material
    if (txt.includes('adicionar') || txt.includes('adiciona')) {
      return 'Em "Adicionar material", preencha nome e preço e clique em "Salvar".';
    }
  
    // Alterar valor
    if (txt.includes('alterar') || txt.includes('atualizar')) {
      return 'Em "Alterar valor do material", escolha o item, insira o novo preço e confirme.';
    }
  
    // Remover material
    if (txt.includes('remover') || txt.includes('apagar') || txt.includes('deletar')) {
      return 'Em "Remover material", selecione o item e clique em "Remover". Atenção: ação irreversível.';
    }
  
    // Relatórios
    if (txt.includes('relatório') || txt.includes('relatorio') ) {
      return 'Você encontra os relatórios em "Relatório de materiais" → clique em "Gerar relatório".';
    }
  
    // Resumo mensal
    if (txt.includes('resumo')) {
      return 'O resumo mensal está em "Resumo Mensal": lá aparecem totais de compras e vendas.';
    }
  
    // Material mais reciclado
    if (txt.includes('mais reciclado')) {
      return 'No último mês o material mais reciclado foi o PET, com 45 kg.';
    }
  
    // Ajuda / Suporte
    if (txt.includes('ajuda')) {
      return 'Claro! Pergunte sobre compras, vendas, estoque, relatórios ou adição/removal de materiais.';
    }
    if (txt.includes('suporte')) {
      return 'Para falar com nosso suporte humano, envie e‑mail para suporte@recicla‑soft.com.br.';
    }

    if (txt.includes('contratar') || txt.includes('informacao')) {
  return `
    Para contratar nossos serviços ou saber mais informações, 
    <a href="https://api.whatsapp.com/send?phone=5575998920162&text=Ol%C3%A1!%20Gostaria%20de%20maiores%20informa%C3%A7%C3%B5es." 
       target="_blank" 
       rel="noopener"
       style="color: #066; text-decoration: underline;">
      clique aqui para falar no WhatsApp
    </a>.
  `;
}
  
    // Saudações
    if (/^(oi|olá|bom dia|boa tarde|boa noite)/.test(txt)) {
      return 'Olá! Eu sou o Bot Recicla‑Soft. Em que posso ajudar hoje?';
    }
  
    // Se nada bater
    return 'Desculpe, não entendi. Tente palavras como "preço", "adicionar", "vender" ou "estoque".';
  }
  

  
  
  sendBtn.onclick = () => {
    const txt = inputEl.value.trim();
    if (!txt) return;
    appendMessage(txt, true);
    inputEl.value = '';
    setTimeout(() => appendMessage(getBotReply(txt)), 300);
  }

    inputEl.addEventListener('keypress', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        sendBtn.click();
      }
    });

  // === View switcher ===
  function showView(viewId) {
    console.log('🔀 showView:', viewId);
    if (!views[viewId]) {
      console.warn(`❌ View "${viewId}" não encontrada.`);
      return;
    }
    Object.values(views).forEach(v => v.style.display = 'none');
    views[viewId].style.display = 'block';
    menuItems.forEach(mi => {
      mi.classList.toggle('active', mi.dataset.view === viewId);
    });
  }

  // === Data loaders ===
async function loadMaterials() {
  console.log('⏳ loadMaterials()');

  // Feedback visual enquanto carrega
  materialSelect.innerHTML      = '<option disabled>Carregando...</option>';
  sellMaterialSelect.innerHTML  = '<option disabled>Carregando...</option>';
  alterSelect.innerHTML         = '<option disabled>Carregando...</option>';
  removeSelect.innerHTML        = '<option disabled>Carregando...</option>';
  currentPriceEl.innerText      = 'Preço atual: R$ 0,00';

  // Passa o userId na query para o servidor trazer só
  // os materiais globais (user_id IS NULL) + os seus (user_id = currentUserId)
  const resp = await fetch(`/api/materials?userId=${currentUserId}`);
  if (!resp.ok) {
    console.error('Falha ao buscar materiais:', resp.status, resp.statusText);
    materialSelect.innerHTML = '<option disabled>Erro ao carregar materiais</option>';
    return;
  }

  const list = await resp.json();

  // Resetar dicionários
  materialPricesByName = {};
  materialPricesById   = {};

  // Limpar selects e setar placeholder
  materialSelect.innerHTML      = '<option value="" disabled selected>-- Escolha um material --</option>';
  sellMaterialSelect.innerHTML  = '<option value="" disabled selected>-- Escolha um material --</option>';
  alterSelect.innerHTML         = '<option value="" disabled selected>-- Escolha um material --</option>';
  removeSelect.innerHTML        = '<option value="" disabled selected>-- Escolha um material --</option>';

  // Preencher opções
  list.forEach(m => {
    const price = parseFloat(m.price_per_kg);
    materialPricesByName[m.name]      = price;
    materialPricesById[m.material_id] = price;

    materialSelect.innerHTML      += `<option value="${m.name}">${m.name} (R$ ${price.toFixed(2)}/kg)</option>`;
    sellMaterialSelect.innerHTML  += `<option value="${m.name}">${m.name}</option>`;
    alterSelect.innerHTML         += `<option value="${m.material_id}">${m.name}</option>`;
    removeSelect.innerHTML        += `<option value="${m.material_id}">${m.name}</option>`;
  });

  console.log('✅ loadMaterials concluído');
}

  


  

  alterSelect.addEventListener('change', () => {
    const id    = alterSelect.value;
    const price = materialPricesById[id] || 0;
    currentPriceEl.innerText = `Preço atual: R$ ${price.toFixed(2)}`;
  });

  async function loadSales() {
    console.log('⏳ loadSales() para user', currentUserId);
    salesBody.innerHTML = '<tr><td colspan="5">Carregando...</td></tr>';
    const resp  = await fetch(`/api/sales?userId=${currentUserId}`);
    const sales = await resp.json();
  
    if (!sales.length) {
      salesBody.innerHTML = '<tr><td colspan="5">Nenhuma movimentação</td></tr>';
    } else {
      salesBody.innerHTML = sales.map(s => {
        const q      = parseFloat(s.quantity_kg)
                         .toLocaleString('pt-BR',{ minimumFractionDigits:2 });
        const t      = parseFloat(s.total_price).toFixed(2);
        const dt     = new Date(s.sale_datetime).toLocaleString('pt-BR');
        const tipo   = parseFloat(s.quantity_kg) >= 0 ? 'Entrada' : 'Saída';
        return `<tr>
          <td>${s.material}</td>
          <td>${q}</td>
          <td>R$ ${t}</td>
          <td>${tipo}</td>         <!-- coluna Tipo -->
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

    if (!data.length) {
      stockBody.innerHTML = '<tr><td colspan="3">Nenhum estoque registrado</td></tr>';
      return;
    }

    // monta linhas e acumula valor total
    let totalAcumulado = 0;
    const linhas = data.map(item => {
      const q    = parseFloat(item.total_qty).toLocaleString('pt-BR',{ minimumFractionDigits:2 });
      const vRaw = parseFloat(item.total_value);
      totalAcumulado += vRaw;
      const v = vRaw.toLocaleString('pt-BR',{ minimumFractionDigits:2 });
      return `<tr>
        <td>${item.material}</td>
        <td>${q}</td>
        <td>R$ ${v}</td>
      </tr>`;
    }).join('');

    // linha de total geral
    const totalFmt = totalAcumulado.toLocaleString('pt-BR',{ minimumFractionDigits:2 });
    const linhaTotal = `
      <tr class="total-row">
        <td><strong>Total Acumulado</strong></td>
        <td></td>
        <td><strong>R$ ${totalFmt}</strong></td>
      </tr>
    `;

    stockBody.innerHTML = linhas + linhaTotal;
    console.log('✅ loadStock concluído com total:', totalFmt);
  }

  // === Sell-from-stock loader ===
  async function loadSellOptions() {
    sellMaterialSelect.innerHTML = '<option value="" disabled selected>-- Escolha um material --</option>';
    sellAvailable.textContent    = 'Total disponível: 0,00 kg';
    sellQuantity.value           = '';
    sellPricePerKg.value         = '';
    btnConfirmSell.disabled      = true;
    sellCalcResult.textContent   = '';
    buyPriceInfo.textContent     = '';
  
    const resp = await fetch(`/api/stock?userId=${currentUserId}`);
    const data = await resp.json();
  
    if (!data.length) {
      sellMaterialSelect.innerHTML = '<option disabled>Nenhum material em estoque</option>';
      return;
    }
  
    data.forEach(item => {
      // só o nome no option, guardamos o total em data-qty
      sellMaterialSelect.innerHTML +=
        `<option value="${item.material}" data-qty="${item.total_qty}">
           ${item.material}
         </option>`;
    });
  }
  
  sellMaterialSelect.addEventListener('change', () => {
    const opt          = sellMaterialSelect.selectedOptions[0];
    const materialName = opt.value;
    const avail        = parseFloat(opt.dataset.qty) || 0;
  
    // atualiza disponibilidade
    sellAvailable.textContent = `Total disponível: ${avail.toLocaleString('pt-BR',{minimumFractionDigits:2})} kg`;
    sellQuantity.max          = avail;
  
    // exibe também o preço de compra daquele KG
    const buyPrice = materialPricesByName[materialName] || 0;
    buyPriceInfo.textContent = `Você comprou o KG por R$ ${buyPrice.toLocaleString('pt-BR',{minimumFractionDigits:2})}`;
  
    // resto do seu handler…
    sellCalcResult.textContent = '';
    btnConfirmSell.disabled    = true;
  });
  
  btnSellCalc.addEventListener('click', () => {
    const mat = sellMaterialSelect.value;
    const qty = parseFloat(sellQuantity.value);
    const pr  = parseFloat(sellPricePerKg.value);
    if (!mat || isNaN(qty) || isNaN(pr) || qty <= 0) {
      sellCalcResult.textContent = 'Selecione material e informe quantidade e preço.';
      sellCalcResult.classList.add('error');
      btnConfirmSell.disabled = true;
      // **EXIBA** a mensagem de erro:
      sellCalcResult.style.display = 'block';
      return;
    }
    const total = (qty * pr).toFixed(2);
    sellCalcResult.textContent = `Total a receber: R$ ${Number(total).toLocaleString('pt-BR',{ minimumFractionDigits:2 })}`;
    sellCalcResult.classList.remove('error');
    // **EXIBA** o resultado:
    sellCalcResult.style.display = 'block';
    btnConfirmSell.disabled = false;
  });
  
  btnConfirmSell.addEventListener('click', async () => {
    const material   = sellMaterialSelect.value;
    const rawQty     = parseFloat(sellQuantity.value);
    const quantity   = -Math.abs(rawQty);                    // quantidade negativa
    const pricePerKg = parseFloat(sellPricePerKg.value);
    const total      = parseFloat((rawQty * pricePerKg).toFixed(2));  // total positivo
  
    const resp = await fetch('/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        material,
        quantity,   // negativo = saída
        total,      // positivo = receita
        userId: currentUserId
      })
    });
    const data = await resp.json();
  
    if (data.success) {
      sellCalcResult.textContent = 'Venda confirmada e estoque atualizado!';
      sellCalcResult.classList.remove('error');
      sellCalcResult.innerHTML = `
      Venda confirmada com sucesso
      <img src="https://cdn-icons-png.flaticon.com/512/1370/1370674.png"
           alt="✓"
           class="success-icon" />`;
    sellCalcResult.style.display = 'inline-block';
    } else {
      sellCalcResult.textContent = `Erro: ${data.error || 'falha ao registrar'}`;
      sellCalcResult.style.display = 'inline-block';
    }
    btnConfirmSell.disabled = true;
  });
  

  // === Menu item handlers ===
  menuItems.forEach(item => {
    item.addEventListener('click', async () => {
      const viewId = item.dataset.view;
      console.log('🔘 menu click:', viewId);

      if (viewId === 'mainView')    await loadMaterials();
      if (viewId === 'sellView')    await loadSellOptions();
      if (viewId === 'salesView')   await loadSales();
      if (viewId === 'alterView')   await loadMaterials();
      if (viewId === 'addView')     { addMsg.innerText=''; newNameInput.value=''; newPriceInput.value=''; }
      if (viewId === 'removeView')  { await loadMaterials(); removeMsg.innerText=''; }
      if (viewId === 'stockView')   await loadStock();
      if (viewId === 'summaryView') {
        summaryCards.innerHTML = '';
        summaryMonth.value     = new Date().toISOString().slice(0,7);
      }

      showView(viewId);
    });
  });

  // === Logout ===
  btnLogout.addEventListener('click', () => {
    console.log('👋 Logout');
    currentUserId = null;
    loginModal.style.display   = 'flex';
    appContainer.style.display = 'none';
    showView('mainView');
  });

  // === Summary loader ===
  btnLoadSummary.addEventListener('click', async () => {
    const month = summaryMonth.value;  // “YYYY‑MM”
    const resp  = await fetch(`/api/summary?userId=${currentUserId}&month=${month}`);
    const data  = await resp.json();
  
    // calcula lucro
    const profit = data.revenue - data.totalExpenses;
    summaryCards.innerHTML = `
      <div class="card">
        <h2>Mais Vendido</h2>
        <p>${data.mostSold.material || '-'}</p>
        <small>${(data.mostSold.quantity||0).toLocaleString('pt-BR',{minimumFractionDigits:2})} kg</small>
      </div>
      <div class="card">
        <h2>Total Gastos</h2>
        <p>R$ ${(data.totalExpenses||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</p>
      </div>
      <div class="card">
        <h2>Faturamento</h2>
        <p>R$ ${(data.revenue||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</p>
      </div>
      <div class="card">
        <h2>Lucro</h2>
        <p>R$ ${(profit||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</p>
      </div>
      <div class="card">
        <h2>Maior Venda</h2>
        <p>R$ ${((data.highestSale||{}).total||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</p>
        <small>${data.highestSale && data.highestSale.date
           ? new Date(data.highestSale.date).toLocaleDateString('pt-BR')
           : '-'}</small>
        <small>${(data.highestSale||{}).material||'-'}</small>
      </div>
      <div class="card">
        <h2>Total de Vendas</h2>
        <p>${data.salesCount||0}</p>
      </div>
    `;
  });
  

  // === Register / Login toggles ===
  btnShowRegister.addEventListener('click', () => {
    loginView.style.display    = 'none';
    registerView.style.display = 'block';
  });
  btnBackToLogin.addEventListener('click', () => {
    registerView.style.display = 'none';
    loginView.style.display    = 'block';
  });

  // === Register ===
  btnRegister.addEventListener('click', async () => {
    const name  = regName.value.trim(),
          email = regEmail.value.trim(),
          pass  = regPass.value;
    if (!name || !email || !pass) {
      regMsg.innerText = 'Preencha todos os campos';
      return;
    }
    const resp = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ name, email, password: pass })
    });
    const data = await resp.json();
    regMsg.innerText = data.success ? 'Cadastrado com sucesso!' : data.error;
    if (data.success) setTimeout(() => btnBackToLogin.click(), 1500);
  });

  // === Login ===
  btnLogin.addEventListener('click', async () => {
    const email = loginEmail.value.trim(),
          pass  = loginPass.value;
    if (!email || !pass) {
      loginMsg.innerText = 'Email e senha são obrigatórios';
      return;
    }
    const resp = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
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

  // === Calculator ===
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
    calcResult.innerText = `Total: R$ ${tot.toLocaleString('pt-BR', {
      minimumFractionDigits:2, maximumFractionDigits:2
    })}`;
    calcResult.style.display = 'inline-block';
    btnRegSale.disabled = false;
  });

  // === Register sale ===
  // === Register sale ===
btnRegSale.addEventListener('click', async () => {
  // pega os dados que você já calculou antes
  const { material, quantity, total } = lastCalc;

  // envia para o back com quantidade e total negativos (saída)
  const resp = await fetch('/api/sales', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      material,
      quantity:  quantity,   // ENTRADA: +qtd no estoque
      total:     -total,     // CUSTO: -dinheiro
      userId:    currentUserId
    })
  });
  const data = await resp.json();

  if (data.success) {
    // atualiza a UI
    calcResult.classList.remove('error');
    const totalStr = total.toLocaleString('pt-BR', {
      minimumFractionDigits:2, maximumFractionDigits:2
    });
    calcResult.innerHTML =
      `Total: R$ ${totalStr} | Venda registrada com sucesso
       <img src="https://cdn-icons-png.flaticon.com/512/1370/1370674.png"
            alt="✓"
            class="success-icon" />`;
  } else {
    calcResult.classList.add('error');
    calcResult.innerText = `Erro: ${data.error}`;
  }

  calcResult.style.display = 'inline-block';
  btnRegSale.disabled      = false;
});


 // === Alterar valor do material ===
btnAlter.addEventListener('click', async () => {
  const id    = alterSelect.value;
  const price = parseFloat(alterPrice.value);

  // Validação básica
  if (!id || isNaN(price)) {
    alterMsg.style.color = '#d32f2f';
    alterMsg.innerText   = 'Selecione material e informe preço.';
    return;
  }

  try {
    // Envia price + userId no JSON
    const resp = await fetch(`/api/materials/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        price,
        userId: currentUserId
      })
    });
    const data = await resp.json();

    if (resp.ok && data.success) {
      // Sucesso
      alterMsg.style.color = '#1b5e20';
      alterMsg.innerText   = 'Preço atualizado!';
      await loadMaterials();                  // recarrega a lista
      setTimeout(() => { alterMsg.innerText = ''; }, 1500);
    } else {
      // Erro retornado pela API
      alterMsg.style.color = '#d32f2f';
      alterMsg.innerText   = `Erro: ${data.error || resp.statusText}`;
    }
  } catch (err) {
    // Erro de rede / fetch
    console.error('Erro ao atualizar material:', err);
    alterMsg.style.color = '#d32f2f';
    alterMsg.innerText   = 'Erro inesperado ao atualizar';
  }
});

  // === Add material ===
  btnAdd.addEventListener('click', async () => {
    const name  = newNameInput.value.trim();
    const price = parseFloat(newPriceInput.value);
    if (!name || isNaN(price)) {
      addMsg.innerText = 'Informe nome e preço.';
      return;
    }
    const resp = await fetch('/api/materials', {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ name, price, userId: currentUserId })
    });
  
    if (!resp.ok) {
      // exibe a mensagem de erro vinda do servidor
      const err = await resp.json().catch(() => ({}));
      addMsg.style.color = '#d32f2f';
      addMsg.innerText = err.error || 'Falha ao adicionar';
      return;
    }
  
    addMsg.style.color = '#1b5e20';
    addMsg.innerText = 'Material adicionado!';
    await loadMaterials();
    setTimeout(() => addMsg.innerText = '', 1500);
  });

// === Remove material ===
btnRemove.addEventListener('click', async () => {
  const id = removeSelect.value;
  if (!id) {
    removeMsg.style.color = '#d32f2f';
    removeMsg.innerText = 'Selecione um material';
    return;
  }

  try {
    const resp = await fetch(`/api/materials/${id}?userId=${currentUserId}`, {
      method: 'DELETE'
    });
    const data = await resp.json();

    if (resp.ok && data.success) {
      removeMsg.style.color = '#1b5e20';
      removeMsg.innerText   = 'Material removido com sucesso';
      await loadMaterials();
    } else {
      // se o servidor devolveu 400 ou outro erro de aplicação
      removeMsg.style.color = '#d32f2f';
      removeMsg.innerText   = `Erro: ${data.error || resp.statusText}`;
    }
  } catch (err) {
    console.error('Erro ao chamar DELETE /api/materials/:id', err);
    removeMsg.style.color = '#d32f2f';
    removeMsg.innerText   = 'Erro inesperado ao remover material';
  }
});

  // === Initialize ===
  loginModal.style.display   = 'flex';
  appContainer.style.display = 'none';
  showView('mainView');
});
