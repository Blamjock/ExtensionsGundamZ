# Crometium TCG — Chrome Web Store listing (bozza)

Copia/incolla nel [Developer Dashboard](https://chrome.google.com/webstore/devconsole).  
Aggiorna i placeholder `[URL …]` prima dell’invio.

Versione attuale manifesto: **0.8**

---

## Asset richiesti

| Asset | Note |
|---|---|
| Icona 128×128 | `icons/icon-128.png` |
| Screenshot (min. 1) | Consigliati 1280×800 o 640×400 — popup watchlist, grafici, settings |
| Tile promozionale (opz.) | 440×280 |
| Marquee (opz.) | 1400×560 |
| Privacy policy URL | Obbligatoria — vedi [STORE_PRIVACY_CHECKLIST.md](STORE_PRIVACY_CHECKLIST.md) |
| Pacchetto ZIP | `./pack-store.sh` → `dist/CrometiumTCG-*-chrome.zip` |

---

## Italiano

### Nome
Crometium TCG

### Descrizione breve (max ~132 caratteri)
Monitora i prezzi CardTrader: alert sotto soglia, grafici, auto-cart. Free + Pro. IT/EN/ES.

### Descrizione dettagliata

```
Crometium TCG tiene d’occhio i listing su CardTrader e ti avvisa quando una carta scende sotto il prezzo che hai impostato.

COSA FA
• Aggiungi blueprint alla watchlist (ID o dalla pagina carta CardTrader)
• Controlla periodicamente CT Zero e Normale
• Notifica del browser quando il prezzo è ≤ soglia
• Grafici dello storico prezzi
• Opzionale (Pro): suono di alert e auto-cart sul carrello CardTrader

PIANI FREE E PRO
• Trial Pro: 15 giorni dall’installazione
• Free: fino a 5 carte, un canale alla volta (Zero oppure Normale), polling fisso 5 minuti, grafico Giorno
• Pro: fino a 100 carte, Zero + Normale insieme, polling 1–5 minuti, suono, auto-cart, grafici Settimana/Mese, watchlist a schermo intero

Come passare a Pro: acquisto esterno (PayPal) sulla pagina prezzi → ricevi una license key via email → attivala in Impostazioni. Chrome Web Store non gestisce il pagamento in-app.

REQUISITI
• Account CardTrader e un API token personale (lo inserisci tu nell’estensione; resta salvato in locale sul tuo Chrome)
• Chrome aperto affinché il controllo prezzi possa girare

LINGUE
Italiano, English, Español (selezionabili in Impostazioni).

PRIVACY IN SINTESI
Il token API e la watchlist restano nel storage locale del browser. Le chiamate prezzi vanno a api.cardtrader.com. L’acquisto Pro e l’email avvengono sul sito di checkout esterno, non dentro lo store. Dettagli: [URL privacy policy].

Supporto: [URL supporto / email]
Pagina prezzi Pro: [URL checkout / pricing]
```

### Categoria suggerita
Productivity (alternativa: Shopping)

### Lingua scheda
Italiano (+ aggiungi English come lingua aggiuntiva se disponibile)

---

## English

### Name
Crometium TCG

### Short description (max ~132 characters)
Watch CardTrader prices: under-target alerts, charts, auto-cart. Free + Pro. IT/EN/ES.

### Detailed description

```
Crometium TCG watches CardTrader listings and alerts you when a card drops to or below your target price.

WHAT IT DOES
• Add blueprints to a watchlist (by ID or from a CardTrader card page)
• Periodically check CT Zero and Normal offers
• Browser notification when price ≤ target
• Price history charts
• Optional (Pro): alert sound and auto-cart into your CardTrader cart

FREE AND PRO
• Pro trial: 15 days from install
• Free: up to 5 cards, one channel at a time (Zero or Normal), fixed 5-minute polling, Day chart only
• Pro: up to 100 cards, Zero + Normal together, 1–5 minute polling, sound, auto-cart, Week/Month charts, full-page watchlist

Upgrade path: pay externally (PayPal) on the pricing page → receive a license key by email → activate it in Settings. Chrome Web Store does not handle in-extension payments.

REQUIREMENTS
• A CardTrader account and your personal API token (you paste it into the extension; it stays in local Chrome storage)
• Chrome running so price checks can run on schedule

LANGUAGES
Italian, English, Spanish (selectable in Settings).

PRIVACY AT A GLANCE
API token and watchlist stay in browser local storage. Price requests go to api.cardtrader.com. Pro checkout and email happen on the external pricing site, not inside the Store. Details: [privacy policy URL].

Support: [support URL / email]
Pro pricing page: [checkout / pricing URL]
```

### Suggested category
Productivity (alt: Shopping)

---

## Single purpose (campo Dashboard — inglese consigliato)

```
Helps users monitor CardTrader card prices and get notified when listings fall under a user-defined target.
```

## Permission justifications (bozza breve per il form CWS)

Vedi tabella completa in [STORE_PRIVACY_CHECKLIST.md](STORE_PRIVACY_CHECKLIST.md). Versione corta:

| Permission / host | Justification (EN) |
|---|---|
| `storage` | Save API token, watchlist, settings, price history, and Pro entitlement locally. |
| `alarms` | Schedule periodic price checks. |
| `notifications` | Alert the user when a watched card is at or under target. |
| `offscreen` | Play an optional alert sound when a target hit is found. |
| `activeTab` | Read the active CardTrader card tab when the user adds a card from the current page. |
| `scripting` | Extract card title / blueprint id from the active CardTrader card page (user-initiated). |
| `https://api.cardtrader.com/*` | Fetch marketplace prices and (Pro) cart APIs. |
| `https://www.cardtrader.com/*` | Open / interact with CardTrader pages when adding a card from the current tab. |

---

## Note prima dell’invio

1. Sostituisci tutti i `[URL …]`.
2. Nella scheda dichiara chiaramente Free / trial / Pro a pagamento esterno.
3. Non promettere “pagamenti in Chrome”.
4. Alza `version` nel `manifest.json` a ogni nuovo upload.
5. Genera lo zip con `./pack-store.sh`.
