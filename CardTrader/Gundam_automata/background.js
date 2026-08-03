const BASE_URL = "https://api.cardtrader.com/api/v2";
const ALARM_NAME = "sniperLoop";
const DEFAULT_POLL_MINUTES = 2;
const ICON_URL = "icons/icon-128.png";
const DEBUG_LOG_MAX = 30;

chrome.runtime.onInstalled.addListener(async () => {
    await migrateStorage();
    await ensureAlarm();
    await aggiornaOrarioProssimoCheck();
});

chrome.runtime.onStartup.addListener(async () => {
    await migrateStorage();
    await ensureAlarm();
    await aggiornaOrarioProssimoCheck();
});

chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.pollMinutes) {
        ensureAlarm();
    }
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM_NAME) {
        aggiornaOrarioProssimoCheck();
        avviaControlloLista();
    }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "runCheckNow") {
        aggiornaOrarioProssimoCheck();
        avviaControlloLista()
            .then(() => sendResponse({ ok: true }))
            .catch((err) => sendResponse({ ok: false, error: String(err) }));
        return true;
    }
    if (message?.type === "clearDebugLogs") {
        chrome.storage.local.set({ debugLogs: [] }).then(() => sendResponse({ ok: true }));
        return true;
    }
    if (message?.type === "testAlertSound") {
        playAlertSound({ force: true })
            .then(() => sendResponse({ ok: true }))
            .catch((err) => sendResponse({ ok: false, error: String(err) }));
        return true;
    }
});

function maskToken(token) {
    if (!token || typeof token !== "string") return "";
    if (token.length <= 8) return "***";
    return `${token.slice(0, 4)}…${token.slice(-4)}`;
}

async function isDebugMode() {
    const data = await chrome.storage.local.get(["debugMode"]);
    return Boolean(data.debugMode);
}

async function pushDebugLog(entry) {
    const data = await chrome.storage.local.get(["debugLogs"]);
    const logs = Array.isArray(data.debugLogs) ? data.debugLogs : [];
    logs.unshift(entry);
    await chrome.storage.local.set({ debugLogs: logs.slice(0, DEBUG_LOG_MAX) });
}

/**
 * Fetch con log debug (token mascherato in request).
 */
async function apiFetch(url, options = {}, meta = {}) {
    const debug = await isDebugMode();
    const startedAt = Date.now();
    const method = (options.method || "GET").toUpperCase();
    const headers = { ...(options.headers || {}) };
    const auth = headers.Authorization || headers.authorization || "";
    const tokenMatch = String(auth).match(/^Bearer\s+(.+)$/i);
    const requestLog = {
        method,
        url,
        headers: {
            ...headers,
            Authorization: tokenMatch
                ? `Bearer ${maskToken(tokenMatch[1])}`
                : headers.Authorization
        },
        body: options.body ? safeJsonParse(options.body) : null
    };

    try {
        const response = await fetch(url, options);
        const rawText = await response.text();
        let body = null;
        try {
            body = rawText ? JSON.parse(rawText) : null;
        } catch {
            body = rawText;
        }

        if (debug) {
            await pushDebugLog({
                id: `${startedAt}-${Math.random().toString(36).slice(2, 8)}`,
                at: startedAt,
                durationMs: Date.now() - startedAt,
                kind: meta.kind || "api",
                label: meta.label || url,
                blueprintId: meta.blueprintId ?? null,
                request: requestLog,
                response: {
                    ok: response.ok,
                    status: response.status,
                    statusText: response.statusText,
                    body
                }
            });
        }

        return { ok: response.ok, status: response.status, body, rawText };
    } catch (error) {
        if (debug) {
            await pushDebugLog({
                id: `${startedAt}-${Math.random().toString(36).slice(2, 8)}`,
                at: startedAt,
                durationMs: Date.now() - startedAt,
                kind: meta.kind || "api",
                label: meta.label || url,
                blueprintId: meta.blueprintId ?? null,
                request: requestLog,
                response: {
                    ok: false,
                    status: 0,
                    statusText: "NETWORK_ERROR",
                    body: String(error)
                }
            });
        }
        throw error;
    }
}

function safeJsonParse(str) {
    try {
        return JSON.parse(str);
    } catch {
        return str;
    }
}

async function migrateStorage() {
    const data = await chrome.storage.local.get([
        "sniperList",
        "watchList",
        "pollMinutes",
        "debugMode"
    ]);
    const updates = {};

    if (data.pollMinutes == null) {
        updates.pollMinutes = DEFAULT_POLL_MINUTES;
    }
    if (data.debugMode == null) {
        updates.debugMode = false;
    }
    if (data.alertSound == null) {
        updates.alertSound = true;
    }

    if (!data.watchList) {
        updates.watchList = (data.sniperList || []).map(normalizeWatchItem);
    }

    if (Object.keys(updates).length > 0) {
        await chrome.storage.local.set(updates);
    }
    if (data.sniperList) {
        await chrome.storage.local.remove("sniperList");
    }
}

function normalizeWatchItem(item) {
    const watchZero = item.watchZero !== false;
    const watchNormal = item.watchNormal !== false;
    const lastSeenZero = item.lastSeenZero ?? null;
    const lastSeenNormal = item.lastSeenNormal ?? null;
    return {
        bId: Number(item.bId),
        target: Number(item.target),
        autoCart: Boolean(item.autoCart),
        label: typeof item.label === "string" ? item.label : "",
        watchZero,
        watchNormal: watchZero || watchNormal ? watchNormal : true,
        lastAlertProductId: item.lastAlertProductId ?? null,
        lastAlertAt: item.lastAlertAt ?? null,
        lastAlertPrice: item.lastAlertPrice ?? null,
        lastAlertChannel: item.lastAlertChannel ?? null,
        lastSeenPrice: item.lastSeenPrice ?? null,
        lastSeenZero,
        lastSeenNormal,
        lastSeenZeroAt: item.lastSeenZeroAt ?? null,
        lastSeenNormalAt: item.lastSeenNormalAt ?? null,
        minZero: item.minZero ?? lastSeenZero,
        minNormal: item.minNormal ?? lastSeenNormal,
        lastCartProductId: item.lastCartProductId ?? null
    };
}

function trackMinPrice(prevMin, current) {
    if (current == null || !Number.isFinite(Number(current))) return prevMin ?? null;
    const cur = Number(current);
    if (prevMin == null || !Number.isFinite(Number(prevMin))) return cur;
    return Math.min(Number(prevMin), cur);
}

function isZeroListing(listing) {
    return (
        (listing.user && listing.user.can_sell_sealed_with_ct_zero === true) ||
        listing.can_be_sent_with_zero === true ||
        listing.can_be_sent_with_zero === "true"
    );
}

function pickBestListing(listings) {
    if (!listings || listings.length === 0) return null;
    return listings.reduce((best, cur) => {
        const bestCents = best?.price?.cents ?? Infinity;
        const curCents = cur?.price?.cents ?? Infinity;
        return curCents < bestCents ? cur : best;
    });
}

function splitListings(listings) {
    const zero = [];
    const normal = [];
    for (const l of listings || []) {
        if (isZeroListing(l)) zero.push(l);
        else normal.push(l);
    }
    return {
        bestZero: pickBestListing(zero),
        bestNormal: pickBestListing(normal)
    };
}

async function getPollMinutes() {
    const data = await chrome.storage.local.get(["pollMinutes"]);
    const minutes = Number(data.pollMinutes);
    if (!Number.isFinite(minutes) || minutes < 1) return DEFAULT_POLL_MINUTES;
    return Math.min(5, Math.max(1, Math.round(minutes)));
}

async function ensureAlarm() {
    const minutes = await getPollMinutes();
    await chrome.alarms.clear(ALARM_NAME);
    chrome.alarms.create(ALARM_NAME, { periodInMinutes: minutes });
}

async function aggiornaOrarioProssimoCheck() {
    const minutes = await getPollMinutes();
    const prossimo = Date.now() + minutes * 60 * 1000;
    await chrome.storage.local.set({ nextTick: prossimo });
}

async function setLastStatus(ok, message) {
    await chrome.storage.local.set({
        lastStatus: {
            ok,
            message,
            at: Date.now()
        }
    });
}

async function saveWatchList(list) {
    await chrome.storage.local.set({ watchList: list });
}

async function valutaCanale({ item, next, listing, channel, token }) {
    const currentPrice = listing.price.cents / 100;
    const productId = listing.id;
    const channelLabel = channel === "zero" ? "CT Zero" : "Normale";

    if (channel === "zero") next.lastSeenZero = currentPrice;
    else next.lastSeenNormal = currentPrice;

    const candidates = [];
    if (item.watchZero && next.lastSeenZero != null) candidates.push(next.lastSeenZero);
    if (item.watchNormal && next.lastSeenNormal != null) candidates.push(next.lastSeenNormal);
    if (candidates.length) next.lastSeenPrice = Math.min(...candidates);

    if (currentPrice > item.target) {
        return { next, alerted: false };
    }

    let cartNote = "";
    if (item.autoCart && productId !== item.lastCartProductId) {
        const aggiunto = await aggiungiAlCarrello(token, productId, channel === "zero", {
            bId: item.bId,
            label: item.label || `ID ${item.bId}`,
            unitPrice: currentPrice,
            channel
        });
        if (aggiunto) {
            next.lastCartProductId = productId;
            cartNote = " — aggiunto al carrello";
        } else {
            cartNote = " — add-to-cart fallito";
        }
    }

    const sameProduct = productId === item.lastAlertProductId;
    const sameChannel = item.lastAlertChannel === channel;
    const priceDropped =
        sameProduct &&
        sameChannel &&
        item.lastAlertPrice != null &&
        currentPrice < item.lastAlertPrice;
    const shouldAlert = !(sameProduct && sameChannel) || priceDropped || Boolean(cartNote);

    if (!shouldAlert) {
        return { next, alerted: false };
    }

    const name = item.label || `ID ${item.bId}`;
    const msg = `${name} [${channelLabel}]: €${currentPrice.toFixed(2)} ≤ target €${item.target.toFixed(2)}`;

    inviaNotifica("Prezzo basso!", msg + cartNote);
    next.lastAlertProductId = productId;
    next.lastAlertAt = Date.now();
    next.lastAlertPrice = currentPrice;
    next.lastAlertChannel = channel;
    return { next, alerted: true };
}

async function avviaControlloLista() {
    await migrateStorage();
    const data = await chrome.storage.local.get(["token", "watchList"]);
    if (!data.token) {
        await setLastStatus(false, "Token API mancante");
        return;
    }
    if (!data.watchList || data.watchList.length === 0) {
        await setLastStatus(true, "Lista vuota — nessun check");
        return;
    }

    const list = data.watchList.map(normalizeWatchItem);
    let errors = 0;
    let checked = 0;
    let alerts = 0;

    for (let i = 0; i < list.length; i++) {
        const item = list[i];
        try {
            const url = `${BASE_URL}/marketplace/products?blueprint_id=${item.bId}`;
            const result = await apiFetch(
                url,
                { headers: { Authorization: `Bearer ${data.token}` } },
                {
                    kind: "marketplace",
                    label: `Marketplace blueprint ${item.bId}`,
                    blueprintId: item.bId
                }
            );

            if (!result.ok) {
                errors += 1;
                console.error(`Blueprint ${item.bId}: HTTP ${result.status}`);
                continue;
            }

            checked += 1;
            const products = result.body || {};
            const listings = products[item.bId] || products[String(item.bId)] || [];
            const { bestZero, bestNormal } = splitListings(listings);

            let next = {
                ...item,
                lastSeenZero: null,
                lastSeenNormal: null,
                lastSeenZeroAt: null,
                lastSeenNormalAt: null
            };

            const checkedAt = Date.now();
            if (bestZero) {
                next.lastSeenZero = bestZero.price.cents / 100;
                next.lastSeenZeroAt = checkedAt;
            }
            if (bestNormal) {
                next.lastSeenNormal = bestNormal.price.cents / 100;
                next.lastSeenNormalAt = checkedAt;
            }

            next.minZero = trackMinPrice(item.minZero, next.lastSeenZero);
            next.minNormal = trackMinPrice(item.minNormal, next.lastSeenNormal);

            const seenCandidates = [];
            if (item.watchZero && next.lastSeenZero != null) seenCandidates.push(next.lastSeenZero);
            if (item.watchNormal && next.lastSeenNormal != null) seenCandidates.push(next.lastSeenNormal);
            if (!item.watchZero && !item.watchNormal) {
                if (next.lastSeenZero != null) seenCandidates.push(next.lastSeenZero);
                if (next.lastSeenNormal != null) seenCandidates.push(next.lastSeenNormal);
            }
            next.lastSeenPrice = seenCandidates.length ? Math.min(...seenCandidates) : null;

            if (item.watchZero && bestZero) {
                const r = await valutaCanale({
                    item,
                    next,
                    listing: bestZero,
                    channel: "zero",
                    token: data.token
                });
                next = r.next;
                if (r.alerted) alerts += 1;
            }

            if (item.watchNormal && bestNormal) {
                const r = await valutaCanale({
                    item,
                    next,
                    listing: bestNormal,
                    channel: "normal",
                    token: data.token
                });
                next = r.next;
                if (r.alerted) alerts += 1;
            }

            list[i] = next;
        } catch (error) {
            errors += 1;
            console.error("Errore nel ciclo alert:", error);
        }
    }

    await saveWatchList(list);

    if (errors > 0 && checked === 0) {
        await setLastStatus(false, `Check fallito (${errors} errori API)`);
    } else if (errors > 0) {
        await setLastStatus(
            true,
            `Check ok: ${checked} carte, ${alerts} alert, ${errors} errori`
        );
    } else {
        await setLastStatus(
            true,
            `Check ok: ${checked} carte, ${alerts} alert`
        );
    }
}

async function aggiungiAlCarrello(token, productId, viaZero, meta = {}) {
    try {
        const stored = await chrome.storage.local.get(["cartAddress"]);
        const addr = normalizeAddress(stored.cartAddress);

        const body = {
            product_id: productId,
            quantity: 1,
            via_cardtrader_zero: Boolean(viaZero)
        };
        if (addr) {
            body.billing_address = addr;
            body.shipping_address = addr;
        }

        // API ufficiale: POST /cart/add (non /cart_items)
        const result = await apiFetch(
            `${BASE_URL}/cart/add`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(body)
            },
            {
                kind: "cart",
                label: `POST /cart/add product ${productId}${viaZero ? " (Zero)" : " (Normale)"}`
            }
        );

        if (!result.ok) {
            console.error(`cart/add HTTP ${result.status}`, result.body);
            await setLastStatus(
                false,
                `Add-to-cart fallito HTTP ${result.status}: ${summarizeError(result.body)}`
            );
            return false;
        }

        await archiveCartAdd({
            productId,
            bId: meta.bId ?? null,
            label: meta.label || `Product ${productId}`,
            unitPrice: Number(meta.unitPrice) || 0,
            channel: meta.channel || (viaZero ? "zero" : "normal"),
            quantity: 1
        });
        return true;
    } catch (e) {
        console.error("cart/add error:", e);
        await setLastStatus(false, `Add-to-cart errore: ${String(e)}`);
        return false;
    }
}

/** Archivia (o aggrega) una carta aggiunta al carrello CT. */
async function archiveCartAdd(entry) {
    const data = await chrome.storage.local.get(["cartArchive"]);
    const archive = Array.isArray(data.cartArchive) ? data.cartArchive : [];
    const idx = archive.findIndex(
        (x) =>
            Number(x.productId) === Number(entry.productId) &&
            x.channel === entry.channel
    );

    if (idx >= 0) {
        archive[idx] = {
            ...archive[idx],
            quantity: Number(archive[idx].quantity || 0) + Number(entry.quantity || 1),
            unitPrice: entry.unitPrice,
            label: entry.label || archive[idx].label,
            addedAt: Date.now()
        };
    } else {
        archive.unshift({
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            productId: Number(entry.productId),
            bId: entry.bId != null ? Number(entry.bId) : null,
            label: entry.label,
            channel: entry.channel,
            unitPrice: Number(entry.unitPrice) || 0,
            quantity: Number(entry.quantity) || 1,
            addedAt: Date.now()
        });
    }

    await chrome.storage.local.set({ cartArchive: archive });
}

function normalizeAddress(addr) {
    if (!addr || typeof addr !== "object") return null;
    const name = String(addr.name || "").trim();
    const street = String(addr.street || "").trim();
    const zip = String(addr.zip || "").trim();
    const city = String(addr.city || "").trim();
    const state_or_province = String(addr.state_or_province || "").trim();
    const country_code = String(addr.country_code || "").trim().toUpperCase();
    if (!name || !street || !zip || !city || !country_code) return null;
    return {
        name,
        street,
        zip,
        city,
        state_or_province: state_or_province || country_code,
        country_code
    };
}

function summarizeError(body) {
    if (body == null) return "nessun dettaglio";
    if (typeof body === "string") return body.slice(0, 120);
    try {
        return JSON.stringify(body).slice(0, 160);
    } catch {
        return String(body);
    }
}

function inviaNotifica(titolo, messaggio) {
    chrome.notifications.create({
        type: "basic",
        iconUrl: ICON_URL,
        title: titolo,
        message: messaggio,
        priority: 2
    });
    playAlertSound().catch((err) => console.error("playAlertSound:", err));
}

async function playAlertSound(opts = {}) {
    const data = await chrome.storage.local.get(["alertSound"]);
    if (!opts.force && data.alertSound === false) return;

    await ensureOffscreenDocument();
    chrome.runtime.sendMessage({ type: "playAlertSound" }).catch(() => {});
}

async function ensureOffscreenDocument() {
    const url = chrome.runtime.getURL("offscreen.html");

    if (chrome.runtime.getContexts) {
        const existing = await chrome.runtime.getContexts({
            contextTypes: ["OFFSCREEN_DOCUMENT"],
            documentUrls: [url]
        });
        if (existing.length > 0) return;
    } else if (chrome.offscreen.hasDocument) {
        if (await chrome.offscreen.hasDocument()) return;
    }

    await chrome.offscreen.createDocument({
        url: "offscreen.html",
        reasons: ["AUDIO_PLAYBACK"],
        justification: "Riproduce un suono quando viene trovato un prezzo sotto soglia"
    });
}

migrateStorage().then(() => ensureAlarm()).then(() => aggiornaOrarioProssimoCheck());
