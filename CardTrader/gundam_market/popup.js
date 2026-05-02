const TOKEN_STORAGE_KEY = 'cardtraderApiToken';
let IL_TUO_TOKEN = '';

document.addEventListener('DOMContentLoaded', () => {
    const cardInput = document.getElementById('cardName');
    const btnCerca = document.getElementById('searchBtn');
    const btnAnalizza = document.getElementById('analyzeBtn');
    const btnListSet = document.getElementById('listSetBtn');
    const btnOptions = document.getElementById('openOptionsBtn');

    if (cardInput) {
        cardInput.addEventListener('input', () => {
            cardInput.value = cardInput.value.replace(/^\s+|\s+$/g, '');
        });
    }

    loadToken();

    if (btnCerca) btnCerca.addEventListener('click', async () => await eseguiRicerca(cardInput.value, 'singolo'));
    if (btnAnalizza) btnAnalizza.addEventListener('click', async () => await eseguiRicerca(cardInput.value, 'top10'));
    if (btnListSet) btnListSet.addEventListener('click', () => listingCompletoSet("GD04"));
    if (btnOptions) btnOptions.addEventListener('click', () => chrome.runtime.openOptionsPage());

    window.addEventListener('click', (event) => {
        const modal = document.getElementById('jsonModal');
        if (event.target == modal) modal.style.display = "none";
    });
});

function loadToken() {
    return new Promise(resolve => {
        chrome.storage.local.get([TOKEN_STORAGE_KEY], result => {
            IL_TUO_TOKEN = result[TOKEN_STORAGE_KEY] || '';
            resolve(IL_TUO_TOKEN);
        });
    });
}

async function eseguiRicerca(query, modo) {
    const resultDiv = document.getElementById('result');
    query = query ? query.trim() : '';
    const cardInput = document.getElementById('cardName');
    if (cardInput) cardInput.value = query;
    if (!query) return;

    await loadToken();
    if (!IL_TUO_TOKEN) {
        resultDiv.innerHTML = "❌ Token non impostato. Apri Impostazioni Token per incollare il tuo token API.";
        return;
    }

    const headers = { 'Authorization': `Bearer ${IL_TUO_TOKEN}`, 'Content-Type': 'application/json' };
    resultDiv.innerHTML = "⌛ Connessione ai server...";

    try {
        const bpRes = await fetch(`https://api.cardtrader.com/api/v2/blueprints?name=${encodeURIComponent(query)}`, { headers });
        const blueprints = await bpRes.json();

        if (!blueprints.length) {
            resultDiv.innerHTML = "❌ Nessuna carta trovata.";
            return;
        }

        let htmlFinale = `<b>Risultati per "${query}":</b><br>`;

        for (const bp of blueprints) {
            const marketRes = await fetch(`https://api.cardtrader.com/api/v2/marketplace/products?blueprint_id=${bp.id}`, { headers });
            const marketData = await marketRes.json();
            const listings = marketData[bp.id] || [];

            if (listings.length === 0) continue;

            // 1. Ordiniamo per prezzo crescente
            listings.sort((a, b) => a.price.cents - b.price.cents);

            // --- LOGICA MODIFICATA PER GESTIRE I 10 RISULTATI ---
            let offerteDaMostrare = [];

            if (modo === 'top10') {
                // Selezioniamo le prime 10 offerte che hanno la rarità gundam
                offerteDaMostrare = listings
                    .filter(l => l.properties_hash && l.properties_hash.gundam_rarity)
                    .slice(0, 10);
            } else {
                // Logica originale per il tasto "Cerca" (Miglior Zero o più basso)
                const zeroListings = listings.filter(l => 
                    (l.user && l.user.can_sell_sealed_with_ct_zero === true) || 
                    (l.can_be_sent_with_zero === true || l.can_be_sent_with_zero === "true")
                ).sort((a, b) => a.price.cents - b.price.cents);

                const selected = zeroListings.length > 0 ? zeroListings[0] : listings[0];
                if (selected.properties_hash && selected.properties_hash.gundam_rarity) {
                    offerteDaMostrare = [selected];
                }
            }

            for (const selectedOffer of offerteDaMostrare) {
                const isZeroAvailable = (selectedOffer.user && selectedOffer.user.can_sell_sealed_with_ct_zero === true) || 
                                       (selectedOffer.can_be_sent_with_zero === true || selectedOffer.can_be_sent_with_zero === "true");
                const venditore = (selectedOffer.user && selectedOffer.user.username) ? selectedOffer.user.username : "Sconosciuto";
                const rarity = selectedOffer.properties_hash.gundam_rarity;
                const metaName = bp.meta_name || "N/A";
                const qta = selectedOffer.quantity || 0;
                const purchaseUrl = `https://www.cardtrader.com/it/cards/${bp.slug}`;

                const debugData = { blueprint: bp, selected_offer: selectedOffer };

                htmlFinale += `
                    <div style="background:#fff; border:1px solid ${isZeroAvailable ? '#c8e6c9' : '#ddd'}; padding:12px; margin-top:10px; border-radius:8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <div style="margin-bottom: 8px; display:flex; justify-content:space-between; align-items:start;">
                            <div>
                                <b style="font-size:1.1em; color:#222;">${bp.name}</b><br>
                                <span style="font-size:0.75em; color:#555;">Meta: ${metaName} | <b>Rarità: ${rarity}</b></span><br>
                                <span style="font-size:0.7em; color:#007bff; font-weight:bold;">${bp.expansion_name}</span>
                            </div>
                            <button class="inspect-btn" data-json='${JSON.stringify(debugData).replace(/'/g, "&apos;")}' style="font-size:0.6em; cursor:pointer; background:#6c757d; color:white; border:none; border-radius:3px; padding:2px 5px;">DEBUG API</button>
                        </div>
                        
                        <div style="display:flex; justify-content:space-between; border-bottom:1px solid #eee; padding-bottom:5px; margin-bottom:5px;">
                            <div style="display:flex; flex-direction:column;">
                                <span style="font-size:0.8em;">Prezzo: <b>€${(selectedOffer.price.cents/100).toFixed(2)}</b></span>
                                <span style="font-size:0.75em; color:#666;">Venditore: <b>${venditore}</b></span>
                                <span style="font-size:0.75em; color:#666;">Quantità: <b>${qta}</b></span>
                            </div>
                            <span style="font-size:0.8em; color:${isZeroAvailable ? '#2e7d32' : '#d32f2f'}; text-align:right;">
                                ${isZeroAvailable ? '⚡ CardTrader Zero' : '📦 Spedizione Diretta'}
                            </span>
                        </div>
                        <a href="${purchaseUrl}" target="_blank" style="display:block; text-align:center; background:#007bff; color:white; padding:5px; border-radius:5px; text-decoration:none; font-size:0.8em; font-weight:bold;">🛒 ACQUISTA</a>
                    </div>`;
            }
            
            resultDiv.innerHTML = htmlFinale;

            document.querySelectorAll('.inspect-btn').forEach(btn => {
                btn.onclick = function() {
                    mostraModal(this.getAttribute('data-json'));
                };
            });
        }
    } catch (err) {
        resultDiv.innerHTML = "Errore API.";
        console.error(err);
    }
}

function mostraModal(jsonStr) {
    let modal = document.getElementById('jsonModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'jsonModal';
        modal.style = "display:none; position:fixed; z-index:9999; left:0; top:0; width:100%; height:100%; background-color:rgba(0,0,0,0.7); overflow:auto;";
        modal.innerHTML = `
            <div style="background-color:#fefefe; margin:10% auto; padding:20px; border:1px solid #888; width:90%; border-radius:10px; font-family:monospace; font-size:0.75em; position:relative;">
                <span id="closeModal" style="position:absolute; right:15px; top:10px; font-size:24px; font-weight:bold; cursor:pointer;">&times;</span>
                <h3 style="margin-top:0;">Struttura Oggetto API</h3>
                <pre id="jsonContent" style="background:#272822; color:#f8f8f2; padding:15px; border-radius:5px; overflow-x:auto; max-height:400px; white-space: pre-wrap; word-wrap: break-word;"></pre>
            </div>`;
        document.body.appendChild(modal);
        document.getElementById('closeModal').onclick = () => modal.style.display = "none";
    }
    const obj = JSON.parse(jsonStr);
    document.getElementById('jsonContent').textContent = JSON.stringify(obj, null, 2);
    modal.style.display = "block";
}