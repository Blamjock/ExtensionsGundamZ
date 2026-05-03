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

    chrome.storage.local.get(['contextSearchQuery'], ({ contextSearchQuery }) => {
        if (contextSearchQuery) {
            const query = contextSearchQuery.trim();
            if (query) {
                cardInput.value = query;
                eseguiRicerca(query, 'singolo');
            }
            chrome.storage.local.remove('contextSearchQuery');
        }
    });

    if (btnCerca) btnCerca.addEventListener('click', async () => await eseguiRicerca(cardInput.value, 'singolo'));
    if (btnAnalizza) btnAnalizza.addEventListener('click', async () => await eseguiRicerca(cardInput.value, 'top10'));
    if (btnListSet) btnListSet.addEventListener('click', () => listingCompletoSet("GD04"));
    if (btnOptions) btnOptions.addEventListener('click', () => chrome.runtime.openOptionsPage());

    window.addEventListener('click', (event) => {
        const modal = document.getElementById('jsonModal');
        if (event.target === modal) modal.classList.remove('show');
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

function loadLowestPrice(bpId) {
    return new Promise(resolve => {
        const key = `lowestPrice_${bpId}`;
        chrome.storage.local.get([key], result => {
            resolve(result[key] || null);
        });
    });
}

function saveLowestPrice(bpId, priceCents) {
    const key = `lowestPrice_${bpId}`;
    chrome.storage.local.set({ [key]: priceCents });
}

function rarityRank(rarity) {
    const key = (rarity || '').toString().trim().toLowerCase();
    const ranks = {
        lr: 0,
        r: 1,
        nc: 2,
        c: 3,
        promo: 4,
        legendary: 0,
        'super rare': 1,
        rare: 1,
        uncommon: 2,
        common: 3,
        other: 5,
        altro: 5
    };
    return ranks[key] !== undefined ? ranks[key] : 5;
}

function compareByRarityAndPrice(a, b) {
    const rankA = rarityRank(a.properties_hash?.gundam_rarity);
    const rankB = rarityRank(b.properties_hash?.gundam_rarity);
    if (rankA !== rankB) return rankA - rankB;
    return (a.price?.cents || 0) - (b.price?.cents || 0);
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
        let allOffers = [];

        for (const bp of blueprints) {
            const marketRes = await fetch(`https://api.cardtrader.com/api/v2/marketplace/products?blueprint_id=${bp.id}`, { headers });
            const marketData = await marketRes.json();
            const listings = marketData[bp.id] || [];

            if (listings.length === 0) continue;

            // 1. Ordiniamo per rarità e prezzo
            listings.sort(compareByRarityAndPrice);

            if (modo === 'top10') {
                // Prendiamo tutte le offerte con rarità gundam e le aggiungiamo al pool globale
                const matchingOffers = listings.filter(l => l.properties_hash && l.properties_hash.gundam_rarity);
                matchingOffers.forEach(offer => allOffers.push({ bp, offer }));
            } else {
                // Logica migliorata per il tasto "Cerca" (Miglior Zero o offerta con rarità più alta e prezzo più basso)
                const zeroListings = listings.filter(l => 
                    (l.user && l.user.can_sell_sealed_with_ct_zero === true) || 
                    (l.can_be_sent_with_zero === true || l.can_be_sent_with_zero === "true")
                ).sort(compareByRarityAndPrice);

                const selected = zeroListings.length > 0 ? zeroListings[0] : listings[0];
                if (selected.properties_hash && selected.properties_hash.gundam_rarity) {
                    allOffers.push({ bp, offer: selected });
                }
            }
        }

        if (allOffers.length === 0) {
            resultDiv.innerHTML = "❌ Nessuna offerta valida trovata.";
            return;
        }

        allOffers.sort((a, b) => compareByRarityAndPrice(a.offer, b.offer));
        if (modo === 'top10') allOffers = allOffers.slice(0, 10);

        for (const { bp, offer: selectedOffer } of allOffers) {
            // Carica il prezzo più basso attuale
            const currentLowest = await loadLowestPrice(bp.id);
            const currentPrice = selectedOffer.price.cents;
            let lowestPriceDisplay;
            if (currentLowest === null || currentPrice < currentLowest) {
                saveLowestPrice(bp.id, currentPrice);
                lowestPriceDisplay = `€${(currentPrice / 100).toFixed(2)}`;
            } else {
                lowestPriceDisplay = `€${(currentLowest / 100).toFixed(2)}`;
            }

            const isZeroAvailable = (selectedOffer.user && selectedOffer.user.can_sell_sealed_with_ct_zero === true) || 
                                   (selectedOffer.can_be_sent_with_zero === true || selectedOffer.can_be_sent_with_zero === "true");
            const venditore = (selectedOffer.user && selectedOffer.user.username) ? selectedOffer.user.username : "Sconosciuto";
            const rarity = selectedOffer.properties_hash.gundam_rarity;
            const metaName = bp.meta_name ? bp.meta_name.replace(/-/g, ' ').toUpperCase() : "N/A";
            const qta = selectedOffer.quantity || 0;
            const purchaseUrl = `https://www.cardtrader.com/it/cards/${bp.slug}`;

            const debugData = { blueprint: bp, selected_offer: selectedOffer };
            const borderClass = isZeroAvailable ? 'available-zero' : 'not-available';
            const shippingClass = isZeroAvailable ? 'result-zero' : 'result-standard';
            const shippingText = isZeroAvailable ? '⚡ CardTrader Zero' : '📦 Spedizione Diretta';

            htmlFinale += `
                <div class="result-item ${borderClass}">
                    <div class="result-header">
                        <div>
                            <div class="result-title">${bp.name}</div>
                            <div class="result-meta">Meta: ${metaName} | <b>Rarità: ${rarity}</b></div>
                            <div class="result-expansion">${bp.expansion_name}</div>
                        </div>
                        <button class="inspect-btn" data-json='${JSON.stringify(debugData).replace(/'/g, "&apos;")}'>DEBUG API</button>
                    </div>
                    
                    <div class="result-details">
                        <div class="result-prices">
                            <span>Prezzo: <span class="result-price-value">€${(selectedOffer.price.cents/100).toFixed(2)}</span></span>
                            <span>Prezzo più basso storico: <span class="result-price-value">${lowestPriceDisplay}</span></span>
                            <span class="result-seller">Venditore: <b>${venditore}</b></span>
                            <span class="result-qty">Quantità: <b>${qta}</b></span>
                        </div>
                        <span class="result-shipping ${shippingClass}">
                            ${shippingText}
                        </span>
                    </div>
                    <a href="${purchaseUrl}" target="_blank" class="result-button">🛒 ACQUISTA</a>
                </div>`;
        }

        resultDiv.innerHTML = htmlFinale;

        document.querySelectorAll('.inspect-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                mostraModal(this.getAttribute('data-json'));
            });
        });
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
        modal.innerHTML = `
            <div class="modal-content">
                <span id="closeModal">&times;</span>
                <h3 class="modal-title">Struttura Oggetto API</h3>
                <pre id="jsonContent"></pre>
            </div>`;
        document.body.appendChild(modal);
        document.getElementById('closeModal').addEventListener('click', () => modal.classList.remove('show'));
    }
    const obj = JSON.parse(jsonStr);
    document.getElementById('jsonContent').textContent = JSON.stringify(obj, null, 2);
    modal.classList.add('show');
}