document.addEventListener("DOMContentLoaded", () => {
    loadAll();
    avviaVisualizzazioneTimer();
});

document.getElementById("saveTokenBtn").addEventListener("click", async () => {
    const token = document.getElementById("apiToken").value.trim();
    if (!token) {
        alert("Inserisci il token API.");
        return;
    }
    await chrome.storage.local.set({ token });
    setStatusUi(true, "Token salvato");
});

document.getElementById("savePollBtn").addEventListener("click", async () => {
    let minutes = parseInt(document.getElementById("pollMinutes").value, 10);
    if (!Number.isFinite(minutes) || minutes < 1 || minutes > 5) {
        alert("Intervallo tra 1 e 5 minuti.");
        return;
    }
    await chrome.storage.local.set({ pollMinutes: minutes });
    const prossimo = Date.now() + minutes * 60 * 1000;
    await chrome.storage.local.set({ nextTick: prossimo });
    setStatusUi(true, `Polling ogni ${minutes} min`);
});

document.getElementById("debugMode").addEventListener("change", async (e) => {
    const enabled = e.target.checked;
    await chrome.storage.local.set({ debugMode: enabled });
    updateDebugPanel(enabled);
    setStatusUi(true, enabled ? "Debug API attivo" : "Debug API disattivo");
});

document.getElementById("alertSound").addEventListener("change", async (e) => {
    const enabled = e.target.checked;
    await chrome.storage.local.set({ alertSound: enabled });
    setStatusUi(true, enabled ? "Suono alert attivo" : "Suono alert disattivo");
});

document.getElementById("testSoundBtn").addEventListener("click", async () => {
    await chrome.runtime.sendMessage({ type: "testAlertSound" });
});

document.getElementById("openDebugBtn").addEventListener("click", () => {
    chrome.windows.create({
        url: chrome.runtime.getURL("debug.html"),
        type: "popup",
        width: 980,
        height: 720
    });
});

document.getElementById("runCheckBtn").addEventListener("click", async () => {
    setStatusUi(true, "Check in corso…");
    const res = await chrome.runtime.sendMessage({ type: "runCheckNow" });
    if (res?.ok) setStatusUi(true, "Check completato — apri il log debug");
    else setStatusUi(false, res?.error || "Check fallito");
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
        alert("Compila almeno Nome, Via, CAP, Città e Paese (IT).");
        return;
    }
    await chrome.storage.local.set({ cartAddress });
    setStatusUi(true, "Indirizzo salvato per /cart/add");
});

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
            setStatusUi(false, card?.error || "Apri una scheda carta su CardTrader");
            return;
        }

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

        setStatusUi(true, `Importata: ${card.label || `ID ${card.blueprintId}`}`);
        priceEl.focus();
        priceEl.select();
    } catch (err) {
        setStatusUi(false, err?.message || "Impossibile leggere la pagina");
    } finally {
        btn.disabled = false;
    }
});

document.getElementById("addBtn").addEventListener("click", async () => {
    const token = document.getElementById("apiToken").value.trim();
    const bId = parseInt(document.getElementById("blueprintId").value, 10);
    const price = parseFloat(document.getElementById("targetPrice").value);
    const label = document.getElementById("cardLabel").value.trim();
    const autoCart = document.getElementById("autoCart").checked;
    const watchZero = document.getElementById("watchZero").checked;
    const watchNormal = document.getElementById("watchNormal").checked;

    if (!token) {
        alert("Salva prima il token API.");
        return;
    }
    if (!Number.isFinite(bId) || bId <= 0) {
        alert("Blueprint ID non valido.");
        return;
    }
    if (!Number.isFinite(price) || price <= 0) {
        alert("Prezzo max non valido.");
        return;
    }
    if (!watchZero && !watchNormal) {
        alert("Seleziona almeno un canale: CT Zero e/o Normale.");
        return;
    }

    const data = await chrome.storage.local.get(["watchList", "sniperList"]);
    let list = (data.watchList || (data.sniperList || []).map(legacyToWatch)).map(normalizeItem);

    const existing = list.findIndex((x) => x.bId === bId);
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
    setStatusUi(true, `Aggiunta · impostazioni mantenute`);
    loadList();
});

async function readCardFromActiveTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !tab.url) {
        return { error: "Nessuna scheda attiva" };
    }

    const fromUrl = parseCardFromUrl(tab.url);
    if (!fromUrl) {
        return { error: "Non sei su una pagina carta CardTrader (/cards/…)" };
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

    if (!e.target.classList.contains("remove")) return;
    const listType = e.target.dataset.list;
    const index = parseInt(e.target.dataset.index, 10);

    if (listType === "archive") {
        const data = await chrome.storage.local.get(["cartArchive"]);
        const archive = data.cartArchive || [];
        archive.splice(index, 1);
        await chrome.storage.local.set({ cartArchive: archive });
        loadCartArchive();
        return;
    }

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

document.getElementById("chartClose").addEventListener("click", closePriceChart);
document.getElementById("chartOverlay").addEventListener("click", (e) => {
    if (e.target.id === "chartOverlay") closePriceChart();
});
document.querySelectorAll("#chartRanges .range-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
        chartState.range = btn.dataset.range || "day";
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
        `${escapeHtml(label)}<small>Blueprint ${bId}</small>`;
    document.getElementById("chartOverlay").classList.add("show");
    document.getElementById("chartOverlay").setAttribute("aria-hidden", "false");
    await renderPriceChart();
}

function closePriceChart() {
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
        statsEl.textContent = "Nessun campione in questo intervallo.";
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
      <span>Campioni: <b>${filtered.length}</b></span>
      <span>Zero: <b>${formatEuro(last.z)}</b> (${fmtDelta(zDelta)})</span>
      <span>Normale: <b>${formatEuro(last.n)}</b> (${fmtDelta(nDelta)})</span>
      <span>Min Z/N: <b>${formatEuro(zMin)}</b> / <b>${formatEuro(nMin)}</b></span>
      <span>Max Z/N: <b>${formatEuro(zMax)}</b> / <b>${formatEuro(nMax)}</b></span>
      <span>Da ${formatCheckTime(first.t)}</span>
    `;

    drawPriceChart(canvas, filtered, range);
}

function drawPriceChart(canvas, points, range) {
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth || 340;
    const cssH = 180;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const pad = { top: 12, right: 10, bottom: 28, left: 38 };
    const w = cssW - pad.left - pad.right;
    const h = cssH - pad.top - pad.bottom;

    ctx.clearRect(0, 0, cssW, cssH);

    const values = [];
    points.forEach((p) => {
        if (p.z != null && Number.isFinite(p.z)) values.push(p.z);
        if (p.n != null && Number.isFinite(p.n)) values.push(p.n);
    });
    if (!values.length) return;

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

    const xAt = (t) => pad.left + ((t - t0) / tSpan) * w;
    const yAt = (v) => pad.top + ((maxY - v) / (maxY - minY)) * h;

    // grid
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

    // x labels
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const labelCount = range === "day" ? 4 : range === "week" ? 5 : 5;
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

    // target? skip - keep chart clean
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
    if (!confirm("Svuotare tutto l'archivio carrello?")) return;
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
        return '<span class="badge both">Zero + Normale</span>';
    }
    if (item.watchZero) return '<span class="badge zero">Solo Zero</span>';
    return '<span class="badge normal">Solo Normale</span>';
}

function channelClass(item) {
    if (item.watchZero && item.watchNormal) return "ch-both";
    if (item.watchZero) return "ch-zero";
    return "ch-normal";
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

function priceLine(tag, tagClass, nowValue, minValue, checkedAt, watching, target) {
    const off = watching ? "" : "off";
    const watchNote = watching ? "" : " (non monitorato)";
    const minTxt = formatEuro(minValue);
    const nowTxt = formatEuro(nowValue);
    const when = formatCheckTime(checkedAt);
    const underTarget =
        watching && nowValue != null && Number(nowValue) <= Number(target);
    const nowBlock = underTarget
        ? `<span class="now-under">[ Now: ${nowTxt} - ${when} ]</span>`
        : `[ Now: ${nowTxt} - ${when} ]`;
    return `<div class="price-line ${off}">
      <span class="tag ${tagClass}">${tag}${watchNote}</span>
      <span class="val">Min: ${minTxt} - ${nowBlock}</span>
    </div>`;
}

async function loadAll() {
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
        "tokenPanelOpen",
        "pollPanelOpen",
        "addCardPanelOpen",
        "addrPanelOpen",
        "archivePanelOpen",
        "debugPanelOpen"
    ]);

    if (data.token) {
        document.getElementById("apiToken").value = data.token;
    }
    document.getElementById("pollMinutes").value = data.pollMinutes ?? 2;
    document.getElementById("debugMode").checked = Boolean(data.debugMode);
    document.getElementById("alertSound").checked = data.alertSound !== false;
    updateDebugPanel(Boolean(data.debugMode));

    if (data.defaultTargetPrice != null && Number(data.defaultTargetPrice) > 0) {
        document.getElementById("targetPrice").value = String(data.defaultTargetPrice);
    }

    // Defaults: Zero on, Normale off, auto-cart on — overridden by last used settings
    document.getElementById("watchZero").checked =
        data.defaultWatchZero !== undefined ? Boolean(data.defaultWatchZero) : true;
    document.getElementById("watchNormal").checked =
        data.defaultWatchNormal !== undefined ? Boolean(data.defaultWatchNormal) : false;
    document.getElementById("autoCart").checked =
        data.defaultAutoCart !== undefined ? Boolean(data.defaultAutoCart) : true;

    if (data.cartAddress) {
        document.getElementById("addrName").value = data.cartAddress.name || "";
        document.getElementById("addrStreet").value = data.cartAddress.street || "";
        document.getElementById("addrZip").value = data.cartAddress.zip || "";
        document.getElementById("addrCity").value = data.cartAddress.city || "";
        document.getElementById("addrState").value = data.cartAddress.state_or_province || "";
        document.getElementById("addrCountry").value = data.cartAddress.country_code || "";
    }

    restoreCollapsiblePanels(data);

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
            container.innerHTML = '<div class="empty">Nessuna carta aggiunta al carrello</div>';
        } else {
            archive.forEach((item, index) => {
                const qty = Number(item.quantity) || 1;
                const unit = Number(item.unitPrice) || 0;
                const line = qty * unit;
                totalQty += qty;
                totalSpend += line;

                const channel =
                    item.channel === "zero"
                        ? '<span class="badge zero">Zero</span>'
                        : '<span class="badge normal">Normale</span>';
                const when = item.addedAt
                    ? new Date(item.addedAt).toLocaleString()
                    : "";

                const div = document.createElement("div");
                div.className = "archive-item";
                div.innerHTML = `
                  <div>
                    <div><b>${escapeHtml(item.label || `ID ${item.bId}`)}</b> ${channel}</div>
                    <div class="meta">
                      Qty: <b>${qty}</b>
                      · €${unit.toFixed(2)}/pz
                      · Riga: <b>€${line.toFixed(2)}</b>
                    </div>
                    <div class="meta">
                      BP ${item.bId ?? "—"} · prod ${item.productId ?? "—"}
                      ${when ? ` · ${when}` : ""}
                    </div>
                  </div>
                  <span class="remove" data-list="archive" data-index="${index}" title="Rimuovi dall'archivio">✖</span>
                `;
                container.appendChild(div);
            });
        }

        document.getElementById("archiveCount").textContent = String(archive.length);
        document.getElementById("archiveQty").textContent = String(totalQty);
        document.getElementById("archiveSpend").textContent = `€${totalSpend.toFixed(2)}`;
        const summaryMeta = document.getElementById("archiveSummaryMeta");
        if (summaryMeta) {
            summaryMeta.textContent = `${totalQty} pz · €${totalSpend.toFixed(2)}`;
        }
    });
}

function loadList() {
    chrome.storage.local.get(["watchList"], (data) => {
        const container = document.getElementById("list");
        container.innerHTML = "";
        const list = (data.watchList || []).map(normalizeItem);

        if (list.length === 0) {
            container.innerHTML = '<div class="empty">Nessuna carta monitorata</div>';
            return;
        }

        list.forEach((item, index) => {
            const div = document.createElement("div");
            div.className = `card-item ${channelClass(item)}`;
            const title = item.label
                ? `${escapeHtml(item.label)} <small>(${item.bId})</small>`
                : `ID: <b>${item.bId}</b>`;
            const autoClass = item.autoCart ? "on" : "off";
            const autoText = item.autoCart ? "Auto-cart: sì" : "Auto-cart: no";
            const lastAlert =
                item.lastAlertChannel && item.lastAlertPrice != null
                    ? `Ultimo alert: ${item.lastAlertChannel === "zero" ? "Zero" : "Normale"} @ ${formatEuro(item.lastAlertPrice)}`
                    : "";

            const chartIcon = `<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="1" y="1" width="14" height="14" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M4 11V8M8 11V5M12 11V7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;
            const safeLabel = escapeHtml(item.label || `ID ${item.bId}`);

            div.innerHTML = `
                <div class="card-head">
                  <div>
                    <div>${title} ${channelBadge(item)}</div>
                    <div class="card-meta">
                      Max: <b>${formatEuro(item.target)}</b>
                      · <span class="badge ${autoClass}">${autoText}</span>
                    </div>
                    <div class="prices">
                      ${priceLine("CT Zero", "zero", item.lastSeenZero, item.minZero, item.lastSeenZeroAt, item.watchZero, item.target)}
                      ${priceLine("Normale", "normal", item.lastSeenNormal, item.minNormal, item.lastSeenNormalAt, item.watchNormal, item.target)}
                    </div>
                    ${lastAlert ? `<div class="card-meta">${lastAlert}</div>` : ""}
                  </div>
                  <div class="card-actions">
                    <button type="button" class="chart-btn" data-bid="${item.bId}" data-label="${safeLabel}" title="Grafico prezzi">
                      ${chartIcon}
                    </button>
                    <span class="remove" data-list="watch" data-index="${index}" title="Rimuovi">✖</span>
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
            display.innerText = "In corso...";
            return;
        }

        const minuti = Math.floor(differenza / 60000);
        const secondi = Math.floor((differenza % 60000) / 1000);
        display.innerText = `${String(minuti).padStart(2, "0")}:${String(secondi).padStart(2, "0")}`;
    }, 1000);
}
