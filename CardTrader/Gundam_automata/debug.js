let selectedId = null;

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("refreshBtn").addEventListener("click", loadLogs);
    document.getElementById("clearBtn").addEventListener("click", async () => {
        await chrome.runtime.sendMessage({ type: "clearDebugLogs" });
        selectedId = null;
        loadLogs();
    });
    document.getElementById("runBtn").addEventListener("click", async () => {
        document.getElementById("detailTitle").textContent = "Check in corso…";
        await chrome.runtime.sendMessage({ type: "runCheckNow" });
        setTimeout(loadLogs, 400);
    });

    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === "local" && changes.debugLogs) loadLogs();
    });

    loadLogs();
});

async function loadLogs() {
    const data = await chrome.storage.local.get(["debugLogs", "debugMode"]);
    const logs = data.debugLogs || [];
    const list = document.getElementById("logList");
    list.innerHTML = "";

    if (!data.debugMode) {
        list.innerHTML =
            '<div id="empty">Debug mode disattivato.<br>Attivalo dal popup dell’estensione.</div>';
        return;
    }

    if (logs.length === 0) {
        list.innerHTML =
            '<div id="empty">Nessun log ancora.<br>Esegui un check o attendi l’alarm.</div>';
        document.getElementById("reqPre").textContent = "—";
        document.getElementById("resPre").textContent = "—";
        document.getElementById("detailTitle").textContent = "Seleziona una richiesta";
        return;
    }

    logs.forEach((entry) => {
        const div = document.createElement("div");
        div.className = "log-item" + (entry.id === selectedId ? " active" : "");
        const status = entry.response?.status ?? "?";
        const okClass = entry.response?.ok ? "ok" : "err";
        const when = new Date(entry.at).toLocaleTimeString();
        div.innerHTML = `
            <div><b>${escapeHtml(entry.label || entry.kind)}</b></div>
            <div class="meta">
              <span class="${okClass}">HTTP ${status}</span>
              · ${when}
              · ${entry.durationMs ?? "?"}ms
            </div>
        `;
        div.addEventListener("click", () => {
            selectedId = entry.id;
            showEntry(entry);
            loadLogs();
        });
        list.appendChild(div);
    });

    const current = logs.find((l) => l.id === selectedId) || logs[0];
    if (current) {
        selectedId = current.id;
        showEntry(current);
    }
}

function showEntry(entry) {
    document.getElementById("detailTitle").textContent =
        `${entry.label || entry.kind} — ${new Date(entry.at).toLocaleString()}`;
    document.getElementById("reqPre").textContent = JSON.stringify(
        entry.request,
        null,
        2
    );
    document.getElementById("resPre").textContent = JSON.stringify(
        entry.response,
        null,
        2
    );
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}
