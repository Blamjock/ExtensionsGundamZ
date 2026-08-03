document.addEventListener('DOMContentLoaded', loadList);

document.getElementById('addBtn').addEventListener('click', () => {
  const token = document.getElementById('apiToken').value;
  const bId = document.getElementById('blueprintId').value;
  const price = document.getElementById('targetPrice').value;

  if (!token || !bId || !price) return alert("Compila tutto!");

  chrome.storage.local.get(['sniperList'], (data) => {
    const list = data.sniperList || [];
    list.push({ bId: parseInt(bId), target: parseFloat(price) });
    
    chrome.storage.local.set({ token: token, sniperList: list }, () => {
      loadList();
      document.getElementById('blueprintId').value = "";
      document.getElementById('targetPrice').value = "";
    });
  });
});

function loadList() {
  chrome.storage.local.get(['sniperList', 'token'], (data) => {
    if (data.token) document.getElementById('apiToken').value = data.token;
    const container = document.getElementById('list');
    container.innerHTML = "";
    (data.sniperList || []).forEach((item, index) => {
      const div = document.createElement('div');
      div.className = 'card-item';
      div.innerHTML = `ID: ${item.bId} | Target: €${item.target} <span class="remove" data-index="${index}">X</span>`;
      container.appendChild(div);
    });
  });
}

// Gestione rimozione
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('remove')) {
    const index = e.target.dataset.index;
    chrome.storage.local.get(['sniperList'], (data) => {
      const list = data.sniperList;
      list.splice(index, 1);
      chrome.storage.local.set({ sniperList: list }, loadList);
    });
  }
});
const BASE_URL = "https://api.cardtrader.com/api/v2";

// Cambiato a 5 minuti
chrome.alarms.create("sniperLoop", { periodInMinutes: 5 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "sniperLoop") {
    avviaControlloLista();
  }
});

async function avviaControlloLista() {
  const data = await chrome.storage.local.get(['token', 'sniperList']);
  if (!data.token || !data.sniperList || data.sniperList.length === 0) return;

  for (const item of data.sniperList) {
    try {
      const response = await fetch(`${BASE_URL}/marketplace/products?blueprint_id=${item.bId}`, {
        headers: { "Authorization": `Bearer ${data.token}` }
      });
      
      const products = await response.json();
      const listings = products[item.bId] || [];
      if (listings.length === 0) continue;

      const bestPrice = listings[0].price.cents / 100;
      const productId = listings[0].id;

      // Se il prezzo è minore o uguale al tuo target
      if (bestPrice <= item.target) {
        const successo = await aggiungiAlCarrello(data.token, productId);
        if (successo) {
          inviaNotifica(`Affare trovato!`, `ID ${item.bId}: Trovato a €${bestPrice}. Aggiunto al carrello.`);
          // Opzionale: rimuovi dalla lista dopo l'acquisto per non ricomprarlo ogni 5 min
          // rimuoviDallaLista(item.bId); 
        }
      }
    } catch (e) {
      console.error("Errore controllo ID " + item.bId, e);
    }
  }
}

async function aggiungiAlCarrello(token, pId) {
  const res = await fetch(`${BASE_URL}/cart_items`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ cart_item: { product_id: pId, quantity: 1 } })
  });
  return res.ok;
}

function inviaNotifica(title, msg) {
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icon.png",
    title: title,
    message: msg
  });
}

<!DOCTYPE html>
<html>
<head>
  <style>
    body { width: 320px; padding: 15px; font-family: sans-serif; }
    input { width: 90%; margin-bottom: 8px; padding: 6px; }
    button { width: 100%; cursor: pointer; padding: 8px; font-weight: bold; border: none; border-radius: 4px; }
    #addBtn { background: #28a745; color: white; margin-bottom: 15px; }
    #list { border-top: 1px solid #ddd; padding-top: 10px; max-height: 200px; overflow-y: auto; }
    .card-item { font-size: 0.85em; background: #f9f9f9; padding: 5px; margin-bottom: 5px; border-radius: 3px; display: flex; justify-content: space-between; }
    .remove { color: red; cursor: pointer; font-weight: bold; }
  </style>
</head>
<body>
  <h3>Sniper List (5 min)</h3>
  <input type="text" id="apiToken" placeholder="API Token">
  <input type="number" id="blueprintId" placeholder="Blueprint ID">
  <input type="number" id="targetPrice" placeholder="Prezzo Max (€)">
  <button id="addBtn">Aggiungi alla Lista</button>
  
  <div id="list"></div>

  <script src="popup.js"></script>
</body>
</html>