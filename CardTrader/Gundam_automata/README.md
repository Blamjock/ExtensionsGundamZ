# Crometium TCG — v0.8

Estensione Chrome (Manifest V3) per **monitorare i prezzi** sul marketplace [CardTrader](https://www.cardtrader.com): alert quando una carta scende sotto la soglia, grafici dello storico, auto-cart opzionale.

| | |
|---|---|
| **Nome** | Crometium TCG |
| **Versione** | 0.8 |
| **Cartella** | `CardTrader/Gundam_automata/` |
| **Lingue** | Italiano, English, Español |

> **Crometium** = Chrome + monitoraggio prezzi TCG. Funziona su listing CardTrader (es. Gundam Card Game e altri blueprint).

## Cosa fa

1. Controlla periodicamente i blueprint in watchlist via API CardTrader.
2. Filtra le offerte per **lingua**, **condizione** e **finish** (non-foil / foil / reverse).
3. Separa le offerte **CT Zero** e **Normale**.
4. Se il prezzo è ≤ soglia → notifica (+ suono campanella in **Pro**).
5. Opzionale (**Pro**): **auto-cart** greedy fino a N pezzi, poi **pausa** della sola carta.
6. Salva lo storico prezzi e lo mostra in **grafici** (Free: giorno; Pro: settimana/mese) con tooltip al passaggio del mouse.

## Free / Pro

Un’unica estensione freemium. Trial Pro **30 giorni** all’installazione. Dopo: Free con limiti, oppure Pro via license key (stub `PRO-DEV-*` in sviluppo; backend reale in `docs/LICENSE_API.md`).

Dettagli: [docs/MONETIZATION.md](docs/MONETIZATION.md).

## Multilingua

L’interfaccia (popup, watchlist, messaggi background) è tradotta in **IT / EN / ES**.

- Selezione lingua nel tab **Impostazioni** del popup
- Rilevamento automatico dalla lingua del browser al primo avvio
- Cataloghi in `locales/{it,en,es}.json` caricati da `i18n.js`

Dettagli: [docs/I18N.md](docs/I18N.md).

## Documentazione

| Documento | Contenuto |
|---|---|
| [docs/API_TOKEN.md](docs/API_TOKEN.md) | **Guida:** creare il token CardTrader e inserirlo nell’app |
| [docs/HOW_IT_WORKS.md](docs/HOW_IT_WORKS.md) | Architettura, flusso check, storage, grafici |
| [docs/I18N.md](docs/I18N.md) | Come funziona e come aggiungere una lingua |
| [docs/MONETIZATION.md](docs/MONETIZATION.md) | Free / Pro, limiti, entitlement |
| [docs/LICENSE_API.md](docs/LICENSE_API.md) | Contratto API licenze + checkout MoR |
| [docs/STORE_LISTING.md](docs/STORE_LISTING.md) | Bozza scheda Chrome Web Store (IT/EN) |
| [docs/STORE_PRIVACY_CHECKLIST.md](docs/STORE_PRIVACY_CHECKLIST.md) | Privacy + giustificazione permessi per la review |
| [CHANGELOG.md](CHANGELOG.md) | Cronologia versioni |
| [../README.md](../README.md) | Panoramica suite CardTrader |

## Pack per Chrome Web Store

```bash
cd CardTrader/Gundam_automata
./pack-store.sh          # → dist/CrometiumTCG-<version>-chrome.zip
```

Esclude `web/`, `docs/`, source icon e junk. Poi carica lo zip nella [Developer Dashboard](https://chrome.google.com/webstore/devconsole).

## Installazione rapida

1. `chrome://extensions` → Modalità sviluppatore → **Carica non pacchettizzata**
2. Seleziona questa cartella (`Gundam_automata`)
3. Crea e incolla l’API Token CardTrader → **Salva** (vedi [docs/API_TOKEN.md](docs/API_TOKEN.md))
4. (Opzionale) Scegli la lingua in Impostazioni
5. Aggiungi Blueprint ID + prezzo max + canali, filtri (lingua / stato / finish) e, in Pro, quantità da prendere in auto-cart

## File principali

```
Gundam_automata/
├── manifest.json          # nome, versione 0.8, permessi
├── background.js          # alarm, check API, alert, history, cart, entitlements
├── watchItem.js           # normalizzazione voce, filtri listing, foil/qty helpers
├── entitlements.js        # Free/Pro limits, trial, grace
├── licenseApi.js          # activate/verify + stub PRO-DEV-*
├── popup.html / popup.js  # UI principale + grafici + upsell
├── watchlist.html / .js   # vista a tutta pagina
├── offscreen.html / .js   # audio alert
├── i18n.js                # motore traduzioni
├── locales/               # it.json, en.json, es.json
├── debug.html / debug.js
└── docs/                  # come funziona + monetizzazione
```
