import { maxCardsFor } from "./entitlements.js";

/**
 * Codici lingua CardTrader.
 * Il query param `language` è condiviso; in properties_hash la chiave è per-gioco
 * (`mtg_language`, `pokemon_language`, `gundam_language`, `fab_language`, …).
 * Valori da GET /categories (Magic) + dump Gundam.
 */
export const CARD_LANGUAGES = [
    "en",
    "jp",
    "it",
    "de",
    "es",
    "fr",
    "kr",
    "pt",
    "ru",
    "nl",
    "pl",
    "cz",
    "hu",
    "zh-cn",
    "zh-tw"
];

/** Valori `properties_hash.condition` documentati da CardTrader. */
export const CARD_CONDITIONS = [
    "Near Mint",
    "Slightly Played",
    "Moderately Played",
    "Played",
    "Heavily Played",
    "Poor"
];

export const CONDITION_SHORT = {
    "Near Mint": "NM",
    "Slightly Played": "SP",
    "Moderately Played": "MP",
    Played: "PL",
    "Heavily Played": "HP",
    Poor: "PO"
};

const LANG_ALIASES = {
    en: "en",
    english: "en",
    it: "it",
    italian: "it",
    italiano: "it",
    jp: "jp",
    ja: "jp",
    japanese: "jp",
    de: "de",
    german: "de",
    deutsch: "de",
    es: "es",
    spanish: "es",
    espanol: "es",
    español: "es",
    fr: "fr",
    french: "fr",
    kr: "kr",
    ko: "kr",
    korean: "kr",
    zh: "zh-cn",
    cn: "zh-cn",
    "zh-cn": "zh-cn",
    "zh-tw": "zh-tw",
    chinese: "zh-cn",
    pt: "pt",
    portuguese: "pt",
    ru: "ru",
    russian: "ru",
    nl: "nl",
    dutch: "nl",
    pl: "pl",
    polish: "pl",
    cz: "cz",
    cs: "cz",
    czech: "cz",
    hu: "hu",
    hungarian: "hu"
};

export function isValidBlueprintId(bId) {
    const n = Number(bId);
    return Number.isFinite(n) && n > 0 && Math.floor(n) === n;
}

function uniqueAllowed(input, allowed) {
    if (!Array.isArray(input) || input.length === 0) return [];
    const allow = new Set(allowed);
    const out = [];
    const seen = new Set();
    for (const raw of input) {
        const value = String(raw || "").trim();
        if (!value || !allow.has(value) || seen.has(value)) continue;
        seen.add(value);
        out.push(value);
    }
    return out;
}

export function normalizeWatchLanguages(input) {
    const lowered = (Array.isArray(input) ? input : []).map((v) =>
        String(v || "").trim().toLowerCase()
    );
    return uniqueAllowed(lowered, CARD_LANGUAGES);
}

export function normalizeWatchConditions(input) {
    return uniqueAllowed(input, CARD_CONDITIONS);
}

export function sameStringList(a, b) {
    const aa = [...(a || [])].map(String).sort();
    const bb = [...(b || [])].map(String).sort();
    return aa.length === bb.length && aa.every((v, i) => v === bb[i]);
}

/** Chiavi lingua in properties_hash: `mtg_language`, `pokemon_language`, `language`, … */
export function listingLanguageKeys(ph) {
    if (!ph || typeof ph !== "object") return [];
    return Object.keys(ph).filter((k) => k === "language" || k.endsWith("_language"));
}

function readLanguageRaw(ph) {
    const keys = listingLanguageKeys(ph);
    const specific = keys.filter((k) => k.endsWith("_language"));
    for (const key of specific.length ? specific : keys) {
        const value = String(ph[key] ?? "").trim();
        if (value) return value;
    }
    return "";
}

export function listingLanguage(listing) {
    const ph = listing?.properties_hash;
    if (!ph || typeof ph !== "object") return "";
    const raw = readLanguageRaw(ph).toLowerCase();
    if (!raw) return "";
    return LANG_ALIASES[raw] || (raw.length <= 5 ? raw : "");
}

export function listingCondition(listing) {
    const ph = listing?.properties_hash;
    if (!ph || typeof ph !== "object") return "";
    return String(ph.condition || "").trim();
}

/**
 * Array vuoto = nessun filtro (tutte le offerte).
 */
export function matchesListingFilters(listing, languages, conditions) {
    const langs = Array.isArray(languages) ? languages : [];
    const conds = Array.isArray(conditions) ? conditions : [];
    if (langs.length) {
        const lang = listingLanguage(listing);
        if (!langs.includes(lang)) return false;
    }
    if (conds.length) {
        const cond = listingCondition(listing);
        if (!conds.includes(cond)) return false;
    }
    return true;
}

export function filterSummary(item) {
    const langs = Array.isArray(item?.languages) ? item.languages : [];
    const conds = Array.isArray(item?.conditions) ? item.conditions : [];
    const parts = [];
    if (langs.length) parts.push(langs.map((l) => l.toUpperCase()).join("/"));
    if (conds.length) {
        parts.push(conds.map((c) => CONDITION_SHORT[c] || c).join("/"));
    }
    return parts.join(" · ");
}

export function normalizeWatchItem(item) {
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
        languages: normalizeWatchLanguages(item.languages),
        conditions: normalizeWatchConditions(item.conditions),
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

export function legacyToWatch(item) {
    return normalizeWatchItem({
        ...item,
        autoCart: false,
        label: "",
        watchZero: true,
        watchNormal: true
    });
}

/**
 * Normalize, drop invalid blueprint IDs, and enforce tier card cap.
 * @returns {{ list: ReturnType<typeof normalizeWatchItem>[], changed: boolean }}
 */
export function prepareWatchList(rawList, resolved) {
    const input = Array.isArray(rawList) ? rawList : [];
    const valid = input.map(normalizeWatchItem).filter((item) => isValidBlueprintId(item.bId));
    const max = maxCardsFor(resolved);
    const list = valid.slice(0, max);
    const changed = list.length !== input.length || valid.length !== input.length;
    return { list, changed };
}

export function listingCents(listing) {
    if (!listing?.price) return null;
    const rawCents = listing.price.cents;
    if (rawCents != null && Number.isFinite(Number(rawCents))) {
        return Number(rawCents);
    }
    const fixed = listing.price.fixed ?? listing.price.eur ?? listing.price.value;
    if (fixed != null) {
        const n = Number(fixed);
        if (Number.isFinite(n)) return Math.round(n * 100);
    }
    return null;
}

export function listingPriceEuro(listing) {
    const cents = listingCents(listing);
    if (cents == null) return null;
    return cents / 100;
}

/** Carta singola Gundam (esclude sealed/box senza rarità carta). */
export function isSingleCardListing(listing) {
    const ph = listing?.properties_hash;
    if (!ph || typeof ph !== "object") return false;
    return ph.gundam_rarity != null || ph.condition != null;
}

/** Listing CT Zero: carta singola spedibile via hub CT Zero. */
export function isZeroListing(listing) {
    if (!isSingleCardListing(listing)) return false;
    if (
        listing?.can_be_sent_with_zero === true ||
        listing?.can_be_sent_with_zero === "true"
    ) {
        return true;
    }
    return listing?.user?.can_sell_via_hub === true;
}

export function maskSecret(value) {
    if (!value || typeof value !== "string") return "";
    const trimmed = value.trim();
    if (trimmed.length <= 8) return "••••••••";
    return `${trimmed.slice(0, 4)}…${trimmed.slice(-4)}`;
}
