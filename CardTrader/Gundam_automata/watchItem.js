import { maxCardsFor } from "./entitlements.js";

export function isValidBlueprintId(bId) {
    const n = Number(bId);
    return Number.isFinite(n) && n > 0 && Math.floor(n) === n;
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

export function listingPriceEuro(listing) {
    const cents = listing?.price?.cents;
    if (cents == null || !Number.isFinite(Number(cents))) return null;
    return Number(cents) / 100;
}

export function maskSecret(value) {
    if (!value || typeof value !== "string") return "";
    const trimmed = value.trim();
    if (trimmed.length <= 8) return "••••••••";
    return `${trimmed.slice(0, 4)}…${trimmed.slice(-4)}`;
}
