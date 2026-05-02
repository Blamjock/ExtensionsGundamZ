chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: 'cardtrader-search-selection',
        title: 'Cerca prezzo CardTrader',
        contexts: ['selection']
    });
});

chrome.contextMenus.onClicked.addListener((info) => {
    if (info.menuItemId !== 'cardtrader-search-selection') return;
    const query = info.selectionText ? info.selectionText.trim() : '';
    if (!query) return;

    chrome.storage.local.set({ contextSearchQuery: query }, () => {
        if (chrome.action && chrome.action.openPopup) {
            chrome.action.openPopup();
        } else {
            chrome.tabs.create({ url: chrome.runtime.getURL('popup.html') });
        }
    });
});
