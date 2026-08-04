(() => {
    let allItems = [];
    let searchTimer = null;

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
        if (e.key === "/" && document.activeElement !== searchEl) {
            e.preventDefault();
            searchEl.focus();
            searchEl.select();
        }
        if (e.key === "Escape" && document.activeElement === searchEl && searchEl.value) {
            searchEl.value = "";
            clearBtn.classList.remove("show");
            render();
        }
    });

    grid.addEventListener("click", async (e) => {
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

    chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== "local") return;
        if (changes.watchList) loadList();
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

    function priceCell(label, cls, now, min, watching, target) {
        const off = watching ? "" : "off";
        const hit =
            watching && now != null && Number(now) <= Number(target) ? "hit" : "";
        return `<div class="price-cell ${off}">
      <span class="lbl ${cls}">${label}</span>
      <span class="now ${hit}">${formatEuro(now)}</span>
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
            const title = item.label
                ? `${escapeHtml(item.label)} <small>${item.bId}</small>`
                : `ID ${item.bId}`;
            const autoClass = item.autoCart ? "on" : "off";
            const autoText = item.autoCart ? "Auto" : "No auto";

            const card = document.createElement("article");
            card.className = `card ${channelClass(item)}${under ? " under" : ""}`;
            card.dataset.bid = String(item.bId);
            card.innerHTML = `
        <div class="card-top">
          <div class="card-title">${title}</div>
          <div class="card-actions">
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
          ${priceCell("Zero", "zero", item.lastSeenZero, item.minZero, item.watchZero, item.target)}
          ${priceCell("Norm.", "normal", item.lastSeenNormal, item.minNormal, item.watchNormal, item.target)}
        </div>
      `;
            frag.appendChild(card);
        });
        grid.appendChild(frag);
    }
})();
