// /utils/validators.js

export function normalizeEventData(eventData) {
  if (!eventData || typeof eventData !== "object")
    throw new Error("addEvent: invalid eventData");

  const cleaned = {};
  for (const [k, v] of Object.entries(eventData)) {
    if (v == null) continue;
    if (k === "hours") {
      const n = Number(v);
      cleaned[k] = Number.isFinite(n) ? n : null;
    } else {
      cleaned[k] = v;
    }
  }
  return cleaned;
}
