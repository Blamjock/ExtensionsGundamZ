chrome.storage.local.get('lastResults', (data) => {
  const s = data.lastResults;
  if(!s) return;
  
  // Header Totale
  document.getElementById('total-val').innerText = `Euro: ${s.totalValue.toFixed(2)} (${s.totalQty} carte)`;
  
  const formatRow = (label, data) => `
    <div class="row">
      <span><strong>${label}</strong></span>
      <span>${data.q} pz | <strong> &euro; ${data.v.toFixed(2)}</strong></span>
    </div>`;

  const rareDiv = document.getElementById('rare-list');
  rareDiv.innerHTML = ""; // Puliamo la lista delle rarità

  // Mostriamo SOLO le rarità principali che hai richiesto
  const raritiesToShow = ['LR', 'R', 'NC', 'C', 'Promo'];
  
  raritiesToShow.forEach(key => {
    if (s.byRare[key] && s.byRare[key].q > 0) {
      rareDiv.innerHTML += formatRow(key, s.byRare[key]);
    }
  });

  // Rimuoviamo o nascondiamo la sezione Categorie (Unità, Piloti...)
  const catSection = document.getElementById('cat-list');
  if (catSection) catSection.innerHTML = ""; 
});