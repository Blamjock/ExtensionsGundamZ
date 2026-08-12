/**
 * License activation / verification client.
 * When LICENSE_API_BASE is empty, uses a local stub (PRO-DEV-* keys).
 */

import { GRACE_MS, pauseTrialIfActive, resumePausedTrial } from "./entitlements.js";

/** Set to your backend origin in production, e.g. "https://api.crometium.example" */
export const LICENSE_API_BASE = "";

/**
 * Public pricing / checkout page (PayPal + license key via email).
 * Source in-repo: web/pricing.html — host it and set this URL to the public origin.
 */
export const CHECKOUT_URL = "https://www.forgeplay.studio/CrometiumTGC/";

const STUB_PREFIX = "PRO-DEV-";

function normalizeKey(key) {
    return String(key || "")
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "");
}

async function getInstanceId() {
    const data = await chrome.storage.local.get(["licenseInstanceId"]);
    if (data.licenseInstanceId) return data.licenseInstanceId;
    const id = `chrome-${crypto.randomUUID()}`;
    await chrome.storage.local.set({ licenseInstanceId: id });
    return id;
}

function stubEntitlement(licenseKey) {
    const now = Date.now();
    return {
        tier: "pro",
        expiresAt: now + 365 * 24 * 60 * 60 * 1000,
        licenseId: `stub_${licenseKey.slice(0, 16)}`,
        licenseKey,
        lastVerifiedAt: now,
        source: "license"
    };
}

async function persistLicenseSuccess(entitlement, key) {
    await pauseTrialIfActive();
    await chrome.storage.local.set({ entitlement, licenseKey: key });
}

/**
 * Activate a license key. Persists entitlement on success.
 * Active trial days are paused (not cancelled) so they resume if the license is removed.
 * @param {string} licenseKey
 */
export async function activateLicense(licenseKey) {
    const key = normalizeKey(licenseKey);
    if (!key) {
        return { ok: false, error: "empty_key" };
    }

    const instanceId = await getInstanceId();

    if (!LICENSE_API_BASE) {
        if (!key.startsWith(STUB_PREFIX)) {
            return { ok: false, error: "invalid_key", hint: "stub_requires_PRO-DEV-" };
        }
        const entitlement = stubEntitlement(key);
        await persistLicenseSuccess(entitlement, key);
        return { ok: true, entitlement, stub: true };
    }

    try {
        const res = await fetch(`${LICENSE_API_BASE}/v1/license/activate`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ licenseKey: key, instanceId })
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok || !body?.ok || !body.entitlement) {
            return {
                ok: false,
                error: body?.error || `http_${res.status}`,
                status: res.status
            };
        }
        const entitlement = {
            ...body.entitlement,
            tier: "pro",
            licenseKey: key,
            lastVerifiedAt: body.entitlement.lastVerifiedAt || Date.now(),
            source: body.entitlement.source || "license"
        };
        await persistLicenseSuccess(entitlement, key);
        return { ok: true, entitlement };
    } catch (err) {
        return { ok: false, error: "network", message: String(err) };
    }
}

/**
 * Re-verify cached license with backend (or stub).
 * On network failure, keeps existing entitlement (grace handled by resolveTier).
 */
export async function verifyLicense() {
    const data = await chrome.storage.local.get(["entitlement", "licenseKey"]);
    const entitlement = data.entitlement;
    const key = normalizeKey(data.licenseKey || entitlement?.licenseKey);

    if (!entitlement || entitlement.tier !== "pro") {
        return { ok: true, tier: "free", entitlement: entitlement || null };
    }
    if (entitlement.source === "dev") {
        return { ok: true, tier: "pro", entitlement };
    }

    if (!LICENSE_API_BASE) {
        if (key && key.startsWith(STUB_PREFIX)) {
            const next = {
                ...entitlement,
                lastVerifiedAt: Date.now(),
                licenseKey: key
            };
            await chrome.storage.local.set({ entitlement: next });
            return { ok: true, tier: "pro", entitlement: next, stub: true };
        }
        // No key / invalid stub → drop to free unless still in grace window via lastVerifiedAt
        const last = Number(entitlement.lastVerifiedAt);
        if (Number.isFinite(last) && Date.now() - last <= GRACE_MS) {
            return { ok: true, tier: "pro", entitlement, grace: true, stub: true };
        }
        await chrome.storage.local.set({
            entitlement: { tier: "free", lastVerifiedAt: Date.now(), source: "free" }
        });
        await resumePausedTrial();
        return { ok: true, tier: "free", entitlement: null, stub: true };
    }

    try {
        const instanceId = await getInstanceId();
        const res = await fetch(`${LICENSE_API_BASE}/v1/license/verify`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({
                licenseKey: key || undefined,
                licenseId: entitlement.licenseId,
                instanceId
            })
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok || body?.tier === "free" || body?.ok === false) {
            await chrome.storage.local.set({
                entitlement: {
                    tier: "free",
                    lastVerifiedAt: Date.now(),
                    source: "free",
                    licenseId: entitlement.licenseId
                }
            });
            await resumePausedTrial();
            return { ok: true, tier: "free", entitlement: null };
        }
        const next = {
            ...entitlement,
            ...body.entitlement,
            tier: "pro",
            lastVerifiedAt: Date.now(),
            source: "license",
            licenseKey: key || entitlement.licenseKey
        };
        await chrome.storage.local.set({ entitlement: next });
        return { ok: true, tier: "pro", entitlement: next };
    } catch {
        // Offline: leave cache; grace applied in resolveTier
        return { ok: true, tier: "pro", entitlement, offline: true };
    }
}

export async function clearLicense() {
    await chrome.storage.local.remove(["entitlement", "licenseKey"]);
    await chrome.storage.local.set({
        entitlement: { tier: "free", lastVerifiedAt: Date.now(), source: "free" }
    });
    await resumePausedTrial();
}

export function openCheckoutPage() {
    return chrome.tabs.create({ url: CHECKOUT_URL });
}
