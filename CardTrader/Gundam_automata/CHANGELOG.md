# Changelog — Crometium TCG

## 0.8 — Rebrand + freemium Free/Pro

- **Nuovo nome**: da “CardTrader Price Alert” a **Crometium TCG**.
- Versione portata a **0.8**.
- **Multilingua** IT / EN / ES documentato.
- **Freemium**:
  - Free: max 5 carte, un canale, poll 5′, grafico giorno, no auto-cart/suono/debug
  - Pro: soft-cap 100, dual-channel, poll 1–5′, auto-cart, suono, grafici lunghi, debug
  - Trial Pro 15 giorni da installazione
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
