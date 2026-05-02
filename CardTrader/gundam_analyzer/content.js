function getRarity(row) {
    const icon = row.querySelector('i[class*="ss-"]');
    if (!icon) return "Altro";
    const cls = icon.className;
    
    if (cls.includes('ss-lr')) return 'LR';
    if (cls.includes('ss-r'))  return 'R';
    if (cls.includes('ss-u') || cls.includes('ss-uc') || cls.includes('ss-nc')) return 'NC'; // Aggiunto ss-u
    if (cls.includes('ss-c'))  return 'C';
    if (cls.includes('ss-p'))  return 'Promo'; // Per le carte torneo/promo
    return "Altro";
}

async function runAnalysis() {
    const data = await chrome.storage.local.get('gundamMapping');
    const mapping = data.gundamMapping || {};
    const rows = document.querySelectorAll('tr[data-test-id]');
    
    // Inizializziamo i contatori per Valore (€) e Quantità (Q.tà)
    let stats = { 
        totalValue: 0, 
        totalQty: 0,
        byCat: {
            unità: { v: 0, q: 0 },
            piloti: { v: 0, q: 0 },
            commandi: { v: 0, q: 0 },
            base: { v: 0, q: 0 }
        }, 
        byRare: {
            LR: { v: 0, q: 0 }, R: { v: 0, q: 0 }, NC: { v: 0, q: 0 }, 
            C: { v: 0, q: 0 }, Promo: { v: 0, q: 0 }, Altro: { v: 0, q: 0 }
        } 
    };

    rows.forEach(row => {
        try {
            const codeElement = Array.from(row.querySelectorAll('td')).find(td => td.innerText.includes('#'));
            if (!codeElement) return;
            
            const codeTxt = codeElement.innerText.replace('#', '').trim();
            const [setID, numStr] = codeTxt.split('-');
            const num = parseInt(numStr);

            const priceCell = row.querySelector('td.text-right.nowrap');
            if (!priceCell) return;
            
            const rawText = priceCell.innerText; 
            const qty = parseInt(rawText.split('x')[0]);
            // Pulizia del prezzo dal simbolo â‚¬ o €
            const cleanPrice = rawText.split('x')[1].replace(/[^\d.,]/g, '').replace(',', '.');
            const unitPrice = parseFloat(cleanPrice);
            
            const rowValue = qty * unitPrice;

            // Aggiorna Rarità (Valore + Quantità)
            const rarity = getRarity(row);
            if (!stats.byRare[rarity]) stats.byRare[rarity] = { v: 0, q: 0 };
            stats.byRare[rarity].v += rowValue;
            stats.byRare[rarity].q += qty;

            // Aggiorna Categoria (Valore + Quantità)
            const m = mapping[setID];
            let cat = "unità";
            if(m) {
                if(num >= m.units[0] && num <= m.units[1]) cat = "unità";
                else if(num >= m.pilots[0] && num <= m.pilots[1]) cat = "piloti";
                else if(num >= m.commands[0] && num <= m.commands[1]) cat = "commandi";
                else if(num >= m.bases[0] && num <= m.bases[1]) cat = "base";
            }
            stats.byCat[cat].v += rowValue;
            stats.byCat[cat].q += qty;

            stats.totalValue += rowValue;
            stats.totalQty += qty;
        } catch(e) { console.error("Errore riga:", e); }
    });

    chrome.storage.local.set({ lastResults: stats });
}

// Iniezione pulsante (come prima)
function injectAnalysisButton() {
    if (document.getElementById('gundam-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'gundam-btn';
    btn.innerText = "📊 Analizza Spese";
    btn.style.cssText = "position:fixed; top:120px; right:20px; z-index:9999; padding:12px; background:#e67e22; color:white; border:none; border-radius:5px; cursor:pointer; font-weight:bold; box-shadow: 0 4px 6px rgba(0,0,0,0.2);";
    
    btn.onclick = () => {
        btn.innerText = "⌛ Calcolo...";
        runAnalysis();
        setTimeout(() => { btn.innerText = "✅ Fatto! Apri Popup"; }, 800);
    };
    document.body.appendChild(btn);
}

// CardTrader carica le tabelle dopo un po', quindi riproviamo l'iniezione
setInterval(injectAnalysisButton, 2000);