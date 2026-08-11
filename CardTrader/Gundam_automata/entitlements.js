/**
 * Free / Pro entitlements for Crometium TCG.
 * Enforcement must run in the service worker as well as the UI.
 */

export const FREE_MAX_CARDS = 5;
export const PRO_MAX_CARDS = 100;
export const FREE_POLL_MINUTES = 5;
export const TRIAL_MS = 15 * 24 * 60 * 60 * 1000;
export const GRACE_MS = 7 * 24 * 60 * 60 * 1000;
export const VERIFY_EVERY_MS = 12 * 60 * 60 * 1000;

/** @typedef {"addCard"|"dualChannel"|"autoCart"|"pollFast"|"chartWeek"|"chartMonth"|"sound"|"debug"|"expandWatchlist"} EntitlementAction */

export const ACTIONS = {
    addCard: "addCard",
    dualChannel: "dualChannel",
    autoCart: "autoCart",
    pollFast: "pollFast",
    chartWeek: "chartWeek",
    chartMonth: "chartMonth",
    sound: "sound",
    debug: "debug",
    expandWatchlist: "expandWatchlist"
};

/**
 * Calendar trial end from installAt (ignored while trial is paused).
 * @param {number|null|undefined} installAt
 */
export function trialEndsAtFromInstall(installAt) {
    const t = Number(installAt);
    if (!Number.isFinite(t) || t <= 0) return null;
    return t + TRIAL_MS;
}

/**
 * @param {{ remainingMs?: number }|null|undefined} trialPause
 */
export function pausedTrialRemainingMs(trialPause) {
    const ms = Number(trialPause?.remainingMs);
    return Number.isFinite(ms) && ms > 0 ? ms : 0;
}

/**
 * @param {object|null|undefined} entitlement
 * @param {{
 *   installAt?: number|null,
 *   trialPause?: { remainingMs?: number }|null,
 *   devForcePro?: boolean,
 *   now?: number
 * }} [ctx]
 */
export function resolveTier(entitlement, ctx = {}) {
    const now = ctx.now ?? Date.now();
    if (ctx.devForcePro) {
        return {
            tier: "pro",
            source: "dev",
            expiresAt: null,
            trialEndsAt: null,
            trialPausedMs: 0,
            reason: "devForcePro"
        };
    }

    const pausedMs = pausedTrialRemainingMs(ctx.trialPause);
    const calendarEndsAt = trialEndsAtFromInstall(ctx.installAt);
    // While paused, calendar trial must not grant Pro (days are banked).
    const activeTrialEndsAt =
        pausedMs > 0 ? null : calendarEndsAt && now < calendarEndsAt ? calendarEndsAt : null;

    const ent = entitlement && typeof entitlement === "object" ? entitlement : null;
    if (ent && ent.tier === "pro") {
        const expiresAt = ent.expiresAt == null ? null : Number(ent.expiresAt);
        const notExpired = expiresAt == null || !Number.isFinite(expiresAt) || expiresAt > now;
        const lastVerifiedAt = Number(ent.lastVerifiedAt);

        if (notExpired) {
            return {
                tier: "pro",
                source: ent.source || "license",
                expiresAt: Number.isFinite(expiresAt) ? expiresAt : null,
                trialEndsAt: pausedMs > 0 ? now + pausedMs : activeTrialEndsAt,
                trialPausedMs: pausedMs,
                reason: "license"
            };
        }

        // Expired by clock but recently verified → offline grace
        if (Number.isFinite(lastVerifiedAt) && now - lastVerifiedAt <= GRACE_MS) {
            return {
                tier: "pro",
                source: "grace",
                expiresAt: lastVerifiedAt + GRACE_MS,
                trialEndsAt: pausedMs > 0 ? now + pausedMs : activeTrialEndsAt,
                trialPausedMs: pausedMs,
                reason: "grace"
            };
        }
    }

    if (activeTrialEndsAt) {
        return {
            tier: "pro",
            source: "trial",
            expiresAt: activeTrialEndsAt,
            trialEndsAt: activeTrialEndsAt,
            trialPausedMs: 0,
            reason: "trial"
        };
    }

    return {
        tier: "free",
        source: "free",
        expiresAt: null,
        trialEndsAt: pausedMs > 0 ? now + pausedMs : calendarEndsAt,
        trialPausedMs: pausedMs,
        reason: "free"
    };
}

/**
 * Bank remaining trial days when a paid license becomes active.
 * No-op if trial already paused or expired.
 */
export async function pauseTrialIfActive(storageArea = chrome.storage.local, now = Date.now()) {
    const data = await storageArea.get(["installAt", "trialPause"]);
    if (pausedTrialRemainingMs(data.trialPause) > 0) return data.trialPause;

    const endsAt = trialEndsAtFromInstall(data.installAt);
    if (!endsAt || now >= endsAt) return null;

    const trialPause = { remainingMs: endsAt - now };
    await storageArea.set({ trialPause });
    return trialPause;
}

/**
 * Restore banked trial after license clear / revoke.
 * Rewrites installAt so the remaining window continues from `now`.
 */
export async function resumePausedTrial(storageArea = chrome.storage.local, now = Date.now()) {
    const data = await storageArea.get(["trialPause"]);
    const remaining = pausedTrialRemainingMs(data.trialPause);
    if (remaining <= 0) {
        if (data.trialPause != null) await storageArea.remove("trialPause");
        return null;
    }
    const installAt = now - (TRIAL_MS - remaining);
    await storageArea.set({ installAt });
    await storageArea.remove("trialPause");
    return { installAt, remainingMs: remaining };
}

export function isPro(resolved) {
    return resolved?.tier === "pro";
}

export function maxCardsFor(resolved) {
    return isPro(resolved) ? PRO_MAX_CARDS : FREE_MAX_CARDS;
}

export function clampPollMinutes(minutes, resolved) {
    const n = Number(minutes);
    const raw = !Number.isFinite(n) || n < 1 ? FREE_POLL_MINUTES : Math.round(n);
    if (!isPro(resolved)) return FREE_POLL_MINUTES;
    return Math.min(5, Math.max(1, raw));
}

/**
 * @param {EntitlementAction} action
 * @param {ReturnType<typeof resolveTier>} resolved
 * @param {{ watchListLength?: number, range?: string }} [extra]
 */
export function can(action, resolved, extra = {}) {
    const pro = isPro(resolved);
    switch (action) {
        case ACTIONS.addCard: {
            const len = Number(extra.watchListLength) || 0;
            return len < maxCardsFor(resolved);
        }
        case ACTIONS.dualChannel:
        case ACTIONS.autoCart:
        case ACTIONS.pollFast:
        case ACTIONS.sound:
        case ACTIONS.debug:
        case ACTIONS.chartWeek:
        case ACTIONS.chartMonth:
        case ACTIONS.expandWatchlist:
            return pro;
        default:
            return false;
    }
}

export function canChartRange(range, resolved) {
    if (range === "week") return can(ACTIONS.chartWeek, resolved);
    if (range === "month") return can(ACTIONS.chartMonth, resolved);
    return true;
}

/**
 * Force Free-safe channel flags (prefer Zero if both were set).
 */
export function clampChannels(watchZero, watchNormal, resolved) {
    let z = Boolean(watchZero);
    let n = Boolean(watchNormal);
    if (!z && !n) n = true;
    if (!isPro(resolved) && z && n) {
        n = false;
    }
    return { watchZero: z, watchNormal: n };
}

export function clampAutoCart(autoCart, resolved) {
    if (!isPro(resolved)) return false;
    return Boolean(autoCart);
}

/**
 * Load install + entitlement from storage and resolve tier.
 * If a paused trial exists without an active license, resume it first.
 */
export async function loadResolvedEntitlement(storageArea = chrome.storage.local) {
    let data = await storageArea.get(["entitlement", "installAt", "trialPause", "devForcePro"]);
    const preview = resolveTier(data.entitlement, {
        installAt: data.installAt,
        trialPause: data.trialPause,
        devForcePro: Boolean(data.devForcePro)
    });
    const hasPaidPro =
        preview.source === "license" ||
        preview.source === "grace" ||
        preview.source === "dev";

    if (!hasPaidPro && pausedTrialRemainingMs(data.trialPause) > 0) {
        await resumePausedTrial(storageArea);
        data = await storageArea.get(["entitlement", "installAt", "trialPause", "devForcePro"]);
    }

    return {
        entitlement: data.entitlement || null,
        installAt: data.installAt ?? null,
        trialPause: data.trialPause || null,
        devForcePro: Boolean(data.devForcePro),
        resolved: resolveTier(data.entitlement, {
            installAt: data.installAt,
            trialPause: data.trialPause,
            devForcePro: Boolean(data.devForcePro)
        })
    };
}

/**
 * Ensure installAt exists (first run / migrate).
 */
export async function ensureInstallAt(storageArea = chrome.storage.local) {
    const data = await storageArea.get(["installAt"]);
    if (data.installAt != null && Number.isFinite(Number(data.installAt))) {
        return Number(data.installAt);
    }
    const installAt = Date.now();
    await storageArea.set({ installAt });
    return installAt;
}

export function needsPeriodicVerify(entitlement, now = Date.now()) {
    if (!entitlement || entitlement.tier !== "pro") return false;
    if (entitlement.source === "dev" || entitlement.source === "trial") return false;
    const last = Number(entitlement.lastVerifiedAt);
    if (!Number.isFinite(last)) return true;
    return now - last >= VERIFY_EVERY_MS;
}
