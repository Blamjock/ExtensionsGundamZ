/**
 * Parse deck lists like "2x GD05-111" and resolve CardTrader blueprints.
 */

export const DEFAULT_IMPORT_PERCENT = 5;
export const MIN_IMPORT_PERCENT = 1;
export const MAX_IMPORT_PERCENT = 50;
export const EXPANSIONS_TTL_MS = 24 * 60 * 60 * 1000;
export const BLUEPRINTS_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const STORAGE_EXPANSIONS = "ctExpansionsCache";
export const STORAGE_BLUEPRINTS = "ctBlueprintsByExpansion";

const VARIANT_NAME_RE =
    /\b(foil|parallel|holo|reverse|showcase|alt(?:ernate)?(?:\s+art)?)\b/i;

export function normalizeImportPercent(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return DEFAULT_IMPORT_PERCENT;
    return Math.min(MAX_IMPORT_PERCENT, Math.max(MIN_IMPORT_PERCENT, n));
}

export function computeTargetFromMin(minPrice, percent) {
    const min = Number(minPrice);
    if (!Number.isFinite(min) || min <= 0) return null;
    const pct = normalizeImportPercent(percent);
    let target = Math.round(min * (1 - pct / 100) * 100) / 100;
    if (target < 0.01) target = 0.01;
    if (target >= min) {
        target = Math.round((min - 0.01) * 100) / 100;
    }
    if (target < 0.01) target = 0.01;
    return target;
}

export function parseDeckText(text) {
    const lines = String(text || "").split(/\r?\n/);
    const byCode = new Map();
    for (const raw of lines) {
        const line = raw.trim();
        if (!line || line.startsWith("#") || line.startsWith("//")) continue;
        const parsed = parseDeckLine(line);
        if (!parsed) continue;
        const prev = byCode.get(parsed.code);
        if (prev) prev.qty += parsed.qty;
        else byCode.set(parsed.code, parsed);
    }
    return [...byCode.values()];
}

export function parseDeckLine(line) {
    let m = line.match(
        /^\s*(\d+)\s*[x×X]\s*([A-Za-z]{1,6}\d{1,3})[-–](\d{1,4}[A-Za-z]?)\b/i
    );
    if (m) return makeParsed(m[1], m[2], m[3]);
    m = line.match(
        /^\s*([A-Za-z]{1,6}\d{1,3})[-–](\d{1,4}[A-Za-z]?)\s*[x×X]\s*(\d+)\b/i
    );
    if (m) return makeParsed(m[3], m[1], m[2]);
    m = line.match(/^\s*([A-Za-z]{1,6}\d{1,3})[-–](\d{1,4}[A-Za-z]?)\b/i);
    if (m) return makeParsed(1, m[1], m[2]);
    return null;
}

function makeParsed(qtyRaw, expansionCode, collectorNumber) {
    const qty = Math.floor(Number(qtyRaw));
    const exp = String(expansionCode || "").toUpperCase();
    const num = String(collectorNumber || "").toUpperCase();
    if (!Number.isFinite(qty) || qty < 1 || !exp || !num) return null;
    return {
        code: `${exp}-${num}`,
        expansionCode: exp,
        collectorNumber: num,
        qty: Math.min(99, qty)
    };
}

export function slimBlueprint(bp) {
    return {
        id: Number(bp?.id),
        name: String(bp?.name || ""),
        version: bp?.version != null ? String(bp.version) : "",
        collector_number: extractCollectorNumber(bp),
        expansion_id: bp?.expansion_id != null ? Number(bp.expansion_id) : null,
        expansion_code: String(bp?.expansion_code || bp?.expansion?.code || "")
    };
}

export function extractCollectorNumber(bp) {
    const raw =
        bp?.collector_number ??
        bp?.fixed_properties?.collector_number ??
        bp?.properties?.collector_number ??
        "";
    return String(raw).trim();
}

export function isVariantBlueprintName(name) {
    return VARIANT_NAME_RE.test(String(name || ""));
}

export function findExpansionsForCode(expansions, expansionCode) {
    const want = String(expansionCode || "").toUpperCase();
    if (!want || !Array.isArray(expansions)) return [];
    const exact = expansions.filter(
        (e) => String(e?.code || "").toUpperCase() === want
    );
    if (exact.length) return preferGundamExpansions(exact);
    const named = expansions.filter((e) => {
        const name = String(e?.name || "").toUpperCase();
        return name.includes(want);
    });
    return preferGundamExpansions(named);
}

function preferGundamExpansions(list) {
    if (list.length <= 1) return list;
    const gundam = list.filter((e) => /gundam/i.test(String(e?.name || "")));
    return gundam.length ? gundam : list;
}

function collectorKeySet(expansionCode, collectorNumber) {
    const code = String(expansionCode || "").toUpperCase();
    const raw = String(collectorNumber || "").toUpperCase();
    const digits = raw.replace(/^0+/, "") || "0";
    const padded3 = digits.padStart(3, "0");
    const padded4 = digits.padStart(4, "0");
    return new Set(
        [
            raw,
            digits,
            padded3,
            padded4,
            `${code}-${raw}`,
            `${code}-${digits}`,
            `${code}-${padded3}`,
            `${code}-${padded4}`
        ].map((s) => s.toUpperCase())
    );
}

export function blueprintMatchVia(bp, parsed) {
    if (!bp) return null;
    const keys = collectorKeySet(parsed.expansionCode, parsed.collectorNumber);
    const cn = String(bp.collector_number || "").trim().toUpperCase();
    if (cn && keys.has(cn)) return "collector";
    const cnDigits = cn.replace(/^[A-Z]+\d*[-–]/, "").replace(/^0+/, "");
    const wantDigits = String(parsed.collectorNumber).replace(/^0+/, "").toUpperCase();
    const expOnBp = String(bp.expansion_code || "").toUpperCase();
    if (
        cnDigits &&
        cnDigits === wantDigits &&
        (!expOnBp || expOnBp === String(parsed.expansionCode).toUpperCase())
    ) {
        return "collector";
    }
    const hay = `${bp.name || ""} ${bp.version || ""} ${cn}`.toUpperCase();
    if (hay.includes(parsed.code.toUpperCase())) return "name";
    return null;
}

export function matchBlueprints(blueprints, parsed) {
    const out = [];
    const seen = new Set();
    for (const raw of blueprints || []) {
        const bp = slimBlueprint(raw);
        if (!Number.isFinite(bp.id) || bp.id <= 0 || seen.has(bp.id)) continue;
        const via = blueprintMatchVia(bp, parsed);
        if (!via) continue;
        seen.add(bp.id);
        out.push({ blueprint: bp, via });
    }
    return out;
}

export function pickBlueprint(matches) {
    const list = Array.isArray(matches) ? matches.filter((m) => m?.blueprint?.id) : [];
    if (list.length === 0) return { status: "not_found" };
    if (list.length === 1) return { status: "ok", blueprint: list[0].blueprint };

    const collector = list.filter((m) => m.via === "collector");
    const pool = collector.length ? collector : list;
    const nonVariant = pool.filter((m) => !isVariantBlueprintName(m.blueprint.name));
    const chosen = nonVariant.length ? nonVariant : pool;
    if (chosen.length === 1) return { status: "ok", blueprint: chosen[0].blueprint };

    const uniqueIds = [...new Map(chosen.map((m) => [m.blueprint.id, m.blueprint])).values()];
    if (uniqueIds.length === 1) return { status: "ok", blueprint: uniqueIds[0] };
    return { status: "ambiguous", blueprints: uniqueIds };
}

function asList(body) {
    if (Array.isArray(body)) return body;
    if (body && typeof body === "object") return Object.values(body);
    return [];
}

export function createCatalogCache(apiGet) {
    return {
        async getExpansionsCached() {
            const data = await chrome.storage.local.get([STORAGE_EXPANSIONS]);
            const cache = data[STORAGE_EXPANSIONS];
            if (
                cache?.items &&
                Array.isArray(cache.items) &&
                Date.now() - Number(cache.fetchedAt || 0) < EXPANSIONS_TTL_MS
            ) {
                return cache.items;
            }
            const items = asList(await apiGet("/expansions"));
            await chrome.storage.local.set({
                [STORAGE_EXPANSIONS]: { fetchedAt: Date.now(), items }
            });
            return items;
        },

        async getBlueprintsCached(expansionId) {
            const id = Number(expansionId);
            if (!Number.isFinite(id) || id <= 0) return [];
            const data = await chrome.storage.local.get([STORAGE_BLUEPRINTS]);
            const all =
                data[STORAGE_BLUEPRINTS] && typeof data[STORAGE_BLUEPRINTS] === "object"
                    ? data[STORAGE_BLUEPRINTS]
                    : {};
            const entry = all[String(id)];
            if (
                entry?.items &&
                Array.isArray(entry.items) &&
                Date.now() - Number(entry.fetchedAt || 0) < BLUEPRINTS_TTL_MS
            ) {
                return entry.items;
            }
            const raw = asList(await apiGet(`/blueprints/export?expansion_id=${id}`));
            const items = raw.map(slimBlueprint).filter((bp) => Number.isFinite(bp.id) && bp.id > 0);
            await chrome.storage.local.set({
                [STORAGE_BLUEPRINTS]: {
                    ...all,
                    [String(id)]: { fetchedAt: Date.now(), items }
                }
            });
            return items;
        }
    };
}

export async function resolveParsedLine(parsed, ctx) {
    const expansions = await ctx.getExpansionsCached();
    const exps = findExpansionsForCode(expansions, parsed.expansionCode);
    const matches = [];
    for (const exp of exps) {
        const bps = await ctx.getBlueprintsCached(exp.id);
        matches.push(...matchBlueprints(bps, parsed));
    }
    let picked = pickBlueprint(matches);
    if (picked.status === "ok" || picked.status === "ambiguous") return picked;

    let byName = [];
    try {
        byName = asList(await ctx.apiGet(`/blueprints?name=${encodeURIComponent(parsed.code)}`)).map(
            slimBlueprint
        );
    } catch {
        byName = [];
    }
    const nameMatches = matchBlueprints(byName, parsed);
    if (nameMatches.length) return pickBlueprint(nameMatches);
    if (byName.length === 1 && Number.isFinite(byName[0].id) && byName[0].id > 0) {
        return { status: "ok", blueprint: byName[0] };
    }
    if (byName.length > 1) {
        return pickBlueprint(byName.map((blueprint) => ({ blueprint, via: "search" })));
    }
    return { status: "not_found" };
}
