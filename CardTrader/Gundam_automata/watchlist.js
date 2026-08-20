import { init as initI18n, t, applyDom, getLocaleBcp47, onLocaleChange } from "./i18n.js";
import { canChartRange, loadResolvedEntitlement, ACTIONS, can } from "./entitlements.js";
import { openCheckoutPage } from "./licenseApi.js";
import { filterSummary, normalizeWatchItem } from "./watchItem.js";

let allItems = [];
let searchTimer = null;
let chartState = { bId: null, label: "", range: "day" };
let chartHit = null;
let resolvedEntitlement = { tier: "free", source: "free" };

const CHART_RANGES = {
    day: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000
};

const CHART_ICON = `<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="1" y="1" width="14" height="14" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M4 11V8M8 11V5M12 11V7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;

const searchEl = document.getElementById("search");
const clearBtn = document.getElementById("clearSearch");
const sortEl = document.getElementById("sort");
const grid = document.getElementById("grid");
const empty = document.getElementById("empty");
const countInfo = document.getElementById("countInfo");

document.addEventListener("DOMContentLoaded", async () => {
    await initI18n();
    applyDom();
    document.title = t("watchlist.pageTitle");
    const info = await loadResolvedEntitlement();
    resolvedEntitlement = info.resolved;
    if (!can(ACTIONS.expandWatchlist, resolvedEntitlement)) {
        document.body.innerHTML = `
          <main style="padding:24px;font-family:Segoe UI,sans-serif;max-width:420px;margin:40px auto;text-align:center;">
            <h1 style="font-size:1.2em;color:#2c3e50;">${escapeHtml(t("pro.upgradeTitle"))}</h1>
            <p style="color:#555;line-height:1.45;">${escapeHtml(t("pro.limitExpand"))}</p>
            <button type="button" id="wlUpgradeBtn" style="margin-top:12px;padding:10px 14px;background:#2980b9;color:#fff;border:none;border-radius:4px;font-weight:600;cursor:pointer;">
              ${escapeHtml(t("pro.openCheckout"))}
            </button>
          </main>`;
        document.getElementById("wlUpgradeBtn")?.addEventListener("click", () => openCheckoutPage());
        return;
    }
    loadList();
    searchEl.focus();
});

onLocaleChange(async () => {
    applyDom();
    document.title = t("watchlist.pageTitle");
    render();
    if (chartState.bId) {
        document.getElementById("chartTitle").innerHTML =
            `${escapeHtml(chartState.label)}<small>${t("chart.blueprint", { id: chartState.bId })}</small>`;
        renderPriceChart();
    }
});

searchEl.addEventListener("input", () => {
    clearBtn.classList.toggle("show", Boolean(searchEl.value));
    clearTimeout(searchTimer);
    searchTimer = setTimeout(render, 80);
});

clearBtn.addEventListener("click", () => {
    searchEl.value = "";
    clearBtn.classList.remove("show");
    searchEl.focus();
    render();
});

sortEl.addEventListener("change", render);
["filterUnder", "filterZero", "filterNormal", "filterAuto"].forEach((id) => {
    document.getElementById(id).addEventListener("change", render);
});

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        const overlay = document.getElementById("chartOverlay");
        if (overlay.classList.contains("show")) {
            closePriceChart();
            return;
        }
        if (document.activeElement === searchEl && searchEl.value) {
            searchEl.value = "";
            clearBtn.classList.remove("show");
            render();
        }
        return;
    }
    if (e.key === "/" && document.activeElement !== searchEl && !document.activeElement?.classList?.contains("target-edit")) {
        e.preventDefault();
        searchEl.focus();
        searchEl.select();
    }
});

grid.addEventListener("click", async (e) => {
    if (e.target.closest(".target-edit")) return;
    const chartBtn = e.target.closest(".chart-btn");
    if (chartBtn) {
        const bId = parseInt(chartBtn.dataset.bid, 10);
        const label = chartBtn.dataset.label || `ID ${bId}`;
        if (!Number.isFinite(bId)) return;
        openPriceChart(bId, label);
        return;
    }

    const resumeBtn = e.target.closest(".resume-btn");
    if (resumeBtn) {
        const bId = parseInt(resumeBtn.dataset.bid, 10);
        if (!Number.isFinite(bId)) return;
        const data = await chrome.storage.local.get(["watchList"]);
        const list = (data.watchList || []).map(normalizeWatchItem);
        const idx = list.findIndex((x) => Number(x.bId) === bId);
        if (idx < 0) return;
        list[idx] = { ...list[idx], paused: false, cartedQty: 0, lastCartProductId: null };
        await chrome.storage.local.set({ watchList: list });
        allItems = list;
        render();
        return;
    }

    const removeBtn = e.target.closest(".remove-btn");
    if (!removeBtn) return;
    const bId = parseInt(removeBtn.dataset.bid, 10);
    if (!Number.isFinite(bId)) return;
    if (!confirm(t("confirm.removeWatchId", { id: bId }))) return;
    const data = await chrome.storage.local.get(["watchList"]);
    const list = (data.watchList || []).filter((x) => Number(x.bId) !== bId);
    await chrome.storage.local.set({ watchList: list });
    chrome.runtime.sendMessage({ type: "removePriceHistory", bId });
});

grid.addEventListener("change", async (e) => {
    const input = e.target.closest(".target-edit");
    if (!input) return;
    const bId = parseInt(input.dataset.bid, 10);
    const ok = await saveWatchTarget(bId, input.value);
    input.classList.toggle("invalid", !ok);
    if (ok) {
        const n = Math.round(parseFloat(input.value) * 100) / 100;
        if (Number.isFinite(n)) input.value = n.toFixed(2);
        const item = allItems.find((x) => Number(x.bId) === bId);
        if (item) item.target = n;
    }
});

grid.addEventListener(
    "blur",
    (e) => {
        if (!e.target.classList?.contains("target-edit")) return;
        setTimeout(() => {
            if (document.activeElement?.classList?.contains("target-edit")) return;
            loadList();
        }, 0);
    },
    true
);

document.getElementById("chartClose").addEventListener("click", closePriceChart);
document.getElementById("chartOverlay").addEventListener("click", (e) => {
    if (e.target.id === "chartOverlay") closePriceChart();
});
document.querySelectorAll("#chartRanges .range-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
        const range = btn.dataset.range || "day";
        const info = await loadResolvedEntitlement();
        resolvedEntitlement = info.resolved;
        if (!canChartRange(range, resolvedEntitlement)) {
            if (confirm(`${t("pro.limitChart")}\n\n${t("pro.openCheckout")}?`)) {
                openCheckoutPage();
            }
            return;
        }
        chartState.range = range;
        document.querySelectorAll("#chartRanges .range-btn").forEach((b) => {
            b.classList.toggle("active", b === btn);
        });
        renderPriceChart();
    });
});

chrome.storage.onChanged.addListener(async (changes, area) => {
    if (area !== "local") return;
    if (changes.watchList && !document.activeElement?.classList?.contains("target-edit")) {
        loadList();
    }
    if (changes.priceHistory && chartState.bId) renderPriceChart();
    if (changes.entitlement || changes.devForcePro || changes.installAt) {
        const info = await loadResolvedEntitlement();
        resolvedEntitlement = info.resolved;
        if (chartState.bId && !canChartRange(chartState.range, resolvedEntitlement)) {
            chartState.range = "day";
            document.querySelectorAll("#chartRanges .range-btn").forEach((b) => {
                b.classList.toggle("active", b.dataset.range === "day");
            });
            renderPriceChart();
        }
    }
});

async function loadList() {
    const data = await chrome.storage.local.get(["watchList", "sniperList"]);
    const raw = data.watchList || data.sniperList || [];
    allItems = raw.map(normalizeWatchItem);
    render();
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

function matchesSearch(item, q) {
    if (!q) return true;
    const label = (item.label || "").toLowerCase();
    const id = String(item.bId);
    return label.includes(q) || id.includes(q);
}

function getFiltered() {
    const q = searchEl.value.trim().toLowerCase();
    const onlyUnder = document.getElementById("filterUnder").checked;
    const wantZero = document.getElementById("filterZero").checked;
    const wantNormal = document.getElementById("filterNormal").checked;
    const onlyAuto = document.getElementById("filterAuto").checked;

    let list = allItems.filter((item) => {
        if (!matchesSearch(item, q)) return false;
        if (onlyUnder && !isUnderTarget(item)) return false;
        if (onlyAuto && !item.autoCart) return false;
        if (!wantZero && !wantNormal) return false;
        if (wantZero && wantNormal) return true;
        if (wantZero && item.watchZero) return true;
        if (wantNormal && item.watchNormal) return true;
        return false;
    });

    const sort = sortEl.value;
    list = list.slice().sort((a, b) => {
        if (sort === "under") {
            const au = isUnderTarget(a) ? 0 : 1;
            const bu = isUnderTarget(b) ? 0 : 1;
            if (au !== bu) return au - bu;
        }
        if (sort === "id") return a.bId - b.bId;
        if (sort === "target") return a.target - b.target;
        const la = (a.label || `ID ${a.bId}`).toLowerCase();
        const lb = (b.label || `ID ${b.bId}`).toLowerCase();
        return la.localeCompare(lb, getLocaleBcp47());
    });

    return list;
}

function formatEuro(v) {
    if (v == null || !Number.isFinite(Number(v))) return "—";
    return `€${Number(v).toFixed(2)}`;
}

async function saveWatchTarget(bId, raw) {
    const price = parseFloat(raw);
    if (!Number.isFinite(bId) || !Number.isFinite(price) || price <= 0) return false;
    const target = Math.round(price * 100) / 100;
    if (target < 0.01) return false;
    const data = await chrome.storage.local.get(["watchList"]);
    const list = (data.watchList || []).map(normalizeWatchItem);
    const idx = list.findIndex((x) => Number(x.bId) === Number(bId));
    if (idx < 0) return false;
    if (Number(list[idx].target) === target) return true;
    list[idx] = { ...list[idx], target };
    await chrome.storage.local.set({ watchList: list });
    return true;
}

function formatCheckTime(ts) {
    if (!ts) return "—";
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return "—";
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${hh}:${mm} ${day}/${month}/${year}`;
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

function channelBadge(item) {
    if (item.watchZero && item.watchNormal) {
        return `<span class="badge both">${t("channel.znShort")}</span>`;
    }
    if (item.watchZero) return `<span class="badge zero">${t("channel.zero")}</span>`;
    return `<span class="badge normal">${t("channel.normal")}</span>`;
}

function channelClass(item) {
    if (item.watchZero && item.watchNormal) return "ch-both";
    if (item.watchZero) return "ch-zero";
    return "ch-normal";
}

function priceCell(label, cls, now, min, checkedAt, watching, target) {
    const off = watching ? "" : "off";
    const hit =
        watching && now != null && Number(now) <= Number(target) ? "hit" : "";
    const when = formatCheckTime(checkedAt);
    const nowTxt = formatEuro(now);
    return `<div class="price-cell ${off}">
      <span class="lbl ${cls}">${label}</span>
      <span class="now ${hit}">${t("price.last", { price: nowTxt })}${trendIcon(now, min)}</span>
      <span class="when">${when}</span>
      <span class="min">${t("price.min", { price: formatEuro(min) })}</span>
    </div>`;
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function cardTraderUrl(bId) {
    return `https://www.cardtrader.com/cards/${Number(bId)}`;
}

function render() {
    const filtered = getFiltered();
    const q = searchEl.value.trim();

    countInfo.innerHTML = t("watchlist.count", {
        shown: `<b>${filtered.length}</b>`,
        total: `<b>${allItems.length}</b>`
    });

    grid.innerHTML = "";

    if (filtered.length === 0) {
        empty.classList.add("show");
        if (allItems.length === 0) {
            empty.textContent = t("watchlist.emptyNone");
        } else if (q) {
            empty.innerHTML = t("watchlist.emptySearch", {
                query: `<code>${escapeHtml(q)}</code>`
            });
        } else {
            empty.textContent = t("watchlist.emptyFilters");
        }
        return;
    }

    empty.classList.remove("show");

    const frag = document.createDocumentFragment();
    filtered.forEach((item) => {
        const under = isUnderTarget(item);
        const name = escapeHtml(item.label || `ID ${item.bId}`);
        const idBit = item.label ? ` <small>${item.bId}</small>` : "";
        const title = `<a href="${cardTraderUrl(item.bId)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(t("card.openOnCt"))}">${name}</a>${idBit}`;
        const autoClass = item.autoCart ? "on" : "off";
        const autoText = item.autoCart ? t("badge.auto") : t("badge.noAuto");
        const qtyBadge = item.autoCart
            ? `<span class="badge qty">${escapeHtml(t("badge.qtyProgress", { carted: item.cartedQty, want: item.wantQty }))}</span>`
            : "";
        const pausedBadge = item.paused
            ? `<span class="badge paused">${escapeHtml(t("badge.paused"))}</span>`
            : "";
        const resumeBtn = item.paused
            ? `<button type="button" class="resume-btn" data-bid="${item.bId}" title="${escapeHtml(t("card.resumeTitle"))}">${escapeHtml(t("card.resume"))}</button>`
            : "";

        const safeLabel = escapeHtml(item.label || `ID ${item.bId}`);
        const card = document.createElement("article");
        card.className = `card ${channelClass(item)}${under ? " under" : ""}${item.paused ? " paused" : ""}`;
        card.dataset.bid = String(item.bId);
        card.innerHTML = `
        <div class="card-top">
          <div class="card-title">${title}</div>
          <div class="card-actions">
            ${resumeBtn}
            <button type="button" class="chart-btn" data-bid="${item.bId}" data-label="${safeLabel}" title="${escapeHtml(t("card.priceChart"))}">
              ${CHART_ICON}
            </button>
            <button type="button" class="remove-btn" data-bid="${item.bId}" title="${escapeHtml(t("card.remove"))}">✖</button>
          </div>
        </div>
        <div class="row-meta">
          ${escapeHtml(t("card.maxShort"))}
          <input type="number" class="target-edit" step="0.01" min="0.01" data-bid="${item.bId}" value="${Number(item.target).toFixed(2)}" title="${escapeHtml(t("card.maxTitle"))}" aria-label="${escapeHtml(t("card.maxTitle"))}">
          ${channelBadge(item)}
          <span class="badge ${autoClass}">${escapeHtml(autoText)}</span>
          ${qtyBadge}
          ${pausedBadge}
          ${filterSummary(item) ? `<span class="badge filter">${escapeHtml(filterSummary(item))}</span>` : ""}
          ${under ? `<span class="badge hit">${escapeHtml(t("badge.underThreshold"))}</span>` : ""}
        </div>
        <div class="prices">
          ${priceCell(t("channel.zero"), "zero", item.lastSeenZero, item.minZero, item.lastSeenZeroAt, item.watchZero, item.target)}
          ${priceCell(t("channel.normShort"), "normal", item.lastSeenNormal, item.minNormal, item.lastSeenNormalAt, item.watchNormal, item.target)}
        </div>
      `;
        frag.appendChild(card);
    });
    grid.appendChild(frag);
}

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

    const emptyEl = document.getElementById("chartEmpty");
    const canvas = document.getElementById("chartCanvas");
    const wrap = document.getElementById("chartCanvasWrap");
    const statsEl = document.getElementById("chartStats");

    if (filtered.length === 0) {
        emptyEl.classList.add("show");
        wrap.style.display = "none";
        statsEl.textContent = t("chart.noSamples");
        hideChartTooltip();
        chartHit = null;
        return;
    }

    emptyEl.classList.remove("show");
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
    const cssW = canvas.clientWidth || 680;
    const cssH = 260;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);

    const pad = { top: 12, right: 10, bottom: 28, left: 42 };
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
    ctx.font = "11px Segoe UI, sans-serif";
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

        if (series.length <= 60) {
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

    const offset = 14;
    tip.style.left = "0px";
    tip.style.top = "0px";
    const tipW = tip.offsetWidth || 120;
    const tipH = tip.offsetHeight || 48;
    let left = mx + offset;
    let top = my - tipH - 8;
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
    return `${day}/${month}`;
}
