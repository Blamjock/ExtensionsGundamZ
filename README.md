# ExtensionsGundamZ

Chrome extensions for working with CardTrader and finding prices for Gundam Card Game cards.

This repository contains two main projects:

- `CardTrader/gundam_market`: An extension that uses the CardTrader API to search prices, display offers, and use the context menu on selected text.
- `CardTrader/gundam_analyzer`: An extension for analyzing orders and statistics on CardTrader within purchase pages.

## Installing the Extension

1. Open Chrome and go to `chrome://extensions`.
2. Enable `Developer Mode` in the top right.
3. Click `Load Unpackaged Extension`.
4. Select the folder of the project you want to install:
- `CardTrader/gundam_market` for the price search and context menu extension.
- `CardTrader/gundam_analyzer` for the price analysis extension on order pages.
5. Verify that the extension is enabled.

## How to get the API token from CardTrader

The `gundam_market` extension requires a valid CardTrader API token.

1. Log in to `https://www.cardtrader.com` with your account.
2. Open your browser's developer tools (right-click > "Inspect" or `F12`).
3. Go to the `Network` tab.
4. Perform a search on CardTrader or open a page that loads data.
5. Look for a request to `https://api.cardtrader.com/`.
6. Select the request and look at the headers.
7. Find the `Authorization` header.
8. Copy the value after `Bearer`, which is the API token.

> Note: The token is not the password. It is the long string used in API requests such as `Bearer <token>`.

## How to configure the token in the extension

1. Open the extension's options page ('Options' or 'Token Settings').
2. Paste the API token into the 'Enter API token here' field.
3. Click 'Save Token'.
4. You should see the message 'Token saved successfully.'.
5. Close and reopen the extension's popup if necessary.

## How to use the 'gundam_market' extension

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
2. The extension injects data into the page and displays the analysis.
3. Use the options and charts available in the popup or on the settings page.

## Tips

- If the popup displays `❌ Token not set`, you need to paste the token into the settings.
- If the extension doesn't work, try reloading the page or reopening your browser.
- Keep your token private: don't share it with others.