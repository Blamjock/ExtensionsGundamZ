# CardTrader — Estensioni Chrome Gundam

Suite di estensioni Chrome (Manifest V3) per interagire con [CardTrader](https://www.cardtrader.com) sul mercato delle carte **Gundam Card Game**.

| Cartella | Nome Chrome | Versione | Ruolo |
|---|---|---|---|
| `gundam_market/` | Mobile Price Suit | **0.13** | Ricerca prezzi via API + menu contestuale |
| `gundam_analyzer/` | Mobile Price Analyzer | **0.10** | Analisi spese sugli ordini buyer |
| `Gundam_automata/` | **Crometium TCG** | **0.8** | Freemium Free/Pro, alert Zero/Normale, grafici, auto-cart, **multilingua IT/EN/ES** |

Tutte usano **Manifest Version 3**.

---

## Requisiti comuni

1. Browser Chromium (Chrome / Edge) con supporto alle estensioni non firmate in modalità sviluppatore.
2. Un **API Token** CardTrader (da [CardTrader → Settings → API](https://www.cardtrader.com)), necessario per:
   - Mobile Price Suit
   - Crometium TCG  
   *(Mobile Price Analyzer non usa l’API: legge il DOM della pagina ordini.)*

### Installazione (tutte)

1. Apri `chrome://extensions`
2. Attiva **Modalità sviluppatore**
3. **Carica estensione non pacchettizzata** → seleziona la cartella del plugin
4. Configura token / opzioni come descritto sotto

---

## 1. Mobile Price Suit (`gundam_market`) — v0.13

Estensione per cercare il prezzo minimo di una carta Gundam tramite API CardTrader, anche da testo selezionato in qualsiasi pagina.

### Funzionalità

- **Cerca Min**: cerca blueprints per nome e mostra la migliore offerta (preferenza a listing *CardTrader Zero*), ordinata per rarità e prezzo.
- **Analizza 10**: aggrega fino a 10 offerte con rarità Gundam, ordinate per rarità/prezzo.
- **Menu contestuale**: “Cerca prezzo CardTrader” sul testo selezionato → apre il popup con la query.
- **Storico prezzo basso**: salva in `chrome.storage.local` il prezzo minimo visto per blueprint (`lowestPrice_<id>`) e mostra la % di scostamento.
- **DEBUG API**: modal con JSON blueprint + offerta selezionata.
- **Opzioni**: salvataggio token API (`cardtraderApiToken`).

### File

| File | Ruolo |
|---|---|
| `manifest.json` | MV3, permessi `storage` + `contextMenus`, host `api.cardtrader.com` |
| `background.js` | Service worker: crea/gestisce il context menu |
| `popup.html` / `popup.js` | UI ricerca e rendering risultati |
| `options.html` / `options.js` | Impostazione token |
| `icons/` | Icone estensione |
| `card_trader_postman_collection.json` | Collezione Postman di riferimento API v2 |
| `test.js` | **Non usato** — bozza/prototipo sniper (da non caricare in produzione) |

### Permessi

- `storage` — token e prezzi storici
- `contextMenus` — voce sul testo selezionato
- `host_permissions`: `https://api.cardtrader.com/*`

### API utilizzate

- `GET /api/v2/blueprints?name=...`
- `GET /api/v2/marketplace/products?blueprint_id=...`

### Configurazione

1. Icona estensione → **Impostazioni Token** (o pagina opzioni)
2. Incolla il Bearer token CardTrader → Salva
3. Cerca una carta dal popup oppure seleziona testo → tasto destro → “Cerca prezzo CardTrader”

### Note / problemi noti

- Il manifest punta a icone `.png`, ma nella cartella `icons/` risultano file `.svg` → possibile icona mancante in Chrome.
- In `popup.js` si riferisce a `listSetBtn` / `listingCompletoSet("GD04")` ma il pulsante non è in `popup.html` e la funzione non è definita (codice morto / incompleto).
- `test.js` non è referenziato dal manifest: artifact di sviluppo.

---

## 2. Mobile Price Analyzer (`gundam_analyzer`) — v0.10

Analizza le spese sugli ordini buyer futuri di CardTrader, raggruppando per **rarità** (e opzionalmente per categoria carta tramite mapping set).

### Funzionalità

- Content script sulla pagina ordini buyer:
  - `https://www.cardtrader.com/*/orders/buyer_future_order*`
  - `https://www.cardtrader.com/it/orders/buyer_future_order*`
- Pulsante flottante **“Analizza Spese”** che scansiona le righe tabella (`tr[data-test-id]`).
- Estrae quantità, prezzo unitario, codice set (`GD04-012`, ecc.) e rarità dalle classi CSS (`ss-lr`, `ss-r`, `ss-nc`/`ss-u`, `ss-c`, `ss-p`).
- Classifica le carte in categorie (unità / piloti / comandi / basi) se configurato il mapping set.
- Salva i risultati in `lastResults` e li mostra nel popup (rarità LR, R, NC, C, Promo + totale).

### File

| File | Ruolo |
|---|---|
| `manifest.json` | MV3, content script + popup + options |
| `content.js` | Iniezione UI e analisi DOM |
| `popup.html` / `popup.js` | Visualizzazione ultimi risultati |
| `options.html` / `options.js` | Mapping range numerici per set (GD/ST) |

### Permessi

- `storage` — mapping set e ultimi risultati
- `activeTab`
- `host_permissions`: `https://www.cardtrader.com/*`

### Configurazione

1. Apri le opzioni → **Configura Range**
2. Aggiungi espansioni (es. `GD04`) con range numerici per Unità / Piloti / Comandi / Basi
3. Vai su una pagina *buyer future order* su CardTrader
4. Clicca **Analizza Spese** → apri il popup dell’estensione per i totali

### Note / problemi noti

- La description del manifest menziona un “price history graph”: nel codice attuale **non c’è alcun grafico**.
- Nessuna icona dichiarata nel manifest.
- La sezione categorie nel popup viene svuotata (`cat-list`); i dati `byCat` vengono comunque calcolati ma non mostrati.

---

## 3. Crometium TCG (`Gundam_automata`) — v0.8

Watcher in background che monitora una lista di blueprint e, se il prezzo di mercato è ≤ target, **notifica** l’utente (con suono campanella opzionale). Puoi scegliere di controllare **CT Zero**, **Normale** o entrambi. L’add-to-cart è **opt-in per carta**. Include **storico prezzi con grafici interattivi**, pagina watchlist dedicata, **multilingua IT/EN/ES** e **modalità debug**.

> Documentazione dedicata: [`Gundam_automata/README.md`](Gundam_automata/README.md) · [Come funziona](Gundam_automata/docs/HOW_IT_WORKS.md) · [i18n](Gundam_automata/docs/I18N.md)

### Funzionalità

- Alarm periodico (`sniperLoop`) con intervallo configurabile (`pollMinutes`, default 2, range 1–5).
- Per ogni voce: `GET marketplace/products?blueprint_id=...` → separa listing Zero vs Normale e prende il migliore di ogni canale monitorato.
- Se sotto soglia: notifica “Prezzo basso!” con canale (`[CT Zero]` / `[Normale]`); dedupe per `product_id` + canale; ri-alert se il prezzo scende ulteriormente.
- **Suono alert**: riproduce `sound_campanella` tramite documento offscreen MV3 (attivabile/disattivabile dal popup).
- Se `autoCart` è attivo: `POST /api/v2/cart/add` con body `{ product_id, quantity, via_cardtrader_zero }` (+ indirizzo se configurato); successo → voce in **Archivio carrello** (qty aggregata, totale spesa, rimozione/svuota).
- Popup: token, lingua, intervallo, label, Blueprint ID, prezzo max, checkbox **CT Zero** / **Normale**, toggle auto-cart e suono; lista con min/now e prezzi Zero/Normale (evidenziati se ≤ target).
- **Storico prezzi (`priceHistory`)**: a ogni check salva un campione `{ t, z, n }` per blueprint; prune automatico (~32 giorni / max 2500 punti, con densità più alta sugli ultimi ~720).
- **Grafico prezzi** (popup e pagina watchlist):
  - Intervalli **Giorno / Settimana / Mese**
  - Due serie: CT Zero (verde) e Normale (blu)
  - Stats: campioni, ultimo prezzo ± delta, min/max, inizio serie
  - **Tooltip al passaggio del mouse**: vicino al cursore mostra data/ora e valori Zero/Normale del campione più vicino; linea guida verticale e punti evidenziati sulle oscillazioni
- **Pagina watchlist** (`watchlist.html`): griglia ricercabile/ordinabile/filtrabile (sotto soglia, Zero, Normale, auto-cart) con apertura grafico per carta.
- **Multilingua**: IT / EN / ES via `i18n.js` + `locales/*.json` (popup, watchlist, background, debug). Selezione in Impostazioni; fallback automatico dalla lingua del browser.
- **Debug mode**: salva fino a 30 chiamate API (marketplace + cart); finestra `debug.html` con request/response; token mascherato; “Esegui check ora”.

### File

| File | Ruolo |
|---|---|
| `manifest.json` | MV3, nome Crometium TCG, v0.8, offscreen/sound |
| `background.js` | Alarm, split Zero/Normale, history, alert+suono, cart, debug |
| `popup.html` / `popup.js` | UI principale, grafici, archivio, lingua, suono |
| `watchlist.html` / `watchlist.js` | Pagina dedicata carte monitorate + grafici |
| `offscreen.html` / `offscreen.js` | Riproduzione audio alert (campanella) |
| `i18n.js` + `locales/{it,en,es}.json` | Traduzioni UI e messaggi background |
| `debug.html` / `debug.js` | Ispezione request/response |
| `docs/` | HOW_IT_WORKS, I18N |
| `sound_campanella.m4a` / `.m4r` | Audio notifica |
| `icons/` | Icone PNG 16/32/48/128 |

### Permessi

- `storage`, `alarms`, `notifications`, `offscreen`, `activeTab`, `scripting`
- `host_permissions`: `https://api.cardtrader.com/*`, `https://www.cardtrader.com/*`

### Intervallo di polling

Configurabile dal popup (`pollMinutes`). Default **2 minuti**. Countdown e alarm allineati.

### Configurazione

1. Apri il popup → incolla API Token → **Salva token**
2. (Opzionale) Scegli lingua (IT/EN/ES) — l’app è multilingua
3. (Opzionale) Imposta intervallo 1–5 min → **Applica**
4. Inserisci Blueprint ID, prezzo max, eventuale label
5. Seleziona cosa controllare: **CT Zero** e/o **Normale**
6. (Opzionale) Auto-cart e/o suono alert → **Aggiungi alla lista**
7. Per i grafici: attendi alcuni check, poi clicca l’icona grafico sulla carta (popup o **Apri watchlist**)
8. Lascia Chrome aperto (il service worker MV3 può essere sospeso: gli alarm lo riattivano)

### Note

- Migrazione automatica: `sniperList` (v1.1) → `watchList`; voci senza `watchZero`/`watchNormal` monitorano entrambi.
- Duplicati `bId`: aggiornano target/canali/autoCart/label della voce esistente.
- Auto-cart aggiunge al carrello ma **non** completa il checkout.
- Zero rilevato come in Suit: `can_be_sent_with_zero` o `user.can_sell_sealed_with_ct_zero`.
- Il tooltip del grafico segue il campione più vicino sull’asse tempo (utile per leggere le oscillazioni senza leggere solo min/max aggregati).

---

## Matrice API CardTrader

| Endpoint | Suit | Analyzer | Alert |
|---|:---:|:---:|:---:|
| `GET /api/v2/blueprints` | ✓ | | |
| `GET /api/v2/marketplace/products` | ✓ | | ✓ |
| `POST /api/v2/cart/add` | | | ✓ (opt-in) |
| Scraping DOM ordini buyer | | ✓ | |

Riferimento Postman: `gundam_market/card_trader_postman_collection.json`.

---

## Storage (`chrome.storage.local`)

| Chiave | Plugin | Contenuto |
|---|---|---|
| `cardtraderApiToken` | Suit | Bearer token |
| `contextSearchQuery` | Suit | Query da context menu (temporanea) |
| `lowestPrice_<blueprintId>` | Suit | Prezzo minimo storico (centesimi) |
| `gundamMapping` | Analyzer | Range set → categorie |
| `lastResults` | Analyzer | Ultimo report spese |
| `token` | Alert | Bearer token |
| `watchList` | Alert | `[{ bId, target, watchZero, watchNormal, autoCart, lastSeenZero, lastSeenNormal, ... }]` |
| `priceHistory` | Alert | `{ [blueprintId]: [{ t, z, n }, ...] }` — storico prezzi per grafici |
| `pollMinutes` | Alert | Intervallo alarm (1–5, default 2) |
| `nextTick` | Alert | Timestamp prossimo check |
| `lastStatus` | Alert | Esito ultimo ciclo `{ ok, message, at }` |
| `locale` | Alert | Lingua UI (`it` / `en` / `es`) |
| `alertSound` | Alert | Boolean — suono campanella sugli alert (default `true`; effettivo solo in Pro) |
| `installAt` | Alert | Timestamp prima installazione (trial 15gg) |
| `entitlement` | Alert | Cache licenza `{ tier, expiresAt, licenseId, lastVerifiedAt, source }` |
| `licenseKey` | Alert | Chiave Pro attivata |
| `devForcePro` | Alert | Boolean — forza Pro in sviluppo |
| `debugMode` | Alert | Boolean — log request/response (solo Pro) |
| `debugLogs` | Alert | Ultimi log API (max 30) |
| `cartAddress` | Alert | Indirizzo per `/cart/add` |
| `cartArchive` | Alert | Carte aggiunte al carrello `[{ label, qty, unitPrice, channel, ... }]` |

> **Attenzione:** Suit e Alert usano chiavi token diverse (`cardtraderApiToken` vs `token`). Non sono condivise.

---

## Checklist versioni (stato codice)

| Plugin | Versione manifest | Coerenza interna | Stato |
|---|---|---|---|
| Mobile Price Suit | `0.13` | Icone png≠svg; funzione listing incompleta | Operativa con caveat |
| Mobile Price Analyzer | `0.10` | Description “graph” non implementata | Operativa per rarità |
| Crometium TCG | `0.8` | Multilingua IT/EN/ES, grafici+tooltip, watchlist, auto-cart | Operativa |

Schema versioning osservato: tutti i plugin in `0.x` (Crometium TCG riparte da 0.8 dopo il rebrand).

---

## Struttura repository

```
CardTrader/
├── README.md                 ← questo documento
├── gundam_market/            ← Mobile Price Suit v0.13
├── gundam_analyzer/          ← Mobile Price Analyzer v0.10
└── Gundam_automata/          ← Crometium TCG v0.8 (ex Price Alert)
```

---

## Sicurezza

- Non committare token API reali.
- Il token è salvato solo in `chrome.storage.local` del profilo browser.
- Con auto-cart attivo l’estensione scrive sul carrello: trattala come strumento privilegiato.
