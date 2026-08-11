export const SUPPORTED = ["it", "es", "en"];
export const DEFAULT_LOCALE = "it";
export const FALLBACK_LOCALE = "en";

const BCP47 = { it: "it-IT", es: "es-ES", en: "en-US" };

let currentLocale = DEFAULT_LOCALE;
let messages = {};
let fallbackMessages = {};
const catalogCache = Object.create(null);
const listeners = new Set();
let storageBound = false;

export function getLocale() {
    return currentLocale;
}

export function getLocaleBcp47() {
    return BCP47[currentLocale] || BCP47[DEFAULT_LOCALE];
}

export function t(key, params) {
    let str = messages[key];
    if (str == null) str = fallbackMessages[key];
    if (str == null) str = key;
    if (params && typeof params === "object") {
        for (const [k, v] of Object.entries(params)) {
            str = String(str).split(`{${k}}`).join(String(v));
        }
    }
    return String(str);
}

export function onLocaleChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

function notifyListeners() {
    for (const fn of listeners) {
        try {
            fn(currentLocale);
        } catch (err) {
            console.error("onLocaleChange listener:", err);
        }
    }
}

function detectBrowserLocale() {
    const raw =
        (typeof navigator !== "undefined" && (navigator.language || navigator.userLanguage)) ||
        DEFAULT_LOCALE;
    const lang = String(raw).toLowerCase();
    if (lang.startsWith("es")) return "es";
    if (lang.startsWith("en")) return "en";
    if (lang.startsWith("it")) return "it";
    return DEFAULT_LOCALE;
}

function normalizeLocale(code) {
    const c = String(code || "").toLowerCase().slice(0, 2);
    return SUPPORTED.includes(c) ? c : null;
}

async function fetchCatalog(locale) {
    if (catalogCache[locale]) return catalogCache[locale];
    const url = chrome.runtime.getURL(`locales/${locale}.json`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load locale ${locale}: ${res.status}`);
    const data = await res.json();
    catalogCache[locale] = data;
    return data;
}

async function loadMessages(locale) {
    const code = normalizeLocale(locale) || DEFAULT_LOCALE;
    if (code !== FALLBACK_LOCALE) {
        fallbackMessages = await fetchCatalog(FALLBACK_LOCALE);
    } else {
        fallbackMessages = {};
    }
    messages = await fetchCatalog(code);
    currentLocale = code;
    if (typeof document !== "undefined" && document.documentElement) {
        document.documentElement.lang = code;
    }
}

function bindStorageListener() {
    if (storageBound) return;
    storageBound = true;
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== "local" || !changes.locale) return;
        const next = normalizeLocale(changes.locale.newValue);
        if (!next || next === currentLocale) return;
        loadMessages(next)
            .then(() => {
                applyDom();
                notifyListeners();
            })
            .catch((err) => console.error("locale reload:", err));
    });
}

export async function init() {
    bindStorageListener();
    const data = await chrome.storage.local.get(["locale"]);
    let locale = normalizeLocale(data.locale);
    if (!locale) {
        locale = detectBrowserLocale();
        await chrome.storage.local.set({ locale });
    }
    await loadMessages(locale);
    return currentLocale;
}

export async function setLocale(code) {
    const locale = normalizeLocale(code) || DEFAULT_LOCALE;
    await chrome.storage.local.set({ locale });
    await loadMessages(locale);
    applyDom();
    notifyListeners();
    return currentLocale;
}

export function applyDom(root) {
    if (typeof document === "undefined") return;
    const scope = root || document;

    scope.querySelectorAll("[data-i18n]").forEach((el) => {
        const key = el.getAttribute("data-i18n");
        if (!key) return;
        el.textContent = t(key);
    });

    scope.querySelectorAll("[data-i18n-html]").forEach((el) => {
        const key = el.getAttribute("data-i18n-html");
        if (!key) return;
        el.innerHTML = t(key);
    });

    scope.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
        const key = el.getAttribute("data-i18n-placeholder");
        if (!key) return;
        el.setAttribute("placeholder", t(key));
    });

    scope.querySelectorAll("[data-i18n-title]").forEach((el) => {
        const key = el.getAttribute("data-i18n-title");
        if (!key) return;
        el.setAttribute("title", t(key));
    });

    scope.querySelectorAll("[data-i18n-aria]").forEach((el) => {
        const key = el.getAttribute("data-i18n-aria");
        if (!key) return;
        el.setAttribute("aria-label", t(key));
    });
}
