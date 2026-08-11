# ExtensionsGundamZ

Chrome extensions for working with CardTrader and finding prices for Gundam Card Game cards.

This repository contains three projects under `CardTrader/`:

- `CardTrader/gundam_market`: Search prices via the CardTrader API, show offers, and use the context menu on selected text.
- `CardTrader/gundam_analyzer`: Analyze buyer order pages on CardTrader (rarity totals).
- `CardTrader/Gundam_automata`: **Crometium TCG** (v0.8) — multilingual (IT/EN/ES) freemium price watcher: Free + Pro (trial 15 days), alerts, charts, optional auto-cart, watchlist page.

Full documentation:

- Suite overview (IT): [`CardTrader/README.md`](CardTrader/README.md)
- Crometium TCG: [`CardTrader/Gundam_automata/README.md`](CardTrader/Gundam_automata/README.md)
- How it works: [`CardTrader/Gundam_automata/docs/HOW_IT_WORKS.md`](CardTrader/Gundam_automata/docs/HOW_IT_WORKS.md)
- Multilingual system: [`CardTrader/Gundam_automata/docs/I18N.md`](CardTrader/Gundam_automata/docs/I18N.md)

## Installing the Extension

1. Open Chrome and go to `chrome://extensions`.
2. Enable `Developer Mode` in the top right.
3. Click `Load unpacked`.
4. Select the folder of the project you want to install:
   - `CardTrader/gundam_market` — price search + context menu
   - `CardTrader/gundam_analyzer` — order page analysis
   - `CardTrader/Gundam_automata` — **Crometium TCG** (price alerts + charts)
5. Verify that the extension is enabled.

## How to get the API token from CardTrader

`gundam_market` and **Crometium TCG** need a valid CardTrader API token.

1. Log in to `https://www.cardtrader.com` with your account.
2. Open your browser's developer tools (right-click > "Inspect" or `F12`).
3. Go to the `Network` tab.
4. Perform a search on CardTrader or open a page that loads data.
5. Look for a request to `https://api.cardtrader.com/`.
6. Select the request and look at the headers.
7. Find the `Authorization` header.
8. Copy the value after `Bearer`, which is the API token.

> Note: The token is not the password. It is the long string used in API requests such as `Bearer <token>`.

Alternatively, create/copy a token from [CardTrader → Settings → API](https://www.cardtrader.com).

## How to configure the token in the extension

1. Open the extension's options page or popup (`Options` / `Token Settings` / paste field in Crometium TCG).
2. Paste the API token.
3. Click `Save Token`.
4. Close and reopen the popup if necessary.

> Suit and Crometium use different storage keys (`cardtraderApiToken` vs `token`). They are not shared.

## How to use the `gundam_market` extension

1. Click the extension's icon in the Chrome bar.
2. In the popup, enter the name of the Gundam card you want to search for.
3. Click 'Search' to find the best offer or 'Analyze' to view the top 10 offers.
4. If you've selected text on a web page, you can also use the context menu:
   - Select the card's name.
   - Right-click.
   - Choose 'Search CardTrader Price' from the menu.
5. The results are displayed directly in the popup, with the price, seller, and link to the card on CardTrader.
6. The extension tracks the lowest historical price for each card and displays it below the current price. It updates only when a lower price is found.

## How to use the `gundam_analyzer` extension

1. Visit CardTrader and open a supported page such as `orders/buyer_future_order`.
2. Click the floating **Analizza Spese** button injected on the page.
3. Open the extension popup to see rarity totals from the last run.
4. Optionally configure set ranges (Unità / Piloti / Comandi / Basi) in the options page.

## How to use Crometium TCG (`Gundam_automata`)

**Multilingual + freemium:** Italian, English, Spanish. Free tier with limits; Pro via license (15-day trial on install). See [MONETIZATION.md](CardTrader/Gundam_automata/docs/MONETIZATION.md).

1. Open the popup → paste API token → Save.
2. (Optional) Choose language in **Settings**.
3. Add a Blueprint ID, max price, and which channels to watch (CT Zero / Normal — both require Pro).
4. Optionally enable auto-cart and alert sound (**Pro**).
5. Leave Chrome open; the alarm polls the marketplace on the interval you set (Free: 5′ fixed).
6. After a few checks, open the chart on a card (popup or **watchlist** page):
   - Free: Day only · Pro: Day / Week / Month
   - Hover the lines to see timestamp + Zero/Normal values next to the cursor
7. Activate Pro in Settings with a license key (dev stub: `PRO-DEV-…`) or open the pricing page.

## Tips

- If the popup displays `❌ Token not set`, you need to paste the token into the settings.
- If the extension doesn't work, try reloading the extension on `chrome://extensions` or reopening the browser.
- Keep your token private: don't share it with others.
