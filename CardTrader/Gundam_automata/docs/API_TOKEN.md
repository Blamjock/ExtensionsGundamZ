# Guida: API Token CardTrader in Crometium TCG

Crometium TCG legge i prezzi (e, in Pro, può aggiungere al carrello) tramite l’**API ufficiale CardTrader**. Serve un **API Token** (Bearer JWT) del tuo account.

> Il token è come una password: chi lo ha può agire sul tuo account CardTrader (inventory, carrello, ecc.). Non condividerlo e non committarlo nei repository.

## 1. Crea il token su CardTrader

1. Apri [CardTrader](https://www.cardtrader.com) e **accedi** al tuo account.
2. Vai alle **impostazioni del profilo** (Settings / Impostazioni).
3. Apri la sezione **API** / **API Access**  
   (documentazione ufficiale: [API Reference](https://www.cardtrader.com/en/docs/api/full/reference)).
4. Crea un nuovo token (es. **Create New Token** / Genera token).
5. Assegna un nome chiaro, ad esempio `Crometium TCG`.
6. **Copia subito** il token mostrato.  
   Di solito **non viene più visualizzato** dopo aver chiuso la finestra.

Se hai già un token valido e lo ricordi (o l’hai salvato in un gestore password), puoi riusarlo: non è obbligatorio crearne uno nuovo.

### Verifica rapida (opzionale)

Da terminale, sostituisci `IL_TUO_TOKEN`:

```bash
curl https://api.cardtrader.com/api/v2/info \
  -H "Authorization: Bearer IL_TUO_TOKEN"
```

Se la risposta è JSON con i dati account (e non un errore 401), il token è valido.

## 2. Inserisci il token in Crometium TCG

1. In Chrome, clicca l’icona dell’estensione **Crometium TCG**.
2. Apri il tab **Impostazioni**.
3. Espandi la sezione **API Token**.
4. Incolla il token nel campo (placeholder: *Il tuo API Token*).
5. Clicca **Salva token**.
6. Controlla lo stato in alto nel popup: dovrebbe comparire **Token salvato**.

Se il token manca, in cima al popup compare un avviso del tipo *Manca l’API token per monitorare i prezzi* con link a Impostazioni.

### Dopo il salvataggio

- Il token resta in `chrome.storage.local` **solo sul profilo browser** in cui hai installato l’estensione.
- Non viene inviato a server di Crometium: le chiamate vanno a `https://api.cardtrader.com`.
- Puoi aggiungere carte alla watchlist e avviare i check prezzi.

## 3. Aggiornare o revocare il token

| Situazione | Cosa fare |
|---|---|
| Hai generato un token nuovo | Incollalo di nuovo in Impostazioni → **Salva token** (sovrascrive il precedente). |
| Sospetti che sia trapelato | Su CardTrader **revoca** il vecchio token, creane uno nuovo, aggiorna Crometium. |
| Cambi PC / profilo Chrome | Reinstalla l’estensione e reinserisci il token (lo storage non si sincronizza da solo). |

## 4. Problemi frequenti

| Sintomo | Causa probabile | Soluzione |
|---|---|---|
| Banner “Manca l’API token…” | Token non salvato | Impostazioni → API Token → Salva |
| Check fallito / errori API | Token errato, scaduto o revocato | Rigenera su CardTrader e risalva |
| “Inserisci il token API” in alert | Campo vuoto al salvataggio | Incolla il token completo (senza spazi extra) |
| Funziona su un Chrome ma non su un altro | Profili / storage diversi | Salva il token in ogni profilo |

## 5. Sicurezza (checklist)

- Tratta il token come una password.
- Non incollarlo in chat, ticket pubblici o screenshot.
- Non metterlo in file del progetto Git.
- Preferisci un token dedicato a Crometium, così puoi revocarlo senza toccare altri tool.
- Se usi anche **Mobile Price Suit**, quella estensione ha un campo token **separato** (`cardtraderApiToken`): va configurato a parte.

## Riferimenti

- [CardTrader — API docs](https://www.cardtrader.com/en/docs/api)
- [CardTrader — API Reference (auth Bearer)](https://www.cardtrader.com/en/docs/api/full/reference)
- [Come funziona Crometium](HOW_IT_WORKS.md)
- [README estensione](../README.md)
