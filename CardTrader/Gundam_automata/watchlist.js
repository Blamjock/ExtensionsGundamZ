(() => {
    let allItems = [];
    let searchTimer = null;
    let chartState = { bId: null, label: "", range: "day" };

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

    document.addEventListener("DOMContentLoaded", () => {
        loadList();
        searchEl.focus();
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
        if (e.key === "/" && document.activeElement !== searchEl) {
            e.preventDefault();
            searchEl.focus();
            searchEl.select();
        }
    });

    grid.addEventListener("click", async (e) => {
        const chartBtn = e.target.closest(".chart-btn");
        if (chartBtn) {
            const bId = parseInt(chartBtn.dataset.bid, 10);
            const label = chartBtn.dataset.label || `ID ${bId}`;
            if (!Number.isFinite(bId)) return;
            openPriceChart(bId, label);
            return;
        }

        const removeBtn = e.target.closest(".remove-btn");
        if (!removeBtn) return;
        const bId = parseInt(removeBtn.dataset.bid, 10);
        if (!Number.isFinite(bId)) return;
        if (!confirm(`Rimuovere la carta ${bId} dal monitoraggio?`)) return;
        const data = await chrome.storage.local.get(["watchList"]);
        const list = (data.watchList || []).filter((x) => Number(x.bId) !== bId);
        await chrome.storage.local.set({ watchList: list });
        chrome.runtime.sendMessage({ type: "removePriceHistory", bId });
    });

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

    chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== "local") return;
        if (changes.watchList) loadList();
        if (changes.priceHistory && chartState.bId) renderPriceChart();
    });

    async function loadList() {
        const data = await chrome.storage.local.get(["watchList", "sniperList"]);
        const raw = data.watchList || data.sniperList || [];
        allItems = raw.map(normalizeItem);
        render();
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
            lastSeenZero,
            lastSeenNormal,
            lastSeenZeroAt: item.lastSeenZeroAt ?? null,
            lastSeenNormalAt: item.lastSeenNormalAt ?? null,
            minZero: item.minZero ?? lastSeenZero,
            minNormal: item.minNormal ?? lastSeenNormal,
            lastAlertChannel: item.lastAlertChannel ?? null,
            lastAlertPrice: item.lastAlertPrice ?? null
        };
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
            return la.localeCompare(lb, "it");
        });

        return list;
    }

    function formatEuro(v) {
        if (v == null || !Number.isFinite(Number(v))) return "—";
        return `€${Number(v).toFixed(2)}`;
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
            return ' <span class="trend down" title="Now minore del Min">↓</span>';
        }
        if (now > min) {
            return ' <span class="trend up" title="Now maggiore del Min">↑</span>';
        }
        return ' <span class="trend eq" title="Now uguale al Min">=</span>';
    }

    function channelBadge(item) {
        if (item.watchZero && item.watchNormal) {
            return '<span class="badge both">Z+N</span>';
        }
        if (item.watchZero) return '<span class="badge zero">Zero</span>';
        return '<span class="badge normal">Normale</span>';
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
      <span class="now ${hit}">Ultimo: ${nowTxt}${trendIcon(now, min)}</span>
      <span class="when">${when}</span>
      <span class="min">min ${formatEuro(min)}</span>
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

        countInfo.innerHTML = `Mostrate <b>${filtered.length}</b> / <b>${allItems.length}</b>`;

        grid.innerHTML = "";

        if (filtered.length === 0) {
            empty.classList.add("show");
            empty.innerHTML = allItems.length === 0
                ? "Nessuna carta monitorata."
                : q
                    ? `Nessun risultato per <code>${escapeHtml(q)}</code>`
                    : "Nessuna carta con i filtri attuali.";
            return;
        }

        empty.classList.remove("show");

        const frag = document.createDocumentFragment();
        filtered.forEach((item) => {
            const under = isUnderTarget(item);
            const name = escapeHtml(item.label || `ID ${item.bId}`);
            const idBit = item.label ? ` <small>${item.bId}</small>` : "";
            const title = `<a href="${cardTraderUrl(item.bId)}" target="_blank" rel="noopener noreferrer" title="Apri su CardTrader">${name}</a>${idBit}`;
            const autoClass = item.autoCart ? "on" : "off";
            const autoText = item.autoCart ? "Auto" : "No auto";

            const safeLabel = escapeHtml(item.label || `ID ${item.bId}`);
            const card = document.createElement("article");
            card.className = `card ${channelClass(item)}${under ? " under" : ""}`;
            card.dataset.bid = String(item.bId);
            card.innerHTML = `
        <div class="card-top">
          <div class="card-title">${title}</div>
          <div class="card-actions">
            <button type="button" class="chart-btn" data-bid="${item.bId}" data-label="${safeLabel}" title="Grafico prezzi">
              ${CHART_ICON}
            </button>
            <button type="button" class="remove-btn" data-bid="${item.bId}" title="Rimuovi">✖</button>
          </div>
        </div>
        <div class="row-meta">
          Max <b>${formatEuro(item.target)}</b>
          ${channelBadge(item)}
          <span class="badge ${autoClass}">${autoText}</span>
          ${under ? '<span class="badge hit">Sotto soglia</span>' : ""}
        </div>
        <div class="prices">
          ${priceCell("Zero", "zero", item.lastSeenZero, item.minZero, item.lastSeenZeroAt, item.watchZero, item.target)}
          ${priceCell("Norm.", "normal", item.lastSeenNormal, item.minNormal, item.lastSeenNormalAt, item.watchNormal, item.target)}
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

        const emptyEl = document.getElementById("chartEmpty");
        const canvas = document.getElementById("chartCanvas");
        const wrap = document.getElementById("chartCanvasWrap");
        const statsEl = document.getElementById("chartStats");

        if (filtered.length === 0) {
            emptyEl.classList.add("show");
            wrap.style.display = "none";
            statsEl.textContent = "Nessun campione in questo intervallo.";
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
        const cssW = canvas.clientWidth || 680;
        const cssH = 260;
        canvas.width = Math.round(cssW * dpr);
        canvas.height = Math.round(cssH * dpr);
        const ctx = canvas.getContext("2d");
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const pad = { top: 12, right: 10, bottom: 28, left: 42 };
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
})();
