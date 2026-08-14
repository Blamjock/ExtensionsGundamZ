import { init as initI18n, t } from "./i18n.js";
import {
    ACTIONS,
    can,
    clampAutoCart,
    clampChannels,
    clampPollMinutes,
    ensureInstallAt,
    FREE_POLL_MINUTES,
    loadResolvedEntitlement,
    needsPeriodicVerify
} from "./entitlements.js";
import { activateLicense, clearLicense, verifyLicense } from "./licenseApi.js";
import {
    isValidBlueprintId,
    isSingleCardListing,
    isZeroListing,
    listingCents,
    listingLanguage,
    listingLanguageKeys,
    listingCondition,
    listingPriceEuro,
    matchesListingFilters,
    normalizeWatchItem,
    prepareWatchList
} from "./watchItem.js";

const BASE_URL = "https://api.cardtrader.com/api/v2";
const ALARM_NAME = "sniperLoop";
const DEFAULT_POLL_MINUTES = FREE_POLL_MINUTES;
const ICON_URL = "icons/icon-128.png";
const DEBUG_LOG_MAX = 30;
const DEBUG_BODY_MAX_CHARS = 8000;
const HISTORY_MAX_AGE_MS = 32 * 24 * 60 * 60 * 1000;
const HISTORY_MAX_POINTS = 2500;
const HISTORY_KEEP_RECENT = 720;

let checkInFlight = false;
let checkPending = false;
let cycleEntitlement = null;

const i18nReady = initI18n().catch((err) => console.error("i18n init:", err));

// #region agent log
function agentLog(location, message, data, hypothesisId) {
    fetch("http://127.0.0.1:7580/ingest/3950b0d9-062e-4308-9fc6-a693cb17ea30", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "2d9ff0" },
        body: JSON.stringify({
            sessionId: "2d9ff0",
            runId: "pre-fix",
            hypothesisId,
            location,
            message,
            data,
            timestamp: Date.now()
        })
    }).catch(() => {});
}
// #endregion

chrome.runtime.onInstalled.addListener(async () => {
    await i18nReady;
    await ensureInstallAt();
    await migrateStorage();
    await maybeVerifyLicense();
    await ensureAlarm();
    await aggiornaOrarioProssimoCheck();
});

chrome.runtime.onStartup.addListener(async () => {
    await i18nReady;
    await ensureInstallAt();
    await migrateStorage();
    await maybeVerifyLicense();
    await ensureAlarm();
    await aggiornaOrarioProssimoCheck();
});

chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes.pollMinutes || changes.entitlement || changes.devForcePro || changes.installAt) {
        ensureAlarm();
    }
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM_NAME) {
        runCheckCycle().catch((err) => console.error("alarm poll:", err));
    }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!isTrustedSender(sender)) return;

    if (message?.type === "runCheckNow") {
        i18nReady
            .then(() => runCheckCycle())
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
    if (message?.type === "removePriceHistory") {
        const bId = Number(message.bId);
        if (!isValidBlueprintId(bId)) {
            sendResponse({ ok: false, error: "invalid_bId" });
            return true;
        }
        removePriceHistory(bId)
            .then(() => sendResponse({ ok: true }))
            .catch((err) => sendResponse({ ok: false, error: String(err) }));
        return true;
    }
    if (message?.type === "getEntitlement") {
        loadResolvedEntitlement()
            .then((info) => sendResponse({ ok: true, ...info }))
            .catch((err) => sendResponse({ ok: false, error: String(err) }));
        return true;
    }
    if (message?.type === "activateLicense") {
        activateLicense(message.licenseKey)
            .then(async (result) => {
                await ensureAlarm();
                const info = await loadResolvedEntitlement();
                sendResponse({ ...result, resolved: info.resolved });
            })
            .catch((err) => sendResponse({ ok: false, error: String(err) }));
        return true;
    }
    if (message?.type === "clearLicense") {
        clearLicense()
            .then(async () => {
                await ensureAlarm();
                const info = await loadResolvedEntitlement();
                sendResponse({ ok: true, resolved: info.resolved });
            })
            .catch((err) => sendResponse({ ok: false, error: String(err) }));
        return true;
    }
    if (message?.type === "verifyLicense") {
        verifyLicense()
            .then(async (result) => {
                await ensureAlarm();
                const info = await loadResolvedEntitlement();
                sendResponse({ ...result, resolved: info.resolved });
            })
            .catch((err) => sendResponse({ ok: false, error: String(err) }));
        return true;
    }
});

function isTrustedSender(sender) {
    return sender?.id === chrome.runtime.id;
}

function truncateDebugValue(value) {
    if (value == null) return value;
    try {
        const str = typeof value === "string" ? value : JSON.stringify(value);
        if (str.length <= DEBUG_BODY_MAX_CHARS) return value;
        return `${str.slice(0, DEBUG_BODY_MAX_CHARS)}… [truncated]`;
    } catch {
        return "[unserializable]";
    }
}

async function maybeVerifyLicense() {
    try {
        const { entitlement } = await loadResolvedEntitlement();
        if (needsPeriodicVerify(entitlement)) {
            await verifyLicense();
        }
    } catch (err) {
        console.error("maybeVerifyLicense:", err);
    }
}

function maskToken(token) {
    if (!token || typeof token !== "string") return "";
    if (token.length <= 8) return "***";
    return `${token.slice(0, 4)}…${token.slice(-4)}`;
}

async function isDebugMode() {
    const resolved = cycleEntitlement || (await loadResolvedEntitlement()).resolved;
    if (!can(ACTIONS.debug, resolved)) return false;
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
                    body: truncateDebugValue(body)
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
        "pollSeconds",
        "debugMode",
        "installAt",
        "entitlement"
    ]);
    const updates = {};

    if (data.installAt == null) {
        updates.installAt = Date.now();
    }
    if (data.entitlement == null) {
        updates.entitlement = { tier: "free", source: "free", lastVerifiedAt: Date.now() };
    }
    if (data.pollMinutes == null) {
        const legacy = Number(data.pollSeconds);
        updates.pollMinutes =
            Number.isFinite(legacy) && legacy >= 3 && legacy <= 60
                ? Math.round(legacy)
                : DEFAULT_POLL_MINUTES;
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
    const toRemove = [];
    if (data.sniperList) toRemove.push("sniperList");
    if (data.pollSeconds != null) toRemove.push("pollSeconds");
    if (toRemove.length) {
        await chrome.storage.local.remove(toRemove);
    }
}

function trackMinPrice(prevMin, current) {
    if (current == null || !Number.isFinite(Number(current))) return prevMin ?? null;
    const cur = Number(current);
    if (prevMin == null || !Number.isFinite(Number(prevMin))) return cur;
    return Math.min(Number(prevMin), cur);
}

function pickBestListing(listings, excludeIds) {
    if (!listings || listings.length === 0) return null;
    const exclude = excludeIds instanceof Set
        ? excludeIds
        : new Set((excludeIds || []).filter((id) => id != null).map(Number));
    let best = null;
    let bestCents = Infinity;
    for (const cur of listings) {
        if (exclude.has(Number(cur?.id))) continue;
        const curCents = listingCents(cur);
        if (curCents == null || curCents >= bestCents) continue;
        bestCents = curCents;
        best = cur;
    }
    return best;
}

function filterPriceOutliers(listings) {
    const cents = listings.map(listingCents).filter((c) => c != null && c > 0);
    if (cents.length < 4) return listings;
    const sorted = [...cents].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const maxCents = Math.max(Math.round(median * 8), 5000);
    return listings.filter((l) => {
        const c = listingCents(l);
        return c == null || c <= maxCents;
    });
}

function splitListings(listings, excludeIds, filters) {
    const zero = [];
    const normal = [];
    const languages = filters?.languages;
    const conditions = filters?.conditions;
    for (const l of listings || []) {
        if (!isSingleCardListing(l)) continue;
        if (!matchesListingFilters(l, languages, conditions)) continue;
        if (isZeroListing(l)) zero.push(l);
        else normal.push(l);
    }
    const zeroFiltered = filterPriceOutliers(zero);
    return {
        bestZero: pickBestListing(zeroFiltered, excludeIds),
        bestNormal: pickBestListing(normal, excludeIds),
        zeroCount: zeroFiltered.length,
        normalCount: normal.length
    };
}

function cartExcludeIdsForItem(item, cartArchive) {
    const exclude = new Set();
    if (item.lastCartProductId != null) exclude.add(Number(item.lastCartProductId));
    for (const entry of cartArchive || []) {
        if (entry == null || entry.productId == null) continue;
        if (entry.bId == null || Number(entry.bId) !== Number(item.bId)) continue;
        exclude.add(Number(entry.productId));
    }
    return exclude;
}

function extractMarketplaceListings(body, bId) {
    if (!body) return [];
    if (Array.isArray(body)) return body;
    if (typeof body !== "object") return [];
    const key = Number(bId);
    return body[key] || body[String(key)] || [];
}

const RETRYABLE_HTTP = new Set([429, 502, 503, 504]);
const MARKETPLACE_MAX_RETRIES = 3;

async function fetchMarketplaceListings(token, bId, meta = {}) {
    const params = new URLSearchParams({ blueprint_id: String(bId) });
    if (meta.language) params.set("language", String(meta.language));
    const url = `${BASE_URL}/marketplace/products?${params.toString()}`;
    // #region agent log
    agentLog("background.js:fetchMarketplaceListings", "marketplace request", {
        bId,
        languageParam: meta.language || null,
        urlHasLanguage: url.includes("language=")
    }, "C");
    // #endregion
    let lastResult = null;

    for (let attempt = 0; attempt < MARKETPLACE_MAX_RETRIES; attempt++) {
        if (attempt > 0) {
            await delayMs(Math.min(8000, 500 * 2 ** (attempt - 1)));
        }

        const result = await apiFetch(
            url,
            { headers: { Authorization: `Bearer ${token}` } },
            {
                kind: "marketplace",
                label: `Marketplace blueprint ${bId}${attempt ? ` (retry ${attempt})` : ""}`,
                blueprintId: bId,
                ...meta
            }
        );
        lastResult = result;

        if (result.ok) return result;
        if (!RETRYABLE_HTTP.has(result.status) || attempt >= MARKETPLACE_MAX_RETRIES - 1) {
            return result;
        }
    }

    return lastResult;
}

function delayMs(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Ripristina preferenze utente in storage (Free clamp solo a runtime nel loop). */
function watchListForStorage(processedList, rawList) {
    return processedList.map((item, i) => {
        const raw = rawList[i];
        if (!raw) return item;
        return {
            ...item,
            watchZero: raw.watchZero,
            watchNormal: raw.watchNormal,
            autoCart: raw.autoCart
        };
    });
}

async function getPollMinutes() {
    const { resolved } = await loadResolvedEntitlement();
    const data = await chrome.storage.local.get(["pollMinutes"]);
    return clampPollMinutes(data.pollMinutes, resolved);
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

async function runCheckCycle() {
    if (checkInFlight) {
        checkPending = true;
        return;
    }
    checkInFlight = true;
    try {
        await aggiornaOrarioProssimoCheck();
        await avviaControlloLista();
    } finally {
        checkInFlight = false;
        cycleEntitlement = null;
        await aggiornaOrarioProssimoCheck();
        if (checkPending) {
            checkPending = false;
            runCheckCycle().catch((err) => console.error("deferred poll:", err));
        }
    }
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

/**
 * Aggiunge un campione prezzi per blueprint e prune (max ~32 giorni / 2500 punti).
 * @param {Record<string, {t:number,z:?number,n:?number}>} samplesByBid
 */
async function mergePriceHistory(samplesByBid) {
    const keys = Object.keys(samplesByBid);
    if (!keys.length) return;

    const data = await chrome.storage.local.get(["priceHistory"]);
    const all = data.priceHistory && typeof data.priceHistory === "object"
        ? { ...data.priceHistory }
        : {};

    for (const key of keys) {
        const sample = samplesByBid[key];
        if (!sample || sample.t == null) continue;
        if (sample.z == null && sample.n == null) continue;
        const prev = Array.isArray(all[key]) ? all[key] : [];
        all[key] = pruneHistory([...prev, {
            t: sample.t,
            z: sample.z ?? null,
            n: sample.n ?? null
        }]);
    }

    await chrome.storage.local.set({ priceHistory: all });
}

function pruneHistory(points) {
    const cutoff = Date.now() - HISTORY_MAX_AGE_MS;
    let arr = points
        .filter((p) => p && Number.isFinite(p.t) && p.t >= cutoff)
        .sort((a, b) => a.t - b.t);

    if (arr.length <= HISTORY_MAX_POINTS) return arr;

    const recent = arr.slice(-HISTORY_KEEP_RECENT);
    const older = arr.slice(0, -HISTORY_KEEP_RECENT);
    const budget = Math.max(0, HISTORY_MAX_POINTS - recent.length);
    if (budget <= 0 || older.length === 0) return recent.slice(-HISTORY_MAX_POINTS);

    const step = older.length / budget;
    const thinned = [];
    for (let i = 0; i < budget; i++) {
        thinned.push(older[Math.min(older.length - 1, Math.floor(i * step))]);
    }
    return [...thinned, ...recent];
}

async function removePriceHistory(bId) {
    const data = await chrome.storage.local.get(["priceHistory"]);
    if (!data.priceHistory) return;
    const all = { ...data.priceHistory };
    delete all[String(bId)];
    await chrome.storage.local.set({ priceHistory: all });
}

async function valutaCanale({ item, next, listing, channel, token }) {
    const currentPrice = listingPriceEuro(listing);
    const productId = listing?.id;
    if (currentPrice == null || productId == null) {
        return { next, alerted: false };
    }
    const channelLabel = channel === "zero" ? t("channel.ctZero") : t("channel.normal");

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
            cartNote = t("bg.cartAdded");
        } else {
            cartNote = t("bg.cartFailed");
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
    const msg = t("bg.notifyBody", {
        name,
        channel: channelLabel,
        price: currentPrice.toFixed(2),
        target: item.target.toFixed(2)
    });

    inviaNotifica(t("bg.notifyTitle"), msg + cartNote);
    next.lastAlertProductId = productId;
    next.lastAlertAt = Date.now();
    next.lastAlertPrice = currentPrice;
    next.lastAlertChannel = channel;
    return { next, alerted: true };
}

async function avviaControlloLista() {
    await i18nReady;
    await maybeVerifyLicense();
    const { resolved } = await loadResolvedEntitlement();
    cycleEntitlement = resolved;
    const data = await chrome.storage.local.get(["token", "watchList", "cartArchive"]);
    if (!data.token) {
        await setLastStatus(false, t("bg.tokenMissing"));
        return;
    }
    if (!data.watchList || data.watchList.length === 0) {
        await setLastStatus(true, t("bg.listEmpty"));
        return;
    }

    const prepared = prepareWatchList(data.watchList, resolved);
    if (prepared.changed) {
        await saveWatchList(prepared.list);
    }
    const rawList = prepared.list;
    if (rawList.length === 0) {
        await setLastStatus(true, t("bg.listEmpty"));
        return;
    }

    const list = rawList.map((item) => {
        const channels = clampChannels(item.watchZero, item.watchNormal, resolved);
        return {
            ...item,
            ...channels,
            autoCart: clampAutoCart(item.autoCart, resolved)
        };
    });
    const cartArchive = Array.isArray(data.cartArchive) ? data.cartArchive : [];
    let errors = 0;
    let checked = 0;
    let alerts = 0;
    const historySamples = {};

    for (let i = 0; i < list.length; i++) {
        const item = list[i];
        if (!isValidBlueprintId(item.bId)) {
            errors += 1;
            continue;
        }
        try {
            const apiLanguage =
                Array.isArray(item.languages) &&
                item.languages.length === 1 &&
                /^[a-z]{2}$/.test(item.languages[0])
                    ? item.languages[0]
                    : null;
            const result = await fetchMarketplaceListings(data.token, item.bId, {
                language: apiLanguage
            });

            if (!result.ok) {
                errors += 1;
                console.error(`Blueprint ${item.bId}: HTTP ${result.status}`);
                continue;
            }

            checked += 1;
            const listings = extractMarketplaceListings(result.body, item.bId);
            const firstPh = listings[0]?.properties_hash && typeof listings[0].properties_hash === "object"
                ? Object.keys(listings[0].properties_hash)
                : [];
            const uniqueLangs = [...new Set(listings.map(listingLanguage).filter(Boolean))];
            const uniqueConds = [...new Set(listings.map(listingCondition).filter(Boolean))];
            // #region agent log
            agentLog("background.js:avviaControlloLista", "raw marketplace listings", {
                bId: item.bId,
                count: listings.length,
                propertyKeys: firstPh,
                uniqueLangs,
                uniqueConds,
                filters: { languages: item.languages, conditions: item.conditions },
                sample: listings.slice(0, 4).map((l) => ({
                    id: l?.id,
                    cents: listingCents(l),
                    lang: listingLanguage(l),
                    cond: listingCondition(l),
                    languageKeys: listingLanguageKeys(l?.properties_hash),
                    languageProps: Object.fromEntries(
                        listingLanguageKeys(l?.properties_hash).map((k) => [
                            k,
                            l?.properties_hash?.[k] ?? null
                        ])
                    )
                }))
            }, "A");
            // #endregion
            // Prezzi in UI = miglior offerta sul mercato (senza escludere il carrello)
            const { bestZero, bestNormal, zeroCount, normalCount } = splitListings(
                listings,
                undefined,
                item
            );
            // #region agent log
            agentLog("background.js:avviaControlloLista", "after language/condition filter", {
                bId: item.bId,
                rawCount: listings.length,
                zeroCount,
                normalCount,
                bestZero: bestZero
                    ? { cents: listingCents(bestZero), lang: listingLanguage(bestZero), cond: listingCondition(bestZero) }
                    : null,
                bestNormal: bestNormal
                    ? { cents: listingCents(bestNormal), lang: listingLanguage(bestNormal), cond: listingCondition(bestNormal) }
                    : null
            }, "E");
            // #endregion
            const excludeIds = cartExcludeIdsForItem(item, cartArchive);
            // Auto-cart / alert su nuove offerte = esclude prodotti già in carrello
            const cartPicks = splitListings(listings, excludeIds, item);

            const next = { ...item };
            const checkedAt = Date.now();
            const zeroPrice = listingPriceEuro(bestZero);
            const normalPrice = listingPriceEuro(bestNormal);
            if (zeroPrice != null) {
                next.lastSeenZero = zeroPrice;
                next.lastSeenZeroAt = checkedAt;
            } else if (item.watchZero) {
                next.lastSeenZero = null;
                next.lastSeenZeroAt = null;
            }
            if (normalPrice != null) {
                next.lastSeenNormal = normalPrice;
                next.lastSeenNormalAt = checkedAt;
            } else if (item.watchNormal) {
                next.lastSeenNormal = null;
                next.lastSeenNormalAt = null;
            }

            next.minZero = zeroPrice != null ? trackMinPrice(item.minZero, zeroPrice) : item.minZero ?? null;
            next.minNormal = normalPrice != null ? trackMinPrice(item.minNormal, normalPrice) : item.minNormal ?? null;

            const seenCandidates = [];
            if (item.watchZero && next.lastSeenZero != null) seenCandidates.push(next.lastSeenZero);
            if (item.watchNormal && next.lastSeenNormal != null) seenCandidates.push(next.lastSeenNormal);
            if (!item.watchZero && !item.watchNormal) {
                if (next.lastSeenZero != null) seenCandidates.push(next.lastSeenZero);
                if (next.lastSeenNormal != null) seenCandidates.push(next.lastSeenNormal);
            }
            if (seenCandidates.length) {
                next.lastSeenPrice = Math.min(...seenCandidates);
            }

            if (zeroPrice != null || normalPrice != null) {
                historySamples[String(item.bId)] = {
                    t: checkedAt,
                    z: next.lastSeenZero,
                    n: next.lastSeenNormal
                };
            }

            if (item.watchZero && cartPicks.bestZero) {
                const r = await valutaCanale({
                    item,
                    next,
                    listing: cartPicks.bestZero,
                    channel: "zero",
                    token: data.token
                });
                Object.assign(next, r.next);
                if (r.alerted) alerts += 1;
            }

            if (item.watchNormal && cartPicks.bestNormal) {
                const r = await valutaCanale({
                    item,
                    next,
                    listing: cartPicks.bestNormal,
                    channel: "normal",
                    token: data.token
                });
                Object.assign(next, r.next);
                if (r.alerted) alerts += 1;
            }

            list[i] = next;
        } catch (error) {
            errors += 1;
            console.error("Errore nel ciclo alert:", error);
        }
    }

    await saveWatchList(watchListForStorage(list, rawList));
    await mergePriceHistory(historySamples);

    if (errors > 0 && checked === 0) {
        await setLastStatus(false, t("bg.checkFailed", { errors }));
    } else if (errors > 0) {
        await setLastStatus(
            true,
            t("bg.checkOkErrors", { checked, alerts, errors })
        );
    } else {
        await setLastStatus(
            true,
            t("bg.checkOk", { checked, alerts })
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
                t("bg.cartHttpFail", {
                    status: result.status,
                    detail: summarizeError(result.body)
                })
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
        await setLastStatus(false, t("bg.cartError", { error: String(e) }));
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
            addedAt: Date.now(),
            purchased: Boolean(archive[idx].purchased)
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
            addedAt: Date.now(),
            purchased: false
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
    if (body == null) return t("bg.noDetail");
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
    const { resolved } = await loadResolvedEntitlement();
    if (!can(ACTIONS.sound, resolved)) return;

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
        justification: t("bg.offscreenJustification")
    });
}

i18nReady
    .then(() => ensureInstallAt())
    .then(() => migrateStorage())
    .then(() => maybeVerifyLicense())
    .then(() => ensureAlarm())
    .then(() => aggiornaOrarioProssimoCheck())
    .then(() => runCheckCycle().catch((err) => console.error("startup poll:", err)));
