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

    await chrome.storage.local.set({ token, watchList: list });
    if (data.sniperList) {
        await chrome.storage.local.remove("sniperList");
    }

    document.getElementById("blueprintId").value = "";
    document.getElementById("targetPrice").value = "";
    document.getElementById("cardLabel").value = "";
    document.getElementById("autoCart").checked = false;
    document.getElementById("watchZero").checked = true;
    document.getElementById("watchNormal").checked = true;
    loadList();
});

document.addEventListener("click", async (e) => {
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
    list.splice(index, 1);
    await chrome.storage.local.set({ watchList: list });
    loadList();
});

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
                  <span class="remove" data-list="watch" data-index="${index}" title="Rimuovi">✖</span>
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
