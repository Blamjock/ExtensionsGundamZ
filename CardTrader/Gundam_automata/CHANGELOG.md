# Changelog — Crometium TCG

## 0.8.x — Auto-cart qty + filtri finish

- **Auto-cart a quantità** (Pro): campo `wantQty` (1–99); fill greedy dai listing più economici rispettando lo stock; progresso `cartedQty/wantQty`.
- **Pausa per carta**: a obiettivo raggiunto la voce va in `paused` (skip check); UI con badge e **Riprendi** (reset conteggio).
- **Filtro finish / foil** multi-gioco: chip Non-foil / Foil / Reverse; matching su `*_foil`, `pokemon_reverse`; query marketplace `foil=` quando univoca.
- Filtri lingua / condizione / finish documentati in `docs/HOW_IT_WORKS.md`.
- Notifica aggregata con pezzi aggiunti (`bg.cartAddedQty` / pausa).

## 0.8 — Rebrand + freemium Free/Pro

- **Nuovo nome**: da “CardTrader Price Alert” a **Crometium TCG**.
- Versione portata a **0.8**.
- **Multilingua** IT / EN / ES documentato.
- **Freemium**:
  - Free: max 5 carte, un canale, poll 20′, grafico giorno, no auto-cart/suono/debug
  - Pro: soft-cap 100, dual-channel, poll 3–5′, auto-cart, suono, grafici lunghi, debug
  - Trial Pro 30 giorni da installazione
  - Grace offline 7 giorni sull’ultima verifica licenza
  - Attivazione key (`PRO-DEV-*` in stub) + CTA checkout
- Moduli: `entitlements.js`, `licenseApi.js`
- Docs: `MONETIZATION.md`, `LICENSE_API.md`, HOW_IT_WORKS, I18N
- Grafici prezzi con tooltip al passaggio del mouse

### Funzionalità base

- Watchlist Zero/Normale con alert
- Auto-cart opt-in + archivio carrello (Pro)
- Storico prezzi + grafici
- Pagina watchlist ricercabile/filtrabile
- Debug API (Pro)
