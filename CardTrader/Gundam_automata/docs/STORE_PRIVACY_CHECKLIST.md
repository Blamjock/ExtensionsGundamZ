# Crometium TCG — Privacy checklist (Chrome Web Store)

Allineata a `manifest.json` v0.8 e all’uso reale nel codice.  
Usala per: **Privacy practices**, **Permission justification**, e bozza **Privacy Policy**.

---

## 1. Dichiarazione pratiche privacy (Dashboard)

Risposte tipiche da selezionare / dichiarare (adatta al form attuale CWS):

| Domanda tipica | Risposta consigliata | Motivo |
|---|---|---|
| L’estensione raccoglie dati utente? | **Sì, in modo limitato** (storage locale + chiamate API verso CardTrader) | Token, watchlist, settings sul device; richieste a CardTrader |
| Usa remote code? | **No** | MV3, niente `eval` / codice remoto |
| Vende dati a terzi? | **No** | |
| Usa dati per pubblicità? | **No** | |
| Trasmette PII a sviluppatori? | **No dall’estensione** | Email/pagamento solo sul sito checkout esterno (non nel pacchetto store) |
| Privacy policy URL | **Obbligatorio** — pubblica una pagina e incolla l’URL | |

---

## 2. Permessi manifesto → giustificazione

### `permissions`

| Permesso | Usato? | Dove | Cosa dire a Google (EN) | Cosa dire in Privacy Policy (IT) |
|---|---|---|---|---|
| `storage` | Sì | `background.js`, `popup.js`, `entitlements.js`, `licenseApi.js`, … | Stores the user’s CardTrader API token, watchlist, settings, price history samples, cart archive, and Pro license entitlement in `chrome.storage.local` on the device. | Salviamo in locale (Chrome): token API, watchlist, impostazioni, storico prezzi, archivio carrello e stato licenza Pro. Non carichiamo questi dati sui nostri server dall’estensione (finché `LICENSE_API_BASE` non è configurato verso il tuo backend). |
| `alarms` | Sì | `background.js` | Schedules periodic marketplace price checks while Chrome is running. | Usiamo allarmi Chrome per controllare i prezzi a intervalli (Free: 20′; Pro: 3–5′). |
| `notifications` | Sì | `background.js` | Shows a desktop notification when a watched listing is at or under the user’s target price. | Mostriamo una notifica di sistema quando una carta in watchlist è ≤ soglia. |
| `offscreen` | Sì | `background.js` + `offscreen.html` | Creates a short-lived offscreen document to play an optional alert sound on target hits (Pro). | Documento offscreen temporaneo solo per riprodurre il suono di alert (Pro), se abilitato. |
| `activeTab` | Sì | `popup.js` (`readCardFromActiveTab`) | Accesses the active tab only when the user chooses to add a card from the current CardTrader page. | Solo quando l’utente aggiunge una carta dalla scheda attiva: leggiamo l’URL/tab corrente. |
| `scripting` | Sì | `popup.js` (`chrome.scripting.executeScript` → scrape titolo/blueprint) | Injects a minimal script into the active CardTrader card page, on user action, to read blueprint id / card title. Does not run on other sites unsolicited. | Su azione utente, uno script minimo sulla pagina carta CardTrader legge titolo / blueprint id. Non giriamo su altri siti in automatico. |

### `host_permissions`

| Host | Usato? | Dove | Giustificazione |
|---|---|---|---|
| `https://api.cardtrader.com/*` | Sì | `background.js` (`BASE_URL`) | Lettura prezzi / marketplace e, in Pro, chiamate carrello (`/cart/…`) con il token dell’utente. |
| `https://www.cardtrader.com/*` | Sì | `popup.js` (tab/URL carta), aperture link | Consentire lettura pagina carta attiva e navigazione verso CardTrader. |

### Altro nel manifesto

| Voce | Nota privacy |
|---|---|
| `web_accessible_resources` (`sound_campanella.*`, `<all_urls>`) | Solo file audio locali dell’estensione esposti come risorsa; non implica raccolta dati. In review puoi spiegare: “Alert sound assets for offscreen playback”. |
| Nessun `identity` / `cookies` / broad `<all_urls>` host permission | Bene: superficie ridotta. |

---

## 3. Dati trattati (inventario)

| Dato | Dove resta | Inviato a | Note |
|---|---|---|---|
| API token CardTrader | `chrome.storage.local` | Solo `api.cardtrader.com` (header Authorization) | Trattalo come password; non loggarlo in chiaro (il debug lo maschera) |
| Watchlist / target price / canali | Locale | No (solo usati per chiamate API) | |
| Storico prezzi (campioni) | Locale | No | Per grafici |
| Indirizzo carrello (Pro auto-cart) | Locale | CardTrader cart API se auto-cart attivo | Nome, via, CAP, città, provincia, paese inseriti dall’utente |
| Impostazioni (lingua, poll, suono, …) | Locale | No | |
| License key / entitlement Pro | Locale; se `LICENSE_API_BASE` valorizzato → tuo backend | Tuo server licenze (quando online) | In stub locale (`PRO-DEV-*`) nessuna rete |
| Email / pagamento PayPal | **Non nell’estensione** | Sito `web/pricing.html` + PayPal / tuo `orderApiUrl` | Dichiaralo come prodotto correlato esterno |

---

## 4. Cosa NON fate (da dichiarare esplicitamente)

- Nessuna pubblicità / tracker analytics di terze parti nell’estensione (allo stato attuale del codice).
- Nessuna vendita di dati.
- Nessun remote code hosting.
- Il pagamento Pro non passa dal Chrome Web Store.

Se in futuro aggiungi analytics o backend licenze, aggiorna policy + questa checklist **prima** dell’upload.

---

## 5. Bozza testo Privacy Policy (minima, da pubblicare su un URL)

> Adatta nome legale, contatti e URL. Non è consulenza legale.

```
Privacy Policy — Crometium TCG (Chrome extension)

Last updated: [DATE]
Contact: [EMAIL]

1. Who we are
Crometium TCG (“the Extension”) helps you monitor CardTrader marketplace prices in Chrome.

2. Data stored on your device
The Extension stores in chrome.storage.local: your CardTrader API token, watchlist and targets,
settings, optional cart address for auto-cart, price history samples, and Pro license status.
This data stays on your device unless you clear site/extension data or uninstall.

3. Data sent over the network
• To CardTrader (https://api.cardtrader.com): API requests authenticated with your token to read
  prices and, if you enable Pro auto-cart, to add items to your CardTrader cart.
• To our license backend (only if configured): license activate/verify requests with your license key.
We do not sell your data or use it for advertising.

4. Permissions
storage, alarms, notifications, offscreen, activeTab, scripting, and access to cardtrader.com /
api.cardtrader.com — solely to provide price monitoring, alerts, optional sound, and optional
add-from-current-page / auto-cart features as described in the Store listing.

5. Pro purchases
Paid Pro plans are sold on our external website via PayPal. Name/email for license delivery are
collected on that website, not by the Chrome extension package itself.

6. Your choices
You can remove your API token, clear extension data, or uninstall at any time. Revoking the
CardTrader token in your CardTrader account also invalidates API access.

7. Children
Not directed at children under 16.

8. Changes
We may update this policy; the “Last updated” date will change. Material changes will be
reflected in the Store listing when required.
```

Versione IT breve da affiancare sulla stessa pagina se vuoi bilingual.

---

## 6. Checklist pre-submit (privacy + review)

- [ ] Privacy Policy online con HTTPS e link in Dashboard  
- [ ] Ogni permesso del `manifest.json` ha una justification in inglese nel form  
- [ ] Host `api.cardtrader.com` e `www.cardtrader.com` giustificati  
- [ ] Descrizione store spiega Free / trial 30gg / Pro esterno (PayPal + key)  
- [ ] Nessun secret nello ZIP (`./pack-store.sh` esclude `web/`, `docs/`, source icon)  
- [ ] Token non appare nei log debug in chiaro  
- [ ] Screenshot non mostrano token o dati personali reali  
- [ ] Se `LICENSE_API_BASE` / checkout sono ancora placeholder, non promettere URL falsi in scheda  
- [ ] `activeTab` + `scripting` descritti come **user-initiated** (aggiungi carta dalla pagina)  
- [ ] `offscreen` descritto solo per audio alert  

---

## 7. Rischi review da conoscere

1. **`scripting` + `activeTab`**: Google chiede spesso “single purpose” e scope minimo — la giustificazione “solo su cardtrader.com, solo su click utente” è corretta; non ampliare gli host.  
2. **Auto-cart**: dichiara che usa il token/API dell’utente e che l’uso deve rispettare i ToS CardTrader.  
3. **Pagamenti**: non usare wording che sembri IAP Chrome; punta alla pagina prezzi esterna.  
4. **`web_accessible_resources` con `<all_urls>`**: se la review lo contesta, si può restringere i `matches` in un update futuro (non bloccante se spiegato come asset audio).

---

## Riferimenti codice

- Manifest: [`../manifest.json`](../manifest.json)  
- API prezzi / alarm / notify / offscreen: [`../background.js`](../background.js)  
- Add-from-page (`tabs` + `scripting`): [`../popup.js`](../popup.js) `readCardFromActiveTab`  
- Licenze: [`../licenseApi.js`](../licenseApi.js)  
- Monetizzazione: [`MONETIZATION.md`](MONETIZATION.md)  
- Listing store: [`STORE_LISTING.md`](STORE_LISTING.md)
