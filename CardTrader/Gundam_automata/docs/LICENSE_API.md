# License API — contratto backend (Pro)

Backend minimo per abbonamenti/licenze Crometium TCG. L’estensione parla solo con questi endpoint ([`licenseApi.js`](../licenseApi.js)).

## Config estensione

In `licenseApi.js`:

```js
export const LICENSE_API_BASE = ""; // es. "https://api.crometium.example"
export const CHECKOUT_URL = "https://crometium.example/pricing";
```

Se `LICENSE_API_BASE` è vuoto, l’estensione usa uno **stub locale**:

- Chiavi che iniziano con `PRO-DEV-` → attivano Pro (scadenza +1 anno).
- `verify` conferma la cache locale senza rete.

## Endpoints

### `POST /v1/license/activate`

Body:

```json
{ "licenseKey": "XXXX-YYYY", "instanceId": "chrome-ext-…" }
```

Risposta 200:

```json
{
  "ok": true,
  "entitlement": {
    "tier": "pro",
    "expiresAt": 1735689600000,
    "licenseId": "lic_abc",
    "lastVerifiedAt": 1710000000000
  }
}
```

Errori: `400` key invalida, `402` scaduta/non pagata, `409` troppe attivazioni.

### `GET /v1/license/verify?licenseId=…` oppure `POST` con key

Risposta come `entitlement` sopra, oppure `{ "ok": false, "tier": "free" }`.

### Webhook Merchant of Record

Paddle / Lemon Squeezy → il backend:

1. Crea/aggiorna licenza su `subscription_created` / `order_created`.
2. Imposta `expiresAt` da periodo fatturazione.
3. Su `subscription_cancelled` / refund → `tier: free` o `expiresAt` immediato.
4. L’estensione lo scopre al prossimo `verify` (o grace scaduto).

## Sicurezza

- Non fidarti solo del client: il SW richiede verifica periodica.
- Opzionale: firma HMAC dell’entitlement (`signature`) verificata con chiave pubblica embedded (fase successiva).
- `instanceId` limita le attivazioni per key (es. 3 browser).

## Flusso checkout

1. Estensione apre `CHECKOUT_URL` (tab) — pagina landing in [`web/pricing.html`](../web/pricing.html).
2. Utente si registra (nome/email), paga con **PayPal** → il backend (webhook / `orderApiUrl`) crea la licenza e invia la **license key via email**.
3. Incolla la key in Impostazioni → `activate` (oppure verifica dalla stessa landing se `licenseApiBase` è configurato).
4. Cache locale aggiornata; UI passa a Pro.

Nella landing, configura in cima allo script: `paypalClientId`, `orderApiUrl`, `licenseApiBase`.
