# Crometium TCG — Monetizzazione Free / Pro

Un’unica estensione Chrome freemium. Chrome Web Store non offre più pagamenti nativi: il tier **Pro** si sblocca con licenza/abbonamento esterno (Merchant of Record consigliato: Paddle / Lemon Squeezy).

## Matrice funzionalità

| Area | Free | Pro | Motivo |
|---|---|---|---|
| Watchlist | max **5** carte | soft-cap **100** | Demo utile; upgrade quando la lista cresce |
| Canali | Zero **oppure** Normale (uno solo) | entrambi | Dual-channel = valore sniper |
| Polling | fisso **20 min** | 3–5 min | Meno carico API in Free; Pro più reattivo |
| Alert | notifica browser | notifica + **suono** | Power feature percepibile |
| Auto-cart | bloccato | abilitato | Massimo rischio/valore |
| Grafici | solo **Giorno** | Giorno / Settimana / Mese + tooltip | Storico lungo = Pro |
| Watchlist page (Espandi) | bloccata | sì | Vista full-page con ricerca/filtri |
| Debug API | nascosto | sì | Tool power user |
| i18n IT/EN/ES | sì | sì | Non è un gate commerciale |

Principio: Free completa il loop *aggiungi → check → alert*. Pro vende scala, velocità, automazione e analisi.

## Entitlement (come funziona)

Modulo: [`entitlements.js`](../entitlements.js).

| Stato | Quando |
|---|---|
| `pro` (trial) | Primi **30 giorni** da `installAt` |
| `pro` (license) | Licenza attiva (`expiresAt` futuro o lifetime) |
| `pro` (grace) | Offline ma ultima verifica ok entro **7 giorni** |
| `free` | Altrimenti |

Cache in `chrome.storage.local.entitlement`:

```json
{
  "tier": "pro",
  "expiresAt": 1735689600000,
  "licenseId": "lic_…",
  "licenseKey": "XXXX-…",
  "lastVerifiedAt": 1710000000000,
  "source": "license"
}
```

Dev: `chrome.storage.local.devForcePro = true` forza Pro senza backend.

**Enforcement** anche nel service worker (non solo UI): clamp poll, no auto-cart, un solo canale, limiti lista.

## Upgrade UX

1. Badge Free / Pro / Trial nel popup.
2. Controlli Pro bloccati → modal upsell + CTA checkout.
3. Tab Impostazioni → attiva licenza (incolla key) / gestisci abbonamento.
4. Downgrade soft: i dati restano; le feature Pro si disabilitano.

## Checkout e backend

Vedi [`LICENSE_API.md`](LICENSE_API.md) per il contratto API (`/activate`, `/verify`, webhook MoR).

Config estensione: `licenseApi.js` → `LICENSE_API_BASE` (vuoto = modalità stub locale per sviluppo).

## Policy / rischi

- Prezzi e feature Pro devono essere chiari sulla scheda CWS.
- Auto-cart e polling aggressivo: uso a proprio rischio rispetto ai ToS CardTrader.
- Niente dark pattern sul Free: il loop alert deve funzionare.
- Anti-pirateria leggera: verifica periodica + revoca key; niente DRM pesante.
