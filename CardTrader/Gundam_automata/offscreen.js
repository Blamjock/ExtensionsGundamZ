chrome.runtime.onMessage.addListener((message, sender) => {
    if (sender?.id !== chrome.runtime.id) return;
    if (message?.type !== "playAlertSound") return;
    playCampanella().catch((err) => console.error("Alert sound failed:", err));
});

async function playCampanella() {
    // .m4r = ringtone iOS (AAC); Chrome preferisce spesso .m4a
    const candidates = [
        "sound_campanella.m4a",
        "sound_campanella.m4r"
    ];

    let lastError = null;
    for (const file of candidates) {
        try {
            await playFile(chrome.runtime.getURL(file));
            return;
        } catch (err) {
            lastError = err;
        }
    }
    throw lastError || new Error("Nessun file audio riproducibile");
}

function playFile(url) {
    return new Promise((resolve, reject) => {
        const audio = new Audio(url);
        audio.preload = "auto";
        audio.volume = 1;
        audio.onended = () => resolve();
        audio.onerror = () => reject(new Error(`Errore audio: ${url}`));
        const p = audio.play();
        if (p && typeof p.then === "function") p.catch(reject);
    });
}
