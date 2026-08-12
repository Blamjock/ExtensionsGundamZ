/**
 * Crometium TCG — pricing landing page i18n (classic script).
 * Exposes window.PricingI18n = { SUPPORTED, DEFAULT, t, getLocale, setLocale, detectLocale, applyDom, onChange }
 */
(function (global) {
  "use strict";

  var SUPPORTED = ["it", "en", "es"];
  var DEFAULT = "it";
  var STORAGE_KEY = "crometium_pricing_locale";

  var catalogs = {
    it: {
      "meta.title": "Crometium TCG — Passa a Pro",
      "meta.description":
        "Monitora i prezzi CardTrader. Confronta Free e Pro, paga con PayPal e attiva la license key.",

      "nav.aria": "Sezioni",
      "nav.compare": "Confronta",
      "nav.pricing": "Prezzi",
      "nav.download": "Download",
      "nav.survey": "Sondaggio",
      "nav.buy": "Acquista",
      "nav.activate": "Attiva chiave",

      "hero.title": "Alert prezzi CardTrader, senza perdere il sniper timing.",
      "hero.lead":
        "Free ogni 20 minuti. Pro ogni 3–5 minuti, con scala, dual-channel e auto-cart. Scarica, prova il trial, poi attiva la key.",
      "hero.ctaDownload": "Scarica per Chrome",
      "hero.ctaPricing": "Vedi prezzi Pro",

      "compare.kicker": "Differenze",
      "compare.title": "Velocità e potenza: Free vs Pro",
      "compare.lead":
        "Il polling è il cuore dello sniper: in Free è fisso a 20′. In Pro scegli da 3 a 5 minuti, più canali, auto-cart e grafici lunghi.",
      "compare.speedKicker": "Frequenza check",
      "compare.speedFreeLabel": "Free",
      "compare.speedProLabel": "Pro",
      "compare.speedFreeValue": "ogni 20 min",
      "compare.speedProValue": "ogni 3–5 min",
      "compare.moreTitle": "Altre differenze",
      "compare.thFeature": "Funzionalità",
      "compare.thFree": "Free",
      "compare.thPro": "Pro",
      "compare.watchlist": "Watchlist",
      "compare.watchlistFree": "max 5 carte",
      "compare.watchlistPro": "fino a 100 carte",
      "compare.channels": "Canali CT Zero / Normale",
      "compare.channelsFree": "uno solo alla volta",
      "compare.channelsPro": "entrambi insieme",
      "compare.poll": "Intervallo polling",
      "compare.pollFree": "fisso 20 minuti",
      "compare.pollPro": "da 3 a 5 minuti",
      "compare.alert": "Alert",
      "compare.alertFree": "notifica browser",
      "compare.alertPro": "notifica + suono",
      "compare.autocart": "Auto-cart",
      "compare.autocartPro": "✓ abilitato",
      "compare.charts": "Grafici storico",
      "compare.chartsFree": "solo Giorno",
      "compare.chartsPro": "Giorno / Settimana / Mese",
      "compare.expand": "Watchlist a schermo intero",
      "compare.debug": "Debug API",
      "compare.langs": "Lingue IT / EN / ES",
      "compare.trial": "Trial all’installazione",
      "compare.trialValue": "30 giorni Pro inclusi, poi Free o license key",

      "plans.kicker": "Abbonamenti Pro",
      "plans.title": "Mensile, 3 mesi o 1 anno",
      "plans.lead":
        "Stesse feature Pro su tutti i piani. Offerta di lancio sull’annuale: listino barrato + sconto. Paghi con PayPal e ricevi la key via email.",
      "plans.month.name": "Mensile",
      "plans.month.period": "/ mese",
      "plans.month.equiv": "Flessibile, rinnovo ogni 30 giorni",
      "plans.month.note": "Ideale per provare Pro oltre il trial senza impegno lungo.",
      "plans.month.cta": "Scegli mensile",
      "plans.3m.name": "3 mesi",
      "plans.3m.period": "/ 3 mesi",
      "plans.3m.equivPrefix": "≈ {perMonth}/mese · ",
      "plans.3m.vsMonthly": "vs {amount} a mensili",
      "plans.3m.note": "Perfetto per un set, un deck o un evento in corso.",
      "plans.3m.cta": "Scegli 3 mesi",
      "plans.year.name": "1 anno",
      "plans.year.period": "/ anno",
      "plans.year.equivLaunch": "≈ {perMonth}/mese · offerta di lancio −{pct}%",
      "plans.year.note":
        "Listino {list}, paghi {paid} (risparmi {saved}). License key annuale via email.",
      "plans.year.cta": "Scegli 1 anno",
      "plans.badgeRecommended": "Consigliato",
      "plans.badgeBest": "Best",
      "plans.perMonth": "≈ {amount}/mese",
      "plans.labelMonth": "Crometium TCG Pro — 1 mese",
      "plans.label3m": "Crometium TCG Pro — 3 mesi",
      "plans.labelYear": "Crometium TCG Pro — 12 mesi",
      "plans.optSubMonth": "1 mese di Pro",
      "plans.optSub3m": "≈ {amount}/mese",
      "plans.durationLegend": "Durata abbonamento",

      "download.kicker": "Download",
      "download.title": "Installa Crometium TCG su Chrome",
      "download.lead":
        "Estensione Manifest V3 per Chrome / Chromium. Dopo l’installazione inserisci il token API CardTrader e parti con 30 giorni di trial Pro.",
      "download.getTitle": "Scarica l’app",
      "download.getHint":
        "Quando sarà sullo Store userai un click. Intanto puoi installarla in modalità sviluppatore dal pacchetto ZIP.",
      "download.btnStore": "Chrome Web Store",
      "download.btnZip": "Scarica ZIP",
      "download.count0": "Nessun download ancora.",
      "download.count1": "<strong>1</strong> download",
      "download.countN": "<strong>{n}</strong> download",
      "download.noteNoStore":
        "Chrome Web Store non ancora configurato (imposta CONFIG.chromeStoreUrl). Usa lo ZIP e la guida a fianco.",
      "download.noteStoreOk":
        "Installa in un click dal Chrome Web Store. In alternativa scarica lo ZIP per installazione manuale.",
      "download.noteZipHint":
        " Per lo ZIP: genera con ./pack-store.sh e pubblica l’URL in CONFIG.zipUrl.",
      "download.noteZipMissing":
        "URL ZIP non configurato: imposta CONFIG.zipUrl (es. GitHub Release) oppure carica la cartella Gundam_automata da chrome://extensions.",
      "download.tokenNote":
        "Serve un <b>API token CardTrader</b> (Impostazioni profilo → API). Incollalo nell’estensione e premi Salva. Il token resta in locale sul tuo Chrome.",
      "download.guideTitle": "Guida installazione (Chrome)",
      "download.guideHint":
        "Metodo “Carica estensione non pacchettizzata” — ideale in attesa della pubblicazione sullo Store.",
      "download.s1t": "Scarica e scompatta lo ZIP",
      "download.s1d": "Ottieni la cartella dell’estensione (deve contenere <code>manifest.json</code>).",
      "download.s2t": "Apri le estensioni Chrome",
      "download.s2d": "Nella barra indirizzi vai su chrome://extensions e premi Invio.",
      "download.s3t": "Attiva Modalità sviluppatore",
      "download.s3d": "In alto a destra attiva l’interruttore Modalità sviluppatore.",
      "download.s4t": "Carica non pacchettizzata",
      "download.s4d":
        "Clicca Carica estensione non pacchettizzata e seleziona la cartella scompattata (quella con manifest.json).",
      "download.s5t": "Fissa l’icona e configura",
      "download.s5d":
        "Apri Crometium TCG dal puzzle delle estensioni, inserisci l’API token CardTrader → Salva, poi aggiungi le carte in watchlist.",
      "download.s6t": "(Opzionale) Attiva Pro",
      "download.s6d":
        "Hai 30 giorni di trial. Poi acquista qui sotto e incolla la license key in Impostazioni, oppure usa la sezione Attiva chiave.",
      "download.tip":
        "Suggerimento: lascia Chrome aperto affinché il controllo prezzi (alarm) possa girare. Dopo ogni aggiornamento ZIP, in chrome://extensions premi Aggiorna sull’estensione.",

      "survey.kicker": "Sondaggio",
      "survey.title": "Quanto pagheresti, e per quanto la useresti?",
      "survey.lead":
        "Aiutaci a tarare i prezzi di lancio. Risposte anonime — circa 20 secondi. I risultati locali si aggiornano subito qui a fianco.",
      "survey.q1": "1. Quanto saresti disposto a spendere per Pro?",
      "survey.q2": "2. Per quanto tempo pensi di usarla?",
      "survey.q3": "3. (Opzionale) Quanto spesso snipi / compri su CardTrader?",
      "survey.ariaBudget": "Budget",
      "survey.ariaDuration": "Durata d’uso",
      "survey.ariaFreq": "Frequenza",
      "survey.spend.free_only": "Solo Free / non pagherei",
      "survey.spend.lt3": "Meno di €3 / mese",
      "survey.spend.3_5": "€3–5 / mese",
      "survey.spend.5_8": "€5–8 / mese",
      "survey.spend.gt8": "Più di €8 / mese",
      "survey.spend.year_24_30": "Preferisco ~€24–30 una volta l’anno",
      "survey.duration.1m": "1 mese (prova)",
      "survey.duration.3m": "3 mesi (un set / deck)",
      "survey.duration.6m": "6 mesi",
      "survey.duration.12m": "1 anno",
      "survey.duration.ongoing": "Finché compro carte",
      "survey.duration.unsure": "Non so ancora",
      "survey.frequency.rare": "Raro (qualche volta l’anno)",
      "survey.frequency.monthly": "Ogni mese",
      "survey.frequency.weekly": "Ogni settimana",
      "survey.frequency.daily": "Quasi ogni giorno",
      "survey.noteLabel": "Commento libero (opzionale)",
      "survey.notePlaceholder": "Es. mi interessa soprattutto l’auto-cart…",
      "survey.submit": "Invia risposta",
      "survey.thanksTitle": "Grazie — risposta registrata",
      "survey.thanksBody":
        "Puoi comunque <a href=\"#piani\">vedere i prezzi</a> o <a href=\"#download\">installare</a> l’estensione. Il trial Pro è di 30 giorni.",
      "survey.resultsTitle": "Risultati (questo browser)",
      "survey.resultsHint":
        "Conteggio anonimo salvato in locale. Con surveyApiUrl le risposte vanno anche al tuo backend.",
      "survey.budgetDeclared": "Budget dichiarato",
      "survey.durationDeclared": "Durata d’uso",
      "survey.count0": "Nessuna risposta ancora su questo browser.",
      "survey.count1": "1 risposta raccolta su questo browser.",
      "survey.countN": "{n} risposte raccolte su questo browser.",
      "survey.errNeed": "Scegli budget e durata d’uso.",
      "survey.sending": "Invio in corso…",
      "survey.okSent": "Grazie! Risposta inviata.",
      "survey.okLocal": "Grazie! Risposta salvata in questo browser.",
      "survey.warnLocal":
        "Salvata in locale; invio server non riuscito. Riprova più tardi se tipico.",

      "checkout.kicker": "Checkout",
      "checkout.title": "Registrati e paga con PayPal",
      "checkout.lead":
        "Scegli la durata, inserisci i dati e completa il pagamento: la license key arriva via email.",
      "checkout.panelTitle": "Abbonamento e dati",
      "checkout.panelHint":
        "Useremo l’email solo per consegnare la license key e assistenza sull’ordine.",
      "checkout.durationLegend": "Durata abbonamento",
      "checkout.name": "Nome e cognome",
      "checkout.namePh": "Mario Rossi",
      "checkout.nameErr": "Inserisci il nome",
      "checkout.email": "Email",
      "checkout.emailPh": "tu@email.com",
      "checkout.emailErr": "Inserisci un’email valida",
      "checkout.email2": "Conferma email",
      "checkout.email2Ph": "Ripeti l’email",
      "checkout.email2Err": "Le email non coincidono",
      "checkout.paypalGate": "Compila il form per abilitare PayPal.",
      "checkout.paypalReady": "PayPal pronto — completa il pagamento.",
      "checkout.step1t": "Registrati",
      "checkout.step1d": "Nome ed email dove ricevere la chiave.",
      "checkout.step2t": "Paga con PayPal",
      "checkout.step2d": "Checkout sicuro. Nessuna carta gestita da questa pagina.",
      "checkout.step3t": "Ricevi la key via email",
      "checkout.step3d": "Di solito entro pochi minuti dopo la conferma pagamento.",
      "checkout.step4t": "Attiva nell’estensione",
      "checkout.step4d": "Impostazioni → incolla la key → Attiva. Oppure usa il box qui sotto.",
      "checkout.devNote":
        "In sviluppo, senza PayPal Client ID configurato, puoi usare il pulsante di simulazione (non genera una chiave reale). In produzione il backend crea la licenza dal webhook PayPal e la invia all’email indicata.",

      "activate.kicker": "Licenza",
      "activate.title": "Hai già una chiave? Attivala",
      "activate.lead":
        "Incolla la license key ricevuta via email. Preferibilmente attivala dal popup dell’estensione (tab Impostazioni); qui sotto puoi verificare la key se l’API è configurata.",
      "activate.panelTitle": "Attiva license key",
      "activate.hint": "Formato tipico: XXXX-XXXX-XXXX",
      "activate.keyLabel": "License key",
      "activate.keyPh": "PRO-…",
      "activate.keyErr": "Inserisci una license key",
      "activate.submit": "Verifica / attiva",
      "activate.chromeTitle": "Nell’estensione Chrome",
      "activate.chromeHint": "Il modo consigliato per sbloccare Pro sul browser:",
      "activate.s1t": "Apri Crometium TCG",
      "activate.s1d": "Clicca l’icona dell’estensione.",
      "activate.s2t": "Vai su Impostazioni",
      "activate.s2d": "Sezione licenza Pro.",
      "activate.s3t": "Incolla e Attiva",
      "activate.s3d": "Il badge passerà a Pro se la key è valida.",

      "footer.tagline": "<strong>Crometium TCG</strong> — price alerts per CardTrader",
      "footer.pricing":
        "Pro da {month}/mese · 3 mesi {three} · anno {year} (−{pct}% su {list}) · PayPal · key via email",

      "msg.paypalDev": "PayPal Client ID non configurato: modalità sviluppo attiva.",
      "msg.paypalMissing": "Checkout non disponibile: manca la configurazione PayPal.",
      "msg.paypalFill": "Compila correttamente nome ed email.",
      "msg.paypalFillBefore": "Compila nome ed email prima di pagare.",
      "msg.paypalSimBtn": "Simula pagamento PayPal (dev)",
      "msg.paypalSim":
        "Simulazione OK — {plan} per {email}. In produzione PayPal + webhook inviano la chiave reale.",
      "msg.paypalOk":
        "Pagamento riuscito. Controlla {email} per la license key (anche spam).",
      "msg.paypalCaptureFail":
        "Pagamento catturato ma consegna chiave non confermata. Contattaci con l’ID ordine PayPal.",
      "msg.paypalErr": "Errore PayPal. Riprova tra poco.",
      "msg.paypalCancel": "Pagamento annullato.",
      "msg.activateEmpty": "Inserisci una license key.",
      "msg.activateNoApi":
        "API non configurata su questa pagina. Apri Crometium TCG → Impostazioni, incolla la key e premi Attiva. In dev funziona anche PRO-DEV-…",
      "msg.activateChecking": "Verifica in corso…",
      "msg.activateOk":
        "Chiave valida. Ora attivala anche nel popup dell’estensione per sbloccare Pro su Chrome.",
      "msg.activateBad": "Chiave non valida o scaduta ({status}).",
      "msg.activateNet": "Errore di rete verso l’API licenze.",
      "msg.orderNoApi":
        "Pagamento registrato in pagina. Configura orderApiUrl sul server per generare e inviare la license key via email.",
      "msg.launchOffer": "Offerta di lancio −{pct}% (−{saved})",

      "lang.label": "Lingua"
    },

    en: {
      "meta.title": "Crometium TCG — Go Pro",
      "meta.description":
        "Track CardTrader prices. Compare Free and Pro, pay with PayPal, and activate your license key.",

      "nav.aria": "Sections",
      "nav.compare": "Compare",
      "nav.pricing": "Pricing",
      "nav.download": "Download",
      "nav.survey": "Survey",
      "nav.buy": "Buy",
      "nav.activate": "Activate key",

      "hero.title": "CardTrader price alerts — without missing sniper timing.",
      "hero.lead":
        "Free every 20 minutes. Pro every 3–5 minutes, with scale, dual-channel, and auto-cart. Download, try the trial, then activate your key.",
      "hero.ctaDownload": "Download for Chrome",
      "hero.ctaPricing": "See Pro pricing",

      "compare.kicker": "Differences",
      "compare.title": "Speed and power: Free vs Pro",
      "compare.lead":
        "Polling is the sniper core: Free is fixed at 20′. Pro lets you choose 3–5 minutes, plus channels, auto-cart, and longer charts.",
      "compare.speedKicker": "Check frequency",
      "compare.speedFreeLabel": "Free",
      "compare.speedProLabel": "Pro",
      "compare.speedFreeValue": "every 20 min",
      "compare.speedProValue": "every 3–5 min",
      "compare.moreTitle": "Other differences",
      "compare.thFeature": "Feature",
      "compare.thFree": "Free",
      "compare.thPro": "Pro",
      "compare.watchlist": "Watchlist",
      "compare.watchlistFree": "max 5 cards",
      "compare.watchlistPro": "up to 100 cards",
      "compare.channels": "CT Zero / Normal channels",
      "compare.channelsFree": "one at a time",
      "compare.channelsPro": "both together",
      "compare.poll": "Polling interval",
      "compare.pollFree": "fixed 20 minutes",
      "compare.pollPro": "from 3 to 5 minutes",
      "compare.alert": "Alerts",
      "compare.alertFree": "browser notification",
      "compare.alertPro": "notification + sound",
      "compare.autocart": "Auto-cart",
      "compare.autocartPro": "✓ enabled",
      "compare.charts": "Price history charts",
      "compare.chartsFree": "Day only",
      "compare.chartsPro": "Day / Week / Month",
      "compare.expand": "Full-screen watchlist",
      "compare.debug": "API debug",
      "compare.langs": "Languages IT / EN / ES",
      "compare.trial": "Trial on install",
      "compare.trialValue": "30 days of Pro included, then Free or a license key",

      "plans.kicker": "Pro subscriptions",
      "plans.title": "Monthly, 3 months, or 1 year",
      "plans.lead":
        "Same Pro features on every plan. Launch offer on annual: strikethrough list price + discount. Pay with PayPal and get the key by email.",
      "plans.month.name": "Monthly",
      "plans.month.period": "/ month",
      "plans.month.equiv": "Flexible — renews every 30 days",
      "plans.month.note": "Ideal to try Pro beyond the trial without a long commitment.",
      "plans.month.cta": "Choose monthly",
      "plans.3m.name": "3 months",
      "plans.3m.period": "/ 3 months",
      "plans.3m.equivPrefix": "≈ {perMonth}/mo · ",
      "plans.3m.vsMonthly": "vs {amount} monthly",
      "plans.3m.note": "Perfect for a set, a deck, or an event in progress.",
      "plans.3m.cta": "Choose 3 months",
      "plans.year.name": "1 year",
      "plans.year.period": "/ year",
      "plans.year.equivLaunch": "≈ {perMonth}/mo · launch offer −{pct}%",
      "plans.year.note":
        "List {list}, you pay {paid} (save {saved}). Annual key by email.",
      "plans.year.cta": "Choose 1 year",
      "plans.badgeRecommended": "Recommended",
      "plans.badgeBest": "Best",
      "plans.perMonth": "≈ {amount}/mo",
      "plans.labelMonth": "Crometium TCG Pro — 1 month",
      "plans.label3m": "Crometium TCG Pro — 3 months",
      "plans.labelYear": "Crometium TCG Pro — 12 months",
      "plans.optSubMonth": "1 month of Pro",
      "plans.optSub3m": "≈ {amount}/mo",
      "plans.durationLegend": "Subscription length",

      "download.kicker": "Download",
      "download.title": "Install Crometium TCG on Chrome",
      "download.lead":
        "Manifest V3 extension for Chrome / Chromium. After install, add your CardTrader API token and start with 30 days of Pro trial.",
      "download.getTitle": "Get the app",
      "download.getHint":
        "When it’s on the Store, one click will do. Until then you can install in developer mode from the ZIP package.",
      "download.btnStore": "Chrome Web Store",
      "download.btnZip": "Download ZIP",
      "download.count0": "No downloads yet.",
      "download.count1": "<strong>1</strong> download",
      "download.countN": "<strong>{n}</strong> downloads",
      "download.noteNoStore":
        "Chrome Web Store not configured yet (set CONFIG.chromeStoreUrl). Use the ZIP and the guide beside this panel.",
      "download.noteStoreOk":
        "Install in one click from the Chrome Web Store. Or download the ZIP for a manual install.",
      "download.noteZipHint":
        " For the ZIP: build with ./pack-store.sh and publish the URL in CONFIG.zipUrl.",
      "download.noteZipMissing":
        "ZIP URL not configured: set CONFIG.zipUrl (e.g. GitHub Release) or load the Gundam_automata folder from chrome://extensions.",
      "download.tokenNote":
        "You need a <b>CardTrader API token</b> (Profile settings → API). Paste it in the extension and press Save. The token stays local in your Chrome.",
      "download.guideTitle": "Install guide (Chrome)",
      "download.guideHint":
        "“Load unpacked” method — ideal while waiting for Store publication.",
      "download.s1t": "Download and unzip the ZIP",
      "download.s1d": "You get the extension folder (it must contain <code>manifest.json</code>).",
      "download.s2t": "Open Chrome extensions",
      "download.s2d": "In the address bar go to chrome://extensions and press Enter.",
      "download.s3t": "Turn on Developer mode",
      "download.s3d": "Top right, enable the Developer mode toggle.",
      "download.s4t": "Load unpacked",
      "download.s4d":
        "Click Load unpacked and select the unzipped folder (the one with manifest.json).",
      "download.s5t": "Pin the icon and configure",
      "download.s5d":
        "Open Crometium TCG from the extensions puzzle, enter your CardTrader API token → Save, then add cards to the watchlist.",
      "download.s6t": "(Optional) Activate Pro",
      "download.s6d":
        "You get 30 days of trial. Then buy below and paste the license key in Settings, or use the Activate key section.",
      "download.tip":
        "Tip: leave Chrome open so price checks (alarms) can run. After each ZIP update, in chrome://extensions press Reload on the extension.",

      "survey.kicker": "Survey",
      "survey.title": "What would you pay, and for how long would you use it?",
      "survey.lead":
        "Help us tune launch pricing. Anonymous answers — about 20 seconds. Local results update instantly beside this form.",
      "survey.q1": "1. How much would you spend for Pro?",
      "survey.q2": "2. How long do you expect to use it?",
      "survey.q3": "3. (Optional) How often do you snipe / buy on CardTrader?",
      "survey.ariaBudget": "Budget",
      "survey.ariaDuration": "Usage duration",
      "survey.ariaFreq": "Frequency",
      "survey.spend.free_only": "Free only / I wouldn’t pay",
      "survey.spend.lt3": "Less than €3 / month",
      "survey.spend.3_5": "€3–5 / month",
      "survey.spend.5_8": "€5–8 / month",
      "survey.spend.gt8": "More than €8 / month",
      "survey.spend.year_24_30": "I prefer ~€24–30 once a year",
      "survey.duration.1m": "1 month (trial)",
      "survey.duration.3m": "3 months (one set / deck)",
      "survey.duration.6m": "6 months",
      "survey.duration.12m": "1 year",
      "survey.duration.ongoing": "As long as I buy cards",
      "survey.duration.unsure": "Not sure yet",
      "survey.frequency.rare": "Rarely (a few times a year)",
      "survey.frequency.monthly": "Every month",
      "survey.frequency.weekly": "Every week",
      "survey.frequency.daily": "Almost every day",
      "survey.noteLabel": "Free comment (optional)",
      "survey.notePlaceholder": "e.g. I care most about auto-cart…",
      "survey.submit": "Submit answer",
      "survey.thanksTitle": "Thanks — response recorded",
      "survey.thanksBody":
        "You can still <a href=\"#piani\">see pricing</a> or <a href=\"#download\">install</a> the extension. The Pro trial is 30 days.",
      "survey.resultsTitle": "Results (this browser)",
      "survey.resultsHint":
        "Anonymous count saved locally. With surveyApiUrl, answers also go to your backend.",
      "survey.budgetDeclared": "Declared budget",
      "survey.durationDeclared": "Usage duration",
      "survey.count0": "No responses yet in this browser.",
      "survey.count1": "1 response collected in this browser.",
      "survey.countN": "{n} responses collected in this browser.",
      "survey.errNeed": "Choose budget and usage duration.",
      "survey.sending": "Sending…",
      "survey.okSent": "Thanks! Response sent.",
      "survey.okLocal": "Thanks! Response saved in this browser.",
      "survey.warnLocal":
        "Saved locally; server send failed. Try again later if this keeps happening.",

      "checkout.kicker": "Checkout",
      "checkout.title": "Sign up and pay with PayPal",
      "checkout.lead":
        "Pick a duration, enter your details, and complete payment — the license key arrives by email.",
      "checkout.panelTitle": "Subscription & details",
      "checkout.panelHint":
        "We’ll use your email only to deliver the license key and help with the order.",
      "checkout.durationLegend": "Subscription length",
      "checkout.name": "Full name",
      "checkout.namePh": "Jane Doe",
      "checkout.nameErr": "Enter your name",
      "checkout.email": "Email",
      "checkout.emailPh": "you@email.com",
      "checkout.emailErr": "Enter a valid email",
      "checkout.email2": "Confirm email",
      "checkout.email2Ph": "Repeat your email",
      "checkout.email2Err": "Emails do not match",
      "checkout.paypalGate": "Fill in the form to enable PayPal.",
      "checkout.paypalReady": "PayPal ready — complete payment.",
      "checkout.step1t": "Sign up",
      "checkout.step1d": "Name and email where you’ll receive the key.",
      "checkout.step2t": "Pay with PayPal",
      "checkout.step2d": "Secure checkout. This page never handles your card.",
      "checkout.step3t": "Get the key by email",
      "checkout.step3d": "Usually within a few minutes after payment confirmation.",
      "checkout.step4t": "Activate in the extension",
      "checkout.step4d": "Settings → paste the key → Activate. Or use the box below.",
      "checkout.devNote":
        "In development, without a PayPal Client ID, you can use the simulation button (it does not create a real key). In production the backend creates the license from the PayPal webhook and emails it.",

      "activate.kicker": "License",
      "activate.title": "Already have a key? Activate it",
      "activate.lead":
        "Paste the license key from your email. Prefer activating from the extension popup (Settings tab); below you can verify the key if the API is configured.",
      "activate.panelTitle": "Activate license key",
      "activate.hint": "Typical format: XXXX-XXXX-XXXX",
      "activate.keyLabel": "License key",
      "activate.keyPh": "PRO-…",
      "activate.keyErr": "Enter a license key",
      "activate.submit": "Verify / activate",
      "activate.chromeTitle": "In the Chrome extension",
      "activate.chromeHint": "The recommended way to unlock Pro in the browser:",
      "activate.s1t": "Open Crometium TCG",
      "activate.s1d": "Click the extension icon.",
      "activate.s2t": "Go to Settings",
      "activate.s2d": "Pro license section.",
      "activate.s3t": "Paste and Activate",
      "activate.s3d": "The badge switches to Pro if the key is valid.",

      "footer.tagline": "<strong>Crometium TCG</strong> — price alerts for CardTrader",
      "footer.pricing":
        "Pro from {month}/mo · 3 mo {three} · year {year} (−{pct}% on {list}) · PayPal · key via email",

      "msg.paypalDev": "PayPal Client ID not configured: development mode active.",
      "msg.paypalMissing": "Checkout unavailable: PayPal is not configured.",
      "msg.paypalFill": "Please fill in name and email correctly.",
      "msg.paypalFillBefore": "Enter name and email before paying.",
      "msg.paypalSimBtn": "Simulate PayPal payment (dev)",
      "msg.paypalSim":
        "Simulation OK — {plan} for {email}. In production PayPal + webhook send the real key.",
      "msg.paypalOk":
        "Payment successful. Check {email} for the license key (including spam).",
      "msg.paypalCaptureFail":
        "Payment captured but key delivery not confirmed. Contact us with your PayPal order ID.",
      "msg.paypalErr": "PayPal error. Try again shortly.",
      "msg.paypalCancel": "Payment cancelled.",
      "msg.activateEmpty": "Enter a license key.",
      "msg.activateNoApi":
        "API not configured on this page. Open Crometium TCG → Settings, paste the key and press Activate. In dev, PRO-DEV-… also works.",
      "msg.activateChecking": "Checking…",
      "msg.activateOk":
        "Key valid. Now activate it in the extension popup as well to unlock Pro on Chrome.",
      "msg.activateBad": "Invalid or expired key ({status}).",
      "msg.activateNet": "Network error reaching the license API.",
      "msg.orderNoApi":
        "Payment recorded on this page. Configure orderApiUrl on the server to generate and email the license key.",
      "msg.launchOffer": "Launch offer −{pct}% (−{saved})",

      "lang.label": "Language"
    },

    es: {
      "meta.title": "Crometium TCG — Pasa a Pro",
      "meta.description":
        "Controla precios de CardTrader. Compara Free y Pro, paga con PayPal y activa tu license key.",

      "nav.aria": "Secciones",
      "nav.compare": "Comparar",
      "nav.pricing": "Precios",
      "nav.download": "Descarga",
      "nav.survey": "Encuesta",
      "nav.buy": "Comprar",
      "nav.activate": "Activar clave",

      "hero.title": "Alertas de precio en CardTrader, sin perder el sniper timing.",
      "hero.lead":
        "Free cada 20 minutos. Pro cada 3–5 minutos, con escala, dual-channel y auto-cart. Descarga, prueba el trial y activa la key.",
      "hero.ctaDownload": "Descargar para Chrome",
      "hero.ctaPricing": "Ver precios Pro",

      "compare.kicker": "Diferencias",
      "compare.title": "Velocidad y potencia: Free vs Pro",
      "compare.lead":
        "El polling es el núcleo del sniper: en Free es fijo a 20′. En Pro eliges de 3 a 5 minutos, más canales, auto-cart y gráficos largos.",
      "compare.speedKicker": "Frecuencia de check",
      "compare.speedFreeLabel": "Free",
      "compare.speedProLabel": "Pro",
      "compare.speedFreeValue": "cada 20 min",
      "compare.speedProValue": "cada 3–5 min",
      "compare.moreTitle": "Otras diferencias",
      "compare.thFeature": "Función",
      "compare.thFree": "Free",
      "compare.thPro": "Pro",
      "compare.watchlist": "Watchlist",
      "compare.watchlistFree": "máx. 5 cartas",
      "compare.watchlistPro": "hasta 100 cartas",
      "compare.channels": "Canales CT Zero / Normal",
      "compare.channelsFree": "uno a la vez",
      "compare.channelsPro": "ambos a la vez",
      "compare.poll": "Intervalo de polling",
      "compare.pollFree": "fijo 20 minutos",
      "compare.pollPro": "de 3 a 5 minutos",
      "compare.alert": "Alertas",
      "compare.alertFree": "notificación del navegador",
      "compare.alertPro": "notificación + sonido",
      "compare.autocart": "Auto-cart",
      "compare.autocartPro": "✓ activado",
      "compare.charts": "Gráficos de historial",
      "compare.chartsFree": "solo Día",
      "compare.chartsPro": "Día / Semana / Mes",
      "compare.expand": "Watchlist a pantalla completa",
      "compare.debug": "Debug API",
      "compare.langs": "Idiomas IT / EN / ES",
      "compare.trial": "Prueba al instalar",
      "compare.trialValue": "30 días de Pro incluidos, luego Free o license key",

      "plans.kicker": "Suscripciones Pro",
      "plans.title": "Mensual, 3 meses o 1 año",
      "plans.lead":
        "Las mismas funciones Pro en todos los planes. Oferta de lanzamiento en el anual: precio de lista tachado + descuento. Pagas con PayPal y recibes la key por email.",
      "plans.month.name": "Mensual",
      "plans.month.period": "/ mes",
      "plans.month.equiv": "Flexible, renovación cada 30 días",
      "plans.month.note": "Ideal para probar Pro más allá del trial sin compromiso largo.",
      "plans.month.cta": "Elegir mensual",
      "plans.3m.name": "3 meses",
      "plans.3m.period": "/ 3 meses",
      "plans.3m.equivPrefix": "≈ {perMonth}/mes · ",
      "plans.3m.vsMonthly": "vs {amount} al mes",
      "plans.3m.note": "Perfecto para un set, un mazo o un evento en curso.",
      "plans.3m.cta": "Elegir 3 meses",
      "plans.year.name": "1 año",
      "plans.year.period": "/ año",
      "plans.year.equivLaunch": "≈ {perMonth}/mes · oferta de lanzamiento −{pct}%",
      "plans.year.note":
        "Lista {list}, pagas {paid} (ahorras {saved}). Clave anual por email.",
      "plans.year.cta": "Elegir 1 año",
      "plans.badgeRecommended": "Recomendado",
      "plans.badgeBest": "Best",
      "plans.perMonth": "≈ {amount}/mes",
      "plans.labelMonth": "Crometium TCG Pro — 1 mes",
      "plans.label3m": "Crometium TCG Pro — 3 meses",
      "plans.labelYear": "Crometium TCG Pro — 12 meses",
      "plans.optSubMonth": "1 mes de Pro",
      "plans.optSub3m": "≈ {amount}/mes",
      "plans.durationLegend": "Duración de la suscripción",

      "download.kicker": "Descarga",
      "download.title": "Instala Crometium TCG en Chrome",
      "download.lead":
        "Extensión Manifest V3 para Chrome / Chromium. Tras instalar, introduce el token API de CardTrader y empieza con 30 días de trial Pro.",
      "download.getTitle": "Descarga la app",
      "download.getHint":
        "Cuando esté en la Store bastará un clic. Mientras tanto puedes instalarla en modo desarrollador con el ZIP.",
      "download.btnStore": "Chrome Web Store",
      "download.btnZip": "Descargar ZIP",
      "download.count0": "Aún no hay descargas.",
      "download.count1": "<strong>1</strong> descarga",
      "download.countN": "<strong>{n}</strong> descargas",
      "download.noteNoStore":
        "Chrome Web Store aún no configurado (define CONFIG.chromeStoreUrl). Usa el ZIP y la guía de al lado.",
      "download.noteStoreOk":
        "Instala en un clic desde Chrome Web Store. O descarga el ZIP para instalación manual.",
      "download.noteZipHint":
        " Para el ZIP: genera con ./pack-store.sh y publica la URL en CONFIG.zipUrl.",
      "download.noteZipMissing":
        "URL del ZIP no configurada: define CONFIG.zipUrl (p. ej. GitHub Release) o carga la carpeta Gundam_automata desde chrome://extensions.",
      "download.tokenNote":
        "Necesitas un <b>token API de CardTrader</b> (Ajustes del perfil → API). Pégalo en la extensión y pulsa Guardar. El token permanece en local en tu Chrome.",
      "download.guideTitle": "Guía de instalación (Chrome)",
      "download.guideHint":
        "Método “Cargar extensión sin empaquetar” — ideal mientras esperas la publicación en la Store.",
      "download.s1t": "Descarga y descomprime el ZIP",
      "download.s1d": "Obtienes la carpeta de la extensión (debe contener <code>manifest.json</code>).",
      "download.s2t": "Abre las extensiones de Chrome",
      "download.s2d": "En la barra de direcciones ve a chrome://extensions y pulsa Intro.",
      "download.s3t": "Activa el modo de desarrollador",
      "download.s3d": "Arriba a la derecha, activa el interruptor Modo de desarrollador.",
      "download.s4t": "Cargar sin empaquetar",
      "download.s4d":
        "Haz clic en Cargar extensión sin empaquetar y selecciona la carpeta descomprimida (la que tiene manifest.json).",
      "download.s5t": "Fija el icono y configura",
      "download.s5d":
        "Abre Crometium TCG desde el puzzle de extensiones, introduce el token API de CardTrader → Guardar, luego añade cartas a la watchlist.",
      "download.s6t": "(Opcional) Activa Pro",
      "download.s6d":
        "Tienes 30 días de trial. Luego compra abajo y pega la license key en Ajustes, o usa la sección Activar clave.",
      "download.tip":
        "Consejo: deja Chrome abierto para que el control de precios (alarm) pueda ejecutarse. Tras cada actualización ZIP, en chrome://extensions pulsa Actualizar en la extensión.",

      "survey.kicker": "Encuesta",
      "survey.title": "¿Cuánto pagarías y durante cuánto tiempo la usarías?",
      "survey.lead":
        "Ayúdanos a ajustar los precios de lanzamiento. Respuestas anónimas — unos 20 segundos. Los resultados locales se actualizan al instante aquí al lado.",
      "survey.q1": "1. ¿Cuánto estarías dispuesto a gastar en Pro?",
      "survey.q2": "2. ¿Durante cuánto tiempo crees que la usarías?",
      "survey.q3": "3. (Opcional) ¿Con qué frecuencia snipas / compras en CardTrader?",
      "survey.ariaBudget": "Presupuesto",
      "survey.ariaDuration": "Duración de uso",
      "survey.ariaFreq": "Frecuencia",
      "survey.spend.free_only": "Solo Free / no pagaría",
      "survey.spend.lt3": "Menos de €3 / mes",
      "survey.spend.3_5": "€3–5 / mes",
      "survey.spend.5_8": "€5–8 / mes",
      "survey.spend.gt8": "Más de €8 / mes",
      "survey.spend.year_24_30": "Prefiero ~€24–30 una vez al año",
      "survey.duration.1m": "1 mes (prueba)",
      "survey.duration.3m": "3 meses (un set / mazo)",
      "survey.duration.6m": "6 meses",
      "survey.duration.12m": "1 año",
      "survey.duration.ongoing": "Mientras compre cartas",
      "survey.duration.unsure": "Aún no lo sé",
      "survey.frequency.rare": "Raro (algunas veces al año)",
      "survey.frequency.monthly": "Cada mes",
      "survey.frequency.weekly": "Cada semana",
      "survey.frequency.daily": "Casi cada día",
      "survey.noteLabel": "Comentario libre (opcional)",
      "survey.notePlaceholder": "Ej. me interesa sobre todo el auto-cart…",
      "survey.submit": "Enviar respuesta",
      "survey.thanksTitle": "Gracias — respuesta registrada",
      "survey.thanksBody":
        "Aun así puedes <a href=\"#piani\">ver los precios</a> o <a href=\"#download\">instalar</a> la extensión. El trial Pro es de 30 días.",
      "survey.resultsTitle": "Resultados (este navegador)",
      "survey.resultsHint":
        "Conteo anónimo guardado en local. Con surveyApiUrl las respuestas también van a tu backend.",
      "survey.budgetDeclared": "Presupuesto declarado",
      "survey.durationDeclared": "Duración de uso",
      "survey.count0": "Aún no hay respuestas en este navegador.",
      "survey.count1": "1 respuesta recogida en este navegador.",
      "survey.countN": "{n} respuestas recogidas en este navegador.",
      "survey.errNeed": "Elige presupuesto y duración de uso.",
      "survey.sending": "Enviando…",
      "survey.okSent": "¡Gracias! Respuesta enviada.",
      "survey.okLocal": "¡Gracias! Respuesta guardada en este navegador.",
      "survey.warnLocal":
        "Guardada en local; el envío al servidor falló. Inténtalo más tarde si se repite.",

      "checkout.kicker": "Checkout",
      "checkout.title": "Regístrate y paga con PayPal",
      "checkout.lead":
        "Elige la duración, introduce tus datos y completa el pago: la license key llega por email.",
      "checkout.panelTitle": "Suscripción y datos",
      "checkout.panelHint":
        "Usaremos el email solo para entregar la license key y ayudar con el pedido.",
      "checkout.durationLegend": "Duración de la suscripción",
      "checkout.name": "Nombre y apellidos",
      "checkout.namePh": "María García",
      "checkout.nameErr": "Introduce el nombre",
      "checkout.email": "Email",
      "checkout.emailPh": "tu@email.com",
      "checkout.emailErr": "Introduce un email válido",
      "checkout.email2": "Confirmar email",
      "checkout.email2Ph": "Repite el email",
      "checkout.email2Err": "Los emails no coinciden",
      "checkout.paypalGate": "Completa el formulario para habilitar PayPal.",
      "checkout.paypalReady": "PayPal listo — completa el pago.",
      "checkout.step1t": "Regístrate",
      "checkout.step1d": "Nombre y email donde recibir la clave.",
      "checkout.step2t": "Paga con PayPal",
      "checkout.step2d": "Checkout seguro. Esta página no gestiona tu tarjeta.",
      "checkout.step3t": "Recibe la key por email",
      "checkout.step3d": "Normalmente en pocos minutos tras confirmar el pago.",
      "checkout.step4t": "Activa en la extensión",
      "checkout.step4d": "Ajustes → pega la key → Activar. O usa el cuadro de abajo.",
      "checkout.devNote":
        "En desarrollo, sin PayPal Client ID, puedes usar el botón de simulación (no genera una clave real). En producción el backend crea la licencia desde el webhook de PayPal y la envía al email indicado.",

      "activate.kicker": "Licencia",
      "activate.title": "¿Ya tienes una clave? Actívala",
      "activate.lead":
        "Pega la license key recibida por email. Preferiblemente actívala desde el popup de la extensión (pestaña Ajustes); abajo puedes verificar la key si la API está configurada.",
      "activate.panelTitle": "Activar license key",
      "activate.hint": "Formato típico: XXXX-XXXX-XXXX",
      "activate.keyLabel": "License key",
      "activate.keyPh": "PRO-…",
      "activate.keyErr": "Introduce una license key",
      "activate.submit": "Verificar / activar",
      "activate.chromeTitle": "En la extensión de Chrome",
      "activate.chromeHint": "La forma recomendada de desbloquear Pro en el navegador:",
      "activate.s1t": "Abre Crometium TCG",
      "activate.s1d": "Haz clic en el icono de la extensión.",
      "activate.s2t": "Ve a Ajustes",
      "activate.s2d": "Sección de licencia Pro.",
      "activate.s3t": "Pega y Activa",
      "activate.s3d": "El badge pasará a Pro si la key es válida.",

      "footer.tagline": "<strong>Crometium TCG</strong> — alertas de precio para CardTrader",
      "footer.pricing":
        "Pro desde {month}/mes · 3 meses {three} · año {year} (−{pct}% sobre {list}) · PayPal · key por email",

      "msg.paypalDev": "PayPal Client ID no configurado: modo desarrollo activo.",
      "msg.paypalMissing": "Checkout no disponible: falta la configuración de PayPal.",
      "msg.paypalFill": "Completa correctamente nombre y email.",
      "msg.paypalFillBefore": "Completa nombre y email antes de pagar.",
      "msg.paypalSimBtn": "Simular pago PayPal (dev)",
      "msg.paypalSim":
        "Simulación OK — {plan} para {email}. En producción PayPal + webhook envían la clave real.",
      "msg.paypalOk":
        "Pago correcto. Revisa {email} para la license key (también spam).",
      "msg.paypalCaptureFail":
        "Pago capturado pero la entrega de la clave no está confirmada. Contáctanos con el ID de pedido de PayPal.",
      "msg.paypalErr": "Error de PayPal. Inténtalo de nuevo en un momento.",
      "msg.paypalCancel": "Pago cancelado.",
      "msg.activateEmpty": "Introduce una license key.",
      "msg.activateNoApi":
        "API no configurada en esta página. Abre Crometium TCG → Ajustes, pega la key y pulsa Activar. En dev también funciona PRO-DEV-…",
      "msg.activateChecking": "Verificando…",
      "msg.activateOk":
        "Clave válida. Ahora actívala también en el popup de la extensión para desbloquear Pro en Chrome.",
      "msg.activateBad": "Clave no válida o caducada ({status}).",
      "msg.activateNet": "Error de red hacia la API de licencias.",
      "msg.orderNoApi":
        "Pago registrado en la página. Configura orderApiUrl en el servidor para generar y enviar la license key por email.",
      "msg.launchOffer": "Oferta de lanzamiento −{pct}% (−{saved})",

      "lang.label": "Idioma"
    }
  };

  var currentLocale = DEFAULT;
  var listeners = [];

  function normalizeLocale(code) {
    var c = String(code || "")
      .toLowerCase()
      .slice(0, 2);
    return SUPPORTED.indexOf(c) >= 0 ? c : null;
  }

  function getCatalog(locale) {
    return catalogs[locale] || catalogs[DEFAULT];
  }

  function t(key, params) {
    var cat = getCatalog(currentLocale);
    var str = cat[key];
    if (str == null && currentLocale !== DEFAULT) {
      str = catalogs[DEFAULT][key];
    }
    if (str == null) str = key;
    if (params && typeof params === "object") {
      Object.keys(params).forEach(function (k) {
        str = String(str).split("{" + k + "}").join(String(params[k]));
      });
    }
    return String(str);
  }

  function getLocale() {
    return currentLocale;
  }

  function applyDom() {
    if (typeof document === "undefined") return;

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      if (!key) return;
      el.textContent = t(key);
    });

    document.querySelectorAll("[data-i18n-html]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-html");
      if (!key) return;
      el.innerHTML = t(key);
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-placeholder");
      if (!key) return;
      el.setAttribute("placeholder", t(key));
    });

    document.querySelectorAll("[data-i18n-aria]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-aria");
      if (!key) return;
      el.setAttribute("aria-label", t(key));
    });

    document.title = t("meta.title");

    var metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute("content", t("meta.description"));

    document.documentElement.lang = currentLocale;
  }

  function notifyListeners() {
    listeners.slice().forEach(function (fn) {
      try {
        fn(currentLocale);
      } catch (err) {
        console.error("PricingI18n onChange:", err);
      }
    });
  }

  function setLocale(code) {
    var locale = normalizeLocale(code) || DEFAULT;
    currentLocale = locale;
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch (_) {}
    applyDom();
    notifyListeners();
    return locale;
  }

  function detectLocale() {
    var fromUrl = null;
    try {
      var params = new URLSearchParams(global.location && global.location.search);
      fromUrl = normalizeLocale(params.get("lang"));
    } catch (_) {}
    if (fromUrl) return fromUrl;

    try {
      var stored = normalizeLocale(localStorage.getItem(STORAGE_KEY));
      if (stored) return stored;
    } catch (_) {}

    var raw =
      (typeof navigator !== "undefined" &&
        (navigator.language || navigator.userLanguage)) ||
      DEFAULT;
    var lang = String(raw).toLowerCase();
    if (lang.indexOf("es") === 0) return "es";
    if (lang.indexOf("en") === 0) return "en";
    if (lang.indexOf("it") === 0) return "it";
    return DEFAULT;
  }

  function onChange(fn) {
    if (typeof fn !== "function") return function () {};
    listeners.push(fn);
    return function unsubscribe() {
      var i = listeners.indexOf(fn);
      if (i >= 0) listeners.splice(i, 1);
    };
  }

  currentLocale = detectLocale();

  global.PricingI18n = {
    SUPPORTED: SUPPORTED,
    DEFAULT: DEFAULT,
    t: t,
    getLocale: getLocale,
    setLocale: setLocale,
    detectLocale: detectLocale,
    applyDom: applyDom,
    onChange: onChange
  };
})(typeof window !== "undefined" ? window : this);
