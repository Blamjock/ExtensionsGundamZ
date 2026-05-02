const TOKEN_STORAGE_KEY = 'cardtraderApiToken';

document.addEventListener('DOMContentLoaded', () => {
    const tokenInput = document.getElementById('apiToken');
    const saveBtn = document.getElementById('saveTokenBtn');
    const statusDiv = document.getElementById('status');

    chrome.storage.local.get([TOKEN_STORAGE_KEY], (result) => {
        if (result[TOKEN_STORAGE_KEY]) {
            tokenInput.value = result[TOKEN_STORAGE_KEY];
        }
    });

    saveBtn.addEventListener('click', () => {
        const token = tokenInput.value.trim();
        if (!token) {
            statusDiv.textContent = 'Inserisci un token valido prima di salvare.';
            return;
        }

        chrome.storage.local.set({ [TOKEN_STORAGE_KEY]: token }, () => {
            statusDiv.textContent = 'Token salvato con successo.';
        });
    });
});
