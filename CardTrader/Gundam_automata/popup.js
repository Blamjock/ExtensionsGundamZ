import { init as initI18n, t, applyDom, setLocale, getLocale, getLocaleBcp47, onLocaleChange } from "./i18n.js";
import {
    ACTIONS,
    FREE_POLL_MINUTES,
    can,
    canChartRange,
    clampAutoCart,
    clampChannels,
    clampPollMinutes,
    isPro,
    loadResolvedEntitlement,
    maxCardsFor
} from "./entitlements.js";
import { openCheckoutPage } from "./licenseApi.js";

let entitlementState = { resolved: { tier: "free", source: "free" } };

document.addEventListener("DOMContentLoaded", async () => {
    await initI18n();
    applyDom();
    const localeSelect = document.getElementById("localeSelect");
    if (localeSelect) localeSelect.value = getLocale();
    await refreshEntitlementUi();
    loadAll();
    avviaVisualizzazioneTimer();
});

onLocaleChange(async () => {
    applyDom();
    const localeSelect = document.getElementById("localeSelect");
    if (localeSelect) localeSelect.value = getLocale();
    await refreshEntitlementUi();
    loadList();
    loadCartArchive();
    if (chartState.bId) {
        document.getElementById("chartTitle").innerHTML =
            `${escapeHtml(chartState.label)}<small>${t("chart.blueprint", { id: chartState.bId })}</small>`;
        renderPriceChart();
    }
});

document.getElementById("localeSelect").addEventListener("change", async (e) => {
    await setLocale(e.target.value);
    setStatusUi(true, t("status.localeChanged", { lang: t(`lang.${getLocale()}`) }));
});

document.getElementById("saveTokenBtn").addEventListener("click", async () => {
    const token = document.getElementById("apiToken").value.trim();
    if (!token) {
        alert(t("alert.enterToken"));
        return;
    }
    await chrome.storage.local.set({ token });
    updateTokenBanner(token);
    setStatusUi(true, t("status.tokenSaved"));
});

document.getElementById("savePollBtn").addEventListener("click", async () => {
    await refreshEntitlementUi();
    if (!can(ACTIONS.pollFast, entitlementState.resolved)) {
        showUpgradeModal(t("pro.limitPoll", { min: FREE_POLL_MINUTES }));
        document.getElementById("pollMinutes").value = String(FREE_POLL_MINUTES);
        await chrome.storage.local.set({ pollMinutes: FREE_POLL_MINUTES });
        return;
    }
    let minutes = parseInt(document.getElementById("pollMinutes").value, 10);
    if (!Number.isFinite(minutes) || minutes < 1 || minutes > 5) {
        alert(t("alert.pollRange"));
        return;
    }
    minutes = clampPollMinutes(minutes, entitlementState.resolved);
    await chrome.storage.local.set({ pollMinutes: minutes });
    const prossimo = Date.now() + minutes * 60 * 1000;
    await chrome.storage.local.set({ nextTick: prossimo });
    setStatusUi(true, t("status.pollEvery", { minutes }));
});

document.getElementById("debugMode").addEventListener("change", async (e) => {
    await refreshEntitlementUi();
    if (e.target.checked && !can(ACTIONS.debug, entitlementState.resolved)) {
        e.target.checked = false;
        showUpgradeModal(t("pro.limitDebug"));
        return;
    }
    const enabled = e.target.checked;
    await chrome.storage.local.set({ debugMode: enabled });
    updateDebugPanel(enabled);
    setStatusUi(true, enabled ? t("status.debugOn") : t("status.debugOff"));
});

document.getElementById("alertSound").addEventListener("change", async (e) => {
    await refreshEntitlementUi();
    if (e.target.checked && !can(ACTIONS.sound, entitlementState.resolved)) {
        e.target.checked = false;
        showUpgradeModal(t("pro.limitSound"));
        return;
    }
    const enabled = e.target.checked;
    await chrome.storage.local.set({ alertSound: enabled });
    setStatusUi(true, enabled ? t("status.soundOn") : t("status.soundOff"));
});

document.getElementById("testSoundBtn").addEventListener("click", async () => {
    await refreshEntitlementUi();
    if (!can(ACTIONS.sound, entitlementState.resolved)) {
        showUpgradeModal(t("pro.limitSound"));
        return;
    }
    await chrome.runtime.sendMessage({ type: "testAlertSound" });
});

document.getElementById("openDebugBtn").addEventListener("click", async () => {
    await refreshEntitlementUi();
    if (!can(ACTIONS.debug, entitlementState.resolved)) {
        showUpgradeModal(t("pro.limitDebug"));
        return;
    }
    chrome.windows.create({
        url: chrome.runtime.getURL("debug.html"),
        type: "popup",
        width: 980,
        height: 720
    });
});

document.getElementById("upgradeCloseBtn").addEventListener("click", hideUpgradeModal);
document.getElementById("upgradeOverlay").addEventListener("click", (e) => {
    if (e.target.id === "upgradeOverlay") hideUpgradeModal();
});
document.getElementById("upgradeCheckoutBtn").addEventListener("click", () => {
    openCheckoutPage();
});
document.getElementById("openCheckoutBtn").addEventListener("click", () => {
    openCheckoutPage();
});
document.getElementById("activateLicenseBtn").addEventListener("click", async () => {
    const input = document.getElementById("licenseKeyInput");
    const key = input.value.trim();
    if (!key) {
        setLicenseMsg(false, t("pro.emptyKey"));
        setStatusUi(false, t("pro.emptyKey"));
        return;
    }
    const btn = document.getElementById("activateLicenseBtn");
    btn.disabled = true;
    try {
        const res = await chrome.runtime.sendMessage({ type: "activateLicense", licenseKey: key });
        if (res?.ok) {
            const msg = t("pro.activated");
            setLicenseMsg(true, msg);
            setStatusUi(true, msg);
            input.value = "";
            await refreshEntitlementUi();
            loadAll();
        } else {
            const msg = licenseErrorMessage(res?.error);
            setLicenseMsg(false, msg);
            setStatusUi(false, msg);
        }
    } catch (err) {
        const msg = t("pro.networkError");
        setLicenseMsg(false, msg);
        setStatusUi(false, msg);
    } finally {
        btn.disabled = false;
    }
});
document.getElementById("clearLicenseBtn").addEventListener("click", async () => {
    await chrome.runtime.sendMessage({ type: "clearLicense" });
    const msg = t("pro.cleared");
    setLicenseMsg(true, msg);
    setStatusUi(true, msg);
    await refreshEntitlementUi();
    loadAll();
});
document.getElementById("licenseKeyInput").addEventListener("input", () => {
    setLicenseMsg(null, "");
});

document.getElementById("autoCart").addEventListener("change", async (e) => {
    await refreshEntitlementUi();
    if (e.target.checked && !can(ACTIONS.autoCart, entitlementState.resolved)) {
        e.target.checked = false;
        showUpgradeModal(t("pro.limitAutoCart"));
    }
});

document.getElementById("watchZero").addEventListener("change", () => onChannelToggle("zero"));
document.getElementById("watchNormal").addEventListener("change", () => onChannelToggle("normal"));

async function onChannelToggle(which) {
    await refreshEntitlementUi();
    const zEl = document.getElementById("watchZero");
    const nEl = document.getElementById("watchNormal");
    if (zEl.checked && nEl.checked && !can(ACTIONS.dualChannel, entitlementState.resolved)) {
        if (which === "zero") nEl.checked = false;
        else zEl.checked = false;
        showUpgradeModal(t("pro.limitDual"));
    }
}

document.getElementById("openWatchlistBtn").addEventListener("click", async () => {
    await refreshEntitlementUi();
    if (!can(ACTIONS.expandWatchlist, entitlementState.resolved)) {
        showUpgradeModal(t("pro.limitExpand"));
        return;
    }
    chrome.windows.create({
        url: chrome.runtime.getURL("watchlist.html"),
        type: "popup",
        width: 1280,
        height: 860
    });
});

document.getElementById("runCheckBtn").addEventListener("click", async () => {
    setStatusUi(true, t("status.checkRunning"));
    const res = await chrome.runtime.sendMessage({ type: "runCheckNow" });
    if (res?.ok) setStatusUi(true, t("status.checkDone"));
    else setStatusUi(false, res?.error || t("status.checkFailed"));
});

function updateDebugPanel(enabled) {
    document.getElementById("debugPanel").classList.toggle("show", Boolean(enabled));
}

document.getElementById("saveAddrBtn").addEventListener("click", async () => {
    const cartAddress = {
        name: document.getElementById("addrName").value.trim(),
        street: document.getElementById("addrStreet").value.trim(),
        zip: document.getElementById("addrZip").value.trim(),
        city: document.getElementById("addrCity").value.trim(),
        state_or_province: document.getElementById("addrState").value.trim(),
        country_code: document.getElementById("addrCountry").value.trim().toUpperCase()
    };
    if (!cartAddress.name || !cartAddress.street || !cartAddress.zip || !cartAddress.city || !cartAddress.country_code) {
        alert(t("alert.addrRequired"));
        return;
    }
    await chrome.storage.local.set({ cartAddress });
    setStatusUi(true, t("status.addrSaved"));
});

const VALID_TABS = ["carte", "archivio", "impostazioni"];

function setActiveTab(tabId) {
    const tab = VALID_TABS.includes(tabId) ? tabId : "carte";
    document.querySelectorAll(".tab-btn").forEach((btn) => {
        const active = btn.dataset.tab === tab;
        btn.classList.toggle("active", active);
        btn.setAttribute("aria-selected", active ? "true" : "false");
    });
    document.querySelectorAll(".tab-panel").forEach((panel) => {
        panel.classList.toggle("active", panel.id === `panel-${tab}`);
    });
    return tab;
}

async function switchTab(tabId) {
    const tab = setActiveTab(tabId);
    await chrome.storage.local.set({ activeTab: tab });
}

document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

document.getElementById("goToSettingsBtn").addEventListener("click", async () => {
    await switchTab("impostazioni");
    const tokenDetails = document.getElementById("tokenDetails");
    tokenDetails.open = true;
    await chrome.storage.local.set({ tokenPanelOpen: true });
    document.getElementById("apiToken").focus();
});

function updateTokenBanner(token) {
    document.getElementById("tokenBanner").classList.toggle("show", !token);
}

bindCollapsiblePanels();

function bindCollapsiblePanels() {
    document.querySelectorAll("details.collapsible[data-panel]").forEach((el) => {
        el.addEventListener("toggle", async () => {
            const key = el.dataset.panel;
            if (!key) return;
            await chrome.storage.local.set({ [key]: el.open });
        });
    });
}

document.getElementById("fillFromPageBtn").addEventListener("click", async () => {
    const btn = document.getElementById("fillFromPageBtn");
    btn.disabled = true;
    try {
        const card = await readCardFromActiveTab();
        if (!card?.blueprintId) {
            setStatusUi(false, card?.error || t("status.openCtCard"));
            return;
        }

        await switchTab("carte");
        document.getElementById("addCardDetails").open = true;
        await chrome.storage.local.set({ addCardPanelOpen: true });

        document.getElementById("blueprintId").value = String(card.blueprintId);
        if (card.label) {
            document.getElementById("cardLabel").value = card.label;
        }

        const priceEl = document.getElementById("targetPrice");
        if (!priceEl.value) {
            const stored = await chrome.storage.local.get(["defaultTargetPrice"]);
            if (stored.defaultTargetPrice != null) {
                priceEl.value = String(stored.defaultTargetPrice);
            }
        }

        setStatusUi(true, t("status.imported", { name: card.label || `ID ${card.blueprintId}` }));
        priceEl.focus();
        priceEl.select();
    } catch (err) {
        setStatusUi(false, err?.message || t("status.readPageFailed"));
    } finally {
        btn.disabled = false;
    }
});

document.getElementById("addBtn").addEventListener("click", async () => {
    await refreshEntitlementUi();
    const token = document.getElementById("apiToken").value.trim();
    const bId = parseInt(document.getElementById("blueprintId").value, 10);
    const price = parseFloat(document.getElementById("targetPrice").value);
    const label = document.getElementById("cardLabel").value.trim();
    let autoCart = document.getElementById("autoCart").checked;
    let watchZero = document.getElementById("watchZero").checked;
    let watchNormal = document.getElementById("watchNormal").checked;

    if (!token) {
        alert(t("alert.saveTokenFirst"));
        await switchTab("impostazioni");
        document.getElementById("tokenDetails").open = true;
        await chrome.storage.local.set({ tokenPanelOpen: true });
        document.getElementById("apiToken").focus();
        return;
    }
    if (!Number.isFinite(bId) || bId <= 0) {
        alert(t("alert.invalidBlueprint"));
        return;
    }
    if (!Number.isFinite(price) || price <= 0) {
        alert(t("alert.invalidPrice"));
        return;
    }
    if (!watchZero && !watchNormal) {
        alert(t("alert.selectChannel"));
        return;
    }

    const channels = clampChannels(watchZero, watchNormal, entitlementState.resolved);
    watchZero = channels.watchZero;
    watchNormal = channels.watchNormal;
    if (
        document.getElementById("watchZero").checked &&
        document.getElementById("watchNormal").checked &&
        !can(ACTIONS.dualChannel, entitlementState.resolved)
    ) {
        showUpgradeModal(t("pro.limitDual"));
        document.getElementById("watchZero").checked = watchZero;
        document.getElementById("watchNormal").checked = watchNormal;
        return;
    }

    autoCart = clampAutoCart(autoCart, entitlementState.resolved);
    document.getElementById("autoCart").checked = autoCart;

    const data = await chrome.storage.local.get(["watchList", "sniperList"]);
    let list = (data.watchList || (data.sniperList || []).map(legacyToWatch)).map(normalizeItem);

    const existing = list.findIndex((x) => x.bId === bId);
    if (existing < 0 && !can(ACTIONS.addCard, entitlementState.resolved, { watchListLength: list.length })) {
        showUpgradeModal(t("pro.limitCards", { max: maxCardsFor(entitlementState.resolved) }));
        return;
    }

    const prev = existing >= 0 ? list[existing] : null;
    const entry = {
        bId,
        target: price,
        autoCart,
        label,
        watchZero,
        watchNormal,
        lastAlertProductId: prev?.lastAlertProductId ?? null,
        lastAlertAt: prev?.lastAlertAt ?? null,
        lastAlertPrice: prev?.lastAlertPrice ?? null,
        lastAlertChannel: prev?.lastAlertChannel ?? null,
        lastSeenPrice: prev?.lastSeenPrice ?? null,
        lastSeenZero: prev?.lastSeenZero ?? null,
        lastSeenNormal: prev?.lastSeenNormal ?? null,
        lastSeenZeroAt: prev?.lastSeenZeroAt ?? null,
        lastSeenNormalAt: prev?.lastSeenNormalAt ?? null,
        minZero: prev?.minZero ?? prev?.lastSeenZero ?? null,
        minNormal: prev?.minNormal ?? prev?.lastSeenNormal ?? null,
        lastCartProductId: prev?.lastCartProductId ?? null
    };

    if (existing >= 0) list[existing] = entry;
    else list.push(entry);

    await chrome.storage.local.set({
        token,
        watchList: list,
        defaultTargetPrice: price,
        defaultWatchZero: watchZero,
        defaultWatchNormal: watchNormal,
        defaultAutoCart: autoCart
    });
    if (data.sniperList) {
        await chrome.storage.local.remove("sniperList");
    }

    document.getElementById("blueprintId").value = "";
    document.getElementById("cardLabel").value = "";
    document.getElementById("targetPrice").value = String(price);
    document.getElementById("autoCart").checked = autoCart;
    document.getElementById("watchZero").checked = watchZero;
    document.getElementById("watchNormal").checked = watchNormal;
    setStatusUi(true, t("status.addedKept"));
    loadList();
});

async function readCardFromActiveTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !tab.url) {
        return { error: t("status.noActiveTab") };
    }

    const fromUrl = parseCardFromUrl(tab.url);
    if (!fromUrl) {
        return { error: t("status.notCtCardPage") };
    }

    let label = fromUrl.label;
    try {
        const [{ result } = {}] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: scrapeCardPage
        });
        if (result?.label) label = result.label;
        if (result?.blueprintId) {
            return { blueprintId: result.blueprintId, label: label || result.label };
        }
    } catch (_) {
        // Fallback: URL already has blueprint ID
    }

    return { blueprintId: fromUrl.blueprintId, label };
}

function parseCardFromUrl(urlString) {
    let url;
    try {
        url = new URL(urlString);
    } catch (_) {
        return null;
    }
    if (!/(^|\.)cardtrader\.com$/i.test(url.hostname)) {
        return null;
    }

    const match = url.pathname.match(/\/cards\/(\d+)(?:-([^/?#]*))?/i);
    if (!match) return null;

    const blueprintId = parseInt(match[1], 10);
    if (!Number.isFinite(blueprintId) || blueprintId <= 0) return null;

    const slug = (match[2] || "").replace(/-/g, " ").trim();
    const label = slug
        ? slug.replace(/\b\w/g, (c) => c.toUpperCase())
        : "";

    return { blueprintId, label };
}

function scrapeCardPage() {
    const pathMatch = location.pathname.match(/\/cards\/(\d+)/i);
    const blueprintId = pathMatch ? parseInt(pathMatch[1], 10) : null;

    const h2 =
        document.querySelector("h2.d-inline.text-condensed") ||
        document.querySelector("h2.text-condensed") ||
        document.querySelector(".blueprint-image ~ * h2, .py-3 h2");
    let label = (h2?.textContent || "").trim();

    if (!label) {
        const og = document.querySelector('meta[property="og:title"]');
        label = (og?.getAttribute("content") || document.title || "")
            .replace(/\s*[|–-]\s*CardTrader.*$/i, "")
            .trim();
    }

    return {
        blueprintId: Number.isFinite(blueprintId) ? blueprintId : null,
        label: label || null
    };
}

document.addEventListener("click", async (e) => {
    const chartBtn = e.target.closest(".chart-btn");
    if (chartBtn) {
        const bId = parseInt(chartBtn.dataset.bid, 10);
        const label = chartBtn.dataset.label || `ID ${bId}`;
        openPriceChart(bId, label);
        return;
    }

    const purchasedBtn = e.target.closest(".purchased-btn");
    if (purchasedBtn) {
        const index = parseInt(purchasedBtn.dataset.index, 10);
        if (!Number.isFinite(index)) return;
        const data = await chrome.storage.local.get(["cartArchive"]);
        const archive = Array.isArray(data.cartArchive) ? data.cartArchive : [];
        if (!archive[index]) return;
        archive[index] = {
            ...archive[index],
            purchased: !archive[index].purchased
        };
        await chrome.storage.local.set({ cartArchive: archive });
        loadCartArchive();
        return;
    }

    if (!e.target.classList.contains("remove")) return;
    const listType = e.target.dataset.list;
    const index = parseInt(e.target.dataset.index, 10);

    if (listType === "archive") {
        if (!confirm(t("confirm.removeArchive"))) return;
        const data = await chrome.storage.local.get(["cartArchive"]);
        const archive = data.cartArchive || [];
        archive.splice(index, 1);
        await chrome.storage.local.set({ cartArchive: archive });
        loadCartArchive();
        return;
    }

    if (!confirm(t("confirm.removeWatch"))) return;

    const data = await chrome.storage.local.get(["watchList"]);
    const list = data.watchList || [];
    const removed = list[index];
    list.splice(index, 1);
    await chrome.storage.local.set({ watchList: list });
    if (removed?.bId != null) {
        chrome.runtime.sendMessage({ type: "removePriceHistory", bId: removed.bId });
    }
    loadList();
});

const CHART_RANGES = {
    day: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000
};

let chartState = { bId: null, label: "", range: "day" };
let chartHit = null;

document.getElementById("chartClose").addEventListener("click", closePriceChart);
document.getElementById("chartOverlay").addEventListener("click", (e) => {
    if (e.target.id === "chartOverlay") closePriceChart();
});
document.querySelectorAll("#chartRanges .range-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
        const range = btn.dataset.range || "day";
        await refreshEntitlementUi();
        if (!canChartRange(range, entitlementState.resolved)) {
            showUpgradeModal(t("pro.limitChart"));
            return;
        }
        chartState.range = range;
        document.querySelectorAll("#chartRanges .range-btn").forEach((b) => {
            b.classList.toggle("active", b === btn);
        });
        renderPriceChart();
    });
});

async function openPriceChart(bId, label) {
    chartState = { bId, label, range: chartState.range || "day" };
    document.querySelectorAll("#chartRanges .range-btn").forEach((b) => {
        b.classList.toggle("active", b.dataset.range === chartState.range);
    });
    document.getElementById("chartTitle").innerHTML =
        `${escapeHtml(label)}<small>${t("chart.blueprint", { id: bId })}</small>`;
    document.getElementById("chartOverlay").classList.add("show");
    document.getElementById("chartOverlay").setAttribute("aria-hidden", "false");
    await renderPriceChart();
}

function closePriceChart() {
    hideChartTooltip();
    chartHit = null;
    document.getElementById("chartOverlay").classList.remove("show");
    document.getElementById("chartOverlay").setAttribute("aria-hidden", "true");
}

async function renderPriceChart() {
    const { bId, range } = chartState;
    if (!bId) return;

    const data = await chrome.storage.local.get(["priceHistory"]);
    const all = data.priceHistory || {};
    const points = Array.isArray(all[String(bId)]) ? all[String(bId)] : [];
    const windowMs = CHART_RANGES[range] || CHART_RANGES.day;
    const from = Date.now() - windowMs;
    const filtered = points
        .filter((p) => p && Number.isFinite(p.t) && p.t >= from)
        .sort((a, b) => a.t - b.t);

    const empty = document.getElementById("chartEmpty");
    const canvas = document.getElementById("chartCanvas");
    const wrap = document.getElementById("chartCanvasWrap");
    const statsEl = document.getElementById("chartStats");

    if (filtered.length === 0) {
        empty.classList.add("show");
        wrap.style.display = "none";
        statsEl.textContent = t("chart.noSamples");
        hideChartTooltip();
        chartHit = null;
        return;
    }

    empty.classList.remove("show");
    wrap.style.display = "block";

    const zeros = filtered.map((p) => p.z).filter((v) => v != null && Number.isFinite(v));
    const normals = filtered.map((p) => p.n).filter((v) => v != null && Number.isFinite(v));
    const last = filtered[filtered.length - 1];
    const first = filtered[0];

    const delta = (series) => {
        if (series.length < 2) return null;
        return series[series.length - 1] - series[0];
    };
    const fmtDelta = (d) => {
        if (d == null) return "—";
        const sign = d > 0 ? "+" : "";
        return `${sign}€${d.toFixed(2)}`;
    };

    const zDelta = delta(zeros);
    const nDelta = delta(normals);
    const zMin = zeros.length ? Math.min(...zeros) : null;
    const zMax = zeros.length ? Math.max(...zeros) : null;
    const nMin = normals.length ? Math.min(...normals) : null;
    const nMax = normals.length ? Math.max(...normals) : null;

    statsEl.innerHTML = `
      <span>${t("chart.stats.samples", { n: `<b>${filtered.length}</b>` })}</span>
      <span>${t("chart.stats.zero", { price: `<b>${formatEuro(last.z)}</b>`, delta: fmtDelta(zDelta) })}</span>
      <span>${t("chart.stats.normal", { price: `<b>${formatEuro(last.n)}</b>`, delta: fmtDelta(nDelta) })}</span>
      <span>${t("chart.stats.minZN", { z: `<b>${formatEuro(zMin)}</b>`, n: `<b>${formatEuro(nMin)}</b>` })}</span>
      <span>${t("chart.stats.maxZN", { z: `<b>${formatEuro(zMax)}</b>`, n: `<b>${formatEuro(nMax)}</b>` })}</span>
      <span>${t("chart.stats.from", { when: formatCheckTime(first.t) })}</span>
    `;

    drawPriceChart(canvas, filtered, range);
}

function drawPriceChart(canvas, points, range) {
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth || 340;
    const cssH = 180;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);

    const pad = { top: 12, right: 10, bottom: 28, left: 38 };
    const w = cssW - pad.left - pad.right;
    const h = cssH - pad.top - pad.bottom;

    const values = [];
    points.forEach((p) => {
        if (p.z != null && Number.isFinite(p.z)) values.push(p.z);
        if (p.n != null && Number.isFinite(p.n)) values.push(p.n);
    });
    if (!values.length) {
        chartHit = null;
        hideChartTooltip();
        return;
    }

    let minY = Math.min(...values);
    let maxY = Math.max(...values);
    if (minY === maxY) {
        minY = Math.max(0, minY - 0.5);
        maxY = maxY + 0.5;
    } else {
        const padY = (maxY - minY) * 0.12;
        minY = Math.max(0, minY - padY);
        maxY += padY;
    }

    const t0 = points[0].t;
    const t1 = points[points.length - 1].t;
    const tSpan = Math.max(1, t1 - t0);

    chartHit = {
        canvas,
        points,
        range,
        pad,
        minY,
        maxY,
        t0,
        tSpan,
        w,
        h,
        cssW,
        cssH,
        dpr,
        hoverIndex: null
    };
    paintPriceChart(chartHit);
    bindChartInteraction(canvas);
}

function paintPriceChart(hit) {
    if (!hit) return;
    const { canvas, points, range, pad, minY, maxY, t0, tSpan, w, h, cssW, cssH, dpr, hoverIndex } = hit;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    const xAt = (t) => pad.left + ((t - t0) / tSpan) * w;
    const yAt = (v) => pad.top + ((maxY - v) / (maxY - minY)) * h;

    ctx.strokeStyle = "#ecf0f1";
    ctx.lineWidth = 1;
    ctx.fillStyle = "#95a5a6";
    ctx.font = "10px Segoe UI, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let i = 0; i <= 4; i++) {
        const v = minY + ((maxY - minY) * i) / 4;
        const y = yAt(v);
        ctx.beginPath();
        ctx.moveTo(pad.left, y);
        ctx.lineTo(pad.left + w, y);
        ctx.stroke();
        ctx.fillText(`€${v.toFixed(2)}`, pad.left - 4, y);
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const labelCount = range === "day" ? 4 : 5;
    for (let i = 0; i <= labelCount; i++) {
        const t = t0 + (tSpan * i) / labelCount;
        const x = xAt(t);
        ctx.fillStyle = "#95a5a6";
        ctx.fillText(formatChartTick(t, range), x, pad.top + h + 6);
    }

    const drawSeries = (key, color) => {
        const series = points.filter((p) => p[key] != null && Number.isFinite(p[key]));
        if (series.length === 0) return;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.beginPath();
        series.forEach((p, i) => {
            const x = xAt(p.t);
            const y = yAt(p[key]);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        if (series.length <= 40) {
            ctx.fillStyle = color;
            series.forEach((p) => {
                ctx.beginPath();
                ctx.arc(xAt(p.t), yAt(p[key]), 2.2, 0, Math.PI * 2);
                ctx.fill();
            });
        }
    };

    drawSeries("z", "#27ae60");
    drawSeries("n", "#2980b9");

    if (hoverIndex == null || !points[hoverIndex]) return;

    const hp = points[hoverIndex];
    const hx = xAt(hp.t);

    ctx.save();
    ctx.strokeStyle = "rgba(127, 140, 141, 0.85)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(hx, pad.top);
    ctx.lineTo(hx, pad.top + h);
    ctx.stroke();
    ctx.restore();

    const drawHoverDot = (key, color) => {
        if (hp[key] == null || !Number.isFinite(hp[key])) return;
        const hy = yAt(hp[key]);
        ctx.beginPath();
        ctx.fillStyle = "#fff";
        ctx.arc(hx, hy, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.arc(hx, hy, 3, 0, Math.PI * 2);
        ctx.fill();
    };
    drawHoverDot("z", "#27ae60");
    drawHoverDot("n", "#2980b9");
}

function bindChartInteraction(canvas) {
    if (canvas.dataset.chartBound === "1") return;
    canvas.dataset.chartBound = "1";

    canvas.addEventListener("mousemove", (e) => {
        if (!chartHit || chartHit.canvas !== canvas) return;
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const { pad, w, h, points, t0, tSpan } = chartHit;

        if (mx < pad.left || mx > pad.left + w || my < pad.top || my > pad.top + h) {
            if (chartHit.hoverIndex != null) {
                chartHit.hoverIndex = null;
                paintPriceChart(chartHit);
            }
            hideChartTooltip();
            return;
        }

        const xAt = (t) => pad.left + ((t - t0) / tSpan) * w;
        let best = 0;
        let bestDist = Infinity;
        for (let i = 0; i < points.length; i++) {
            const dist = Math.abs(xAt(points[i].t) - mx);
            if (dist < bestDist) {
                bestDist = dist;
                best = i;
            }
        }

        if (chartHit.hoverIndex !== best) {
            chartHit.hoverIndex = best;
            paintPriceChart(chartHit);
        }
        const wrap = document.getElementById("chartCanvasWrap");
        const wrapRect = wrap.getBoundingClientRect();
        showChartTooltip(
            points[best],
            e.clientX - wrapRect.left,
            e.clientY - wrapRect.top,
            wrap.clientWidth
        );
    });

    canvas.addEventListener("mouseleave", () => {
        if (!chartHit || chartHit.canvas !== canvas) return;
        chartHit.hoverIndex = null;
        paintPriceChart(chartHit);
        hideChartTooltip();
    });
}

function showChartTooltip(point, mx, my, wrapWidth) {
    const tip = document.getElementById("chartTooltip");
    if (!tip || !point) return;

    const rows = [`<div class="time">${escapeHtml(formatCheckTime(point.t))}</div>`];
    rows.push(
        `<div class="row-z">${escapeHtml(t("channel.ctZero"))}: ${escapeHtml(formatEuro(point.z))}</div>`
    );
    rows.push(
        `<div class="row-n">${escapeHtml(t("channel.normal"))}: ${escapeHtml(formatEuro(point.n))}</div>`
    );
    tip.innerHTML = rows.join("");
    tip.classList.add("show");
    tip.setAttribute("aria-hidden", "false");

    const offset = 12;
    tip.style.left = "0px";
    tip.style.top = "0px";
    const tipW = tip.offsetWidth || 110;
    const tipH = tip.offsetHeight || 44;
    let left = mx + offset;
    let top = my - tipH - 6;
    if (left + tipW > wrapWidth - 4) left = mx - tipW - offset;
    if (left < 4) left = 4;
    if (top < 4) top = my + offset;
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
}

function hideChartTooltip() {
    const tip = document.getElementById("chartTooltip");
    if (!tip) return;
    tip.classList.remove("show");
    tip.setAttribute("aria-hidden", "true");
    tip.innerHTML = "";
}

function formatChartTick(ts, range) {
    const d = new Date(ts);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    if (range === "day") return `${hh}:${mm}`;
    if (range === "week") return `${day}/${month}`;
    return `${day}/${month}`;
}

document.getElementById("clearArchiveBtn").addEventListener("click", async () => {
    if (!confirm(t("confirm.clearArchive"))) return;
    await chrome.storage.local.set({ cartArchive: [] });
    loadCartArchive();
});

function legacyToWatch(item) {
    return normalizeItem({
        ...item,
        autoCart: false,
        label: "",
        watchZero: true,
        watchNormal: true
    });
}

function normalizeItem(item) {
    const watchZero = item.watchZero !== false;
    let watchNormal = item.watchNormal !== false;
    if (!watchZero && !watchNormal) watchNormal = true;
    const lastSeenZero = item.lastSeenZero ?? null;
    const lastSeenNormal = item.lastSeenNormal ?? null;
    return {
        bId: Number(item.bId),
        target: Number(item.target),
        autoCart: Boolean(item.autoCart),
        label: typeof item.label === "string" ? item.label : "",
        watchZero,
        watchNormal,
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

function formatEuro(v) {
    if (v == null || !Number.isFinite(Number(v))) return "—";
    return `€${Number(v).toFixed(2)}`;
}

function channelBadge(item) {
    if (item.watchZero && item.watchNormal) {
        return `<span class="badge both">${t("channel.zeroPlusNormal")}</span>`;
    }
    if (item.watchZero) return `<span class="badge zero">${t("channel.onlyZero")}</span>`;
    return `<span class="badge normal">${t("channel.onlyNormal")}</span>`;
}

function channelClass(item) {
    if (item.watchZero && item.watchNormal) return "ch-both";
    if (item.watchZero) return "ch-zero";
    return "ch-normal";
}

function isUnderTarget(item) {
    const z =
        item.watchZero &&
        item.lastSeenZero != null &&
        Number(item.lastSeenZero) <= Number(item.target);
    const n =
        item.watchNormal &&
        item.lastSeenNormal != null &&
        Number(item.lastSeenNormal) <= Number(item.target);
    return Boolean(z || n);
}

function formatCheckTime(ts) {
    if (ts == null || !Number.isFinite(Number(ts))) return "—";
    const d = new Date(Number(ts));
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${hh}:${mm} ${day}/${month}/${year}`;
}

function cardTraderUrl(bId) {
    return `https://www.cardtrader.com/cards/${Number(bId)}`;
}

function cardNameLink(bId, label, withId = true) {
    const name = escapeHtml(label || `ID ${bId}`);
    const idBit = withId && label ? ` <small>(${bId})</small>` : "";
    return `<a class="card-link" href="${cardTraderUrl(bId)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(t("card.openOnCt"))}">${name}</a>${idBit}`;
}

function priceLine(tag, tagClass, nowValue, minValue, checkedAt, watching, target) {
    const off = watching ? "" : "off";
    const watchNote = watching ? "" : ` ${t("card.notWatched")}`;
    const minTxt = formatEuro(minValue);
    const nowTxt = formatEuro(nowValue);
    const when = formatCheckTime(checkedAt);
    const underTarget =
        watching && nowValue != null && Number(nowValue) <= Number(target);
    const nowBlockInner = t("price.nowBlock", { now: nowTxt, when });
    const nowBlock = underTarget
        ? `<span class="now-under">${nowBlockInner}</span>`
        : nowBlockInner;
    return `<div class="price-line ${off}">
      <span class="tag ${tagClass}">${tag}${watchNote}</span>
      <span class="val">${t("price.minNow", { min: minTxt, nowBlock })}${trendIcon(nowValue, minValue)}</span>
    </div>`;
}

function trendIcon(nowValue, minValue) {
    const now = Number(nowValue);
    const min = Number(minValue);
    if (!Number.isFinite(now) || !Number.isFinite(min)) return "";
    if (now < min) {
        return ` <span class="trend down" title="${escapeHtml(t("trend.nowBelowMin"))}">↓</span>`;
    }
    if (now > min) {
        return ` <span class="trend up" title="${escapeHtml(t("trend.nowAboveMin"))}">↑</span>`;
    }
    return ` <span class="trend eq" title="${escapeHtml(t("trend.nowEqualMin"))}">=</span>`;
}

async function loadAll() {
    await refreshEntitlementUi();
    const data = await chrome.storage.local.get([
        "token",
        "watchList",
        "sniperList",
        "pollMinutes",
        "lastStatus",
        "debugMode",
        "alertSound",
        "cartAddress",
        "defaultTargetPrice",
        "defaultWatchZero",
        "defaultWatchNormal",
        "defaultAutoCart",
        "activeTab",
        "addCardPanelOpen",
        "tokenPanelOpen",
        "pollPanelOpen",
        "addrPanelOpen",
        "soundPanelOpen",
        "debugPanelOpen",
        "proPanelOpen",
        "licenseKey"
    ]);

    if (data.token) {
        document.getElementById("apiToken").value = data.token;
    }
    updateTokenBanner(data.token || "");
    setActiveTab(data.activeTab || "carte");
    restoreCollapsiblePanels(data);

    const poll = clampPollMinutes(data.pollMinutes ?? FREE_POLL_MINUTES, entitlementState.resolved);
    document.getElementById("pollMinutes").value = poll;
    if (!can(ACTIONS.pollFast, entitlementState.resolved) && data.pollMinutes !== FREE_POLL_MINUTES) {
        await chrome.storage.local.set({ pollMinutes: FREE_POLL_MINUTES });
    }

    const debugOk = can(ACTIONS.debug, entitlementState.resolved);
    document.getElementById("debugMode").checked = debugOk && Boolean(data.debugMode);
    if (!debugOk && data.debugMode) {
        await chrome.storage.local.set({ debugMode: false });
    }
    updateDebugPanel(document.getElementById("debugMode").checked);

    const soundOk = can(ACTIONS.sound, entitlementState.resolved);
    document.getElementById("alertSound").checked = soundOk && data.alertSound !== false;
    if (!soundOk) {
        document.getElementById("alertSound").checked = false;
    }

    if (data.defaultTargetPrice != null && Number(data.defaultTargetPrice) > 0) {
        document.getElementById("targetPrice").value = String(data.defaultTargetPrice);
    }

    let watchZero = data.defaultWatchZero !== undefined ? Boolean(data.defaultWatchZero) : true;
    let watchNormal = data.defaultWatchNormal !== undefined ? Boolean(data.defaultWatchNormal) : false;
    const ch = clampChannels(watchZero, watchNormal, entitlementState.resolved);
    document.getElementById("watchZero").checked = ch.watchZero;
    document.getElementById("watchNormal").checked = ch.watchNormal;

    let autoCart = data.defaultAutoCart !== undefined ? Boolean(data.defaultAutoCart) : true;
    autoCart = clampAutoCart(autoCart, entitlementState.resolved);
    document.getElementById("autoCart").checked = autoCart;

    if (data.licenseKey) {
        document.getElementById("licenseKeyInput").placeholder = data.licenseKey;
    }

    if (data.cartAddress) {
        document.getElementById("addrName").value = data.cartAddress.name || "";
        document.getElementById("addrStreet").value = data.cartAddress.street || "";
        document.getElementById("addrZip").value = data.cartAddress.zip || "";
        document.getElementById("addrCity").value = data.cartAddress.city || "";
        document.getElementById("addrState").value = data.cartAddress.state_or_province || "";
        document.getElementById("addrCountry").value = data.cartAddress.country_code || "";
    }

    if (!data.watchList && data.sniperList) {
        const migrated = data.sniperList.map(legacyToWatch);
        await chrome.storage.local.set({ watchList: migrated });
        await chrome.storage.local.remove("sniperList");
    }

    if (data.lastStatus) {
        setStatusUi(data.lastStatus.ok, data.lastStatus.message);
    }

    loadList();
    loadCartArchive();
}

function restoreCollapsiblePanels(data) {
    document.querySelectorAll("details.collapsible[data-panel]").forEach((el) => {
        const key = el.dataset.panel;
        el.open = Boolean(data[key]);
    });
}

function loadCartArchive() {
    chrome.storage.local.get(["cartArchive"], (data) => {
        const container = document.getElementById("cartArchiveList");
        const archive = Array.isArray(data.cartArchive) ? data.cartArchive : [];
        container.innerHTML = "";

        let totalQty = 0;
        let totalSpend = 0;

        if (archive.length === 0) {
            container.innerHTML = `<div class="empty">${escapeHtml(t("archive.empty"))}</div>`;
        } else {
            archive.forEach((item, index) => {
                const qty = Number(item.quantity) || 1;
                const unit = Number(item.unitPrice) || 0;
                const line = qty * unit;
                totalQty += qty;
                totalSpend += line;

                const channel =
                    item.channel === "zero"
                        ? `<span class="badge zero">${t("channel.zero")}</span>`
                        : `<span class="badge normal">${t("channel.normal")}</span>`;
                const when = item.addedAt
                    ? new Date(item.addedAt).toLocaleString(getLocaleBcp47())
                    : "";

                const purchased = Boolean(item.purchased);
                const div = document.createElement("div");
                div.className = `archive-item${purchased ? " purchased" : ""}`;
                const qtyLine = t("archive.qtyLine", {
                    qty: `<b>${qty}</b>`,
                    unit: unit.toFixed(2),
                    line: `<b>€${line.toFixed(2)}</b>`
                });
                const metaLine = t("archive.metaLine", {
                    bId: item.bId ?? "—",
                    productId: item.productId ?? "—"
                });
                div.innerHTML = `
                  <div>
                    <div>${cardNameLink(item.bId, item.label, false)} ${channel}</div>
                    <div class="meta">${qtyLine}</div>
                    <div class="meta">
                      ${metaLine}
                      ${when ? ` · ${when}` : ""}
                    </div>
                  </div>
                  <div class="archive-actions">
                    <button type="button" class="purchased-btn${purchased ? " on" : ""}" data-index="${index}" title="${escapeHtml(purchased ? t("archive.markNotPurchased") : t("archive.markPurchased"))}">
                      ${escapeHtml(t("archive.purchased"))}
                    </button>
                    <span class="remove" data-list="archive" data-index="${index}" title="${escapeHtml(t("archive.removeTitle"))}">✖</span>
                  </div>
                `;
                container.appendChild(div);
            });
        }

        document.getElementById("archiveCount").textContent = String(archive.length);
        document.getElementById("archiveQty").textContent = String(totalQty);
        document.getElementById("archiveSpend").textContent = `€${totalSpend.toFixed(2)}`;

        const badge = document.getElementById("archiveTabBadge");
        if (badge) {
            const show = totalQty > 0;
            badge.classList.toggle("show", show);
            badge.textContent = show ? String(totalQty) : "0";
            badge.title = `${archive.length} ${t("archive.cards")} · €${totalSpend.toFixed(2)}`;
        }
    });
}

function loadList() {
    chrome.storage.local.get(["watchList"], (data) => {
        const container = document.getElementById("list");
        container.innerHTML = "";
        const list = (data.watchList || []).map(normalizeItem);

        if (list.length === 0) {
            container.innerHTML = `<div class="empty">${escapeHtml(t("list.empty"))}</div>`;
            return;
        }

        list.forEach((item, index) => {
            const div = document.createElement("div");
            const under = isUnderTarget(item);
            div.className = `card-item ${channelClass(item)}${under ? " under" : ""}`;
            const title = cardNameLink(item.bId, item.label, true);
            const autoClass = item.autoCart ? "on" : "off";
            const autoText = item.autoCart ? t("badge.autoCartYes") : t("badge.autoCartNo");
            const lastAlert =
                item.lastAlertChannel && item.lastAlertPrice != null
                    ? t("card.lastAlert", {
                        channel: item.lastAlertChannel === "zero" ? t("channel.zero") : t("channel.normal"),
                        price: formatEuro(item.lastAlertPrice)
                    })
                    : "";

            const chartIcon = `<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="1" y="1" width="14" height="14" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M4 11V8M8 11V5M12 11V7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;
            const safeLabel = escapeHtml(item.label || `ID ${item.bId}`);

            div.innerHTML = `
                <div class="card-head">
                  <div class="card-main">
                    <button type="button" class="chart-btn" data-bid="${item.bId}" data-label="${safeLabel}" title="${escapeHtml(t("card.priceChart"))}">
                      ${chartIcon}
                    </button>
                    <div class="card-body">
                      <div>${title} ${channelBadge(item)}</div>
                      <div class="card-meta">
                        ${escapeHtml(t("card.max"))} <b>${formatEuro(item.target)}</b>
                        · <span class="badge ${autoClass}">${escapeHtml(autoText)}</span>
                      </div>
                      <div class="prices">
                        ${priceLine(t("channel.ctZero"), "zero", item.lastSeenZero, item.minZero, item.lastSeenZeroAt, item.watchZero, item.target)}
                        ${priceLine(t("channel.normal"), "normal", item.lastSeenNormal, item.minNormal, item.lastSeenNormalAt, item.watchNormal, item.target)}
                      </div>
                      ${lastAlert ? `<div class="card-meta">${escapeHtml(lastAlert)}</div>` : ""}
                    </div>
                  </div>
                  <div class="card-actions">
                    <span class="remove" data-list="watch" data-index="${index}" title="${escapeHtml(t("card.remove"))}">✖</span>
                  </div>
                </div>
            `;
            container.appendChild(div);
        });
    });
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

async function refreshEntitlementUi() {
    try {
        const res = await chrome.runtime.sendMessage({ type: "getEntitlement" });
        if (res?.ok) {
            entitlementState = res;
        } else {
            entitlementState = await loadResolvedEntitlement();
        }
    } catch {
        entitlementState = await loadResolvedEntitlement();
    }

    const resolved = entitlementState.resolved || { tier: "free", source: "free" };
    const badge = document.getElementById("planBadge");
    const meta = document.getElementById("planMeta");
    if (badge) {
        badge.classList.remove("pro", "trial", "grace");
        if (resolved.source === "trial") {
            badge.textContent = t("pro.badgeTrial");
            badge.classList.add("trial");
        } else if (resolved.source === "grace") {
            badge.textContent = t("pro.badgeGrace");
            badge.classList.add("grace");
        } else if (isPro(resolved)) {
            badge.textContent = t("pro.badgePro");
            badge.classList.add("pro");
        } else {
            badge.textContent = t("pro.badgeFree");
        }
    }
    if (meta) {
        if (resolved.source === "trial" && resolved.trialEndsAt) {
            const days = Math.max(
                0,
                Math.ceil((resolved.trialEndsAt - Date.now()) / (24 * 60 * 60 * 1000))
            );
            meta.textContent = t("pro.trialLeft", { days });
        } else if (
            (resolved.source === "license" || resolved.source === "grace") &&
            resolved.trialPausedMs > 0
        ) {
            const days = Math.max(0, Math.ceil(resolved.trialPausedMs / (24 * 60 * 60 * 1000)));
            meta.textContent = t("pro.trialPaused", { days });
        } else if (!isPro(resolved)) {
            meta.textContent = t("pro.featuresHint");
        } else {
            meta.textContent = t("pro.summary", { tier: "Pro" });
        }
    }

    const pro = isPro(resolved);
    setProTag("autoCartProTag", !pro);
    setProTag("pollProTag", !pro);
    setProTag("soundProTag", !pro);
    setProTag("debugProTag", !pro);
    setProTag("expandProTag", !pro);
    document.getElementById("openWatchlistBtn")?.classList.toggle("pro-lock", !pro);
    document.getElementById("autoCartLabel")?.classList.toggle("pro-lock", !pro);
    document.getElementById("alertSoundLabel")?.classList.toggle("pro-lock", !pro);
    document.getElementById("pollMinutes").disabled = !pro;
    document.getElementById("debugDetails").hidden = !pro;
    document.querySelectorAll("#chartRanges .range-btn").forEach((btn) => {
        const range = btn.dataset.range || "day";
        const locked = !canChartRange(range, resolved);
        btn.classList.toggle("pro-locked", locked);
        btn.title = locked ? t("pro.limitChart") : "";
    });
    if (chartState?.bId && !canChartRange(chartState.range, resolved)) {
        chartState.range = "day";
        document.querySelectorAll("#chartRanges .range-btn").forEach((b) => {
            b.classList.toggle("active", b.dataset.range === "day");
        });
        renderPriceChart();
    }
}

function setProTag(id, show) {
    const el = document.getElementById(id);
    if (el) el.hidden = !show;
}

function showUpgradeModal(bodyText) {
    const overlay = document.getElementById("upgradeOverlay");
    const body = document.getElementById("upgradeBody");
    if (body) body.textContent = bodyText || t("pro.upgradeBody");
    overlay?.classList.add("show");
    overlay?.setAttribute("aria-hidden", "false");
}

function hideUpgradeModal() {
    const overlay = document.getElementById("upgradeOverlay");
    overlay?.classList.remove("show");
    overlay?.setAttribute("aria-hidden", "true");
}

function licenseErrorMessage(error) {
    const code = String(error || "");
    if (code === "empty_key") return t("pro.emptyKey");
    if (code === "invalid_key" || code.startsWith("http_")) return t("pro.invalidKey");
    if (code === "network") return t("pro.networkError");
    return t("pro.activateFailed");
}

function setLicenseMsg(ok, message) {
    const el = document.getElementById("licenseMsg");
    if (!el) return;
    el.textContent = message || "";
    if (ok === true) el.className = "ok";
    else if (ok === false) el.className = "err";
    else el.className = "";
}

function setStatusUi(ok, message) {
    const el = document.getElementById("status-box");
    el.textContent = message || "";
    el.className = ok ? "ok" : "err";
}

chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes.watchList) loadList();
    if (changes.cartArchive) loadCartArchive();
    if (changes.priceHistory && chartState.bId) renderPriceChart();
    if (changes.token) updateTokenBanner(changes.token.newValue || "");
    if (changes.entitlement || changes.devForcePro || changes.installAt) {
        refreshEntitlementUi();
    }
    if (changes.lastStatus && changes.lastStatus.newValue) {
        const s = changes.lastStatus.newValue;
        setStatusUi(s.ok, s.message);
    }
});

function avviaVisualizzazioneTimer() {
    const display = document.getElementById("countdown");

    setInterval(async () => {
        const data = await chrome.storage.local.get(["nextTick"]);
        if (!data.nextTick) {
            display.innerText = "--:--";
            return;
        }

        const differenza = data.nextTick - Date.now();
        if (differenza <= 0) {
            display.innerText = t("timer.inProgress");
            return;
        }

        const minuti = Math.floor(differenza / 60000);
        const secondi = Math.floor((differenza % 60000) / 1000);
        display.innerText = `${String(minuti).padStart(2, "0")}:${String(secondi).padStart(2, "0")}`;
    }, 1000);
}
