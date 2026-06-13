export const PRICING = import.meta.env.VITE_PRICING_URL || "http://localhost:8000";
export const RECO = import.meta.env.VITE_RECO_URL || "http://localhost:8001";

export async function health(base) {
  try {
    const r = await fetch(`${base}/health`);
    return await r.json();
  } catch {
    return { status: "down" };
  }
}

export async function predict(body) {
  const r = await fetch(`${PRICING}/predict`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  return r.json();
}

export async function recommend(body) {
  const r = await fetch(`${RECO}/recommend`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  return r.json();
}

export function streamEvents(base, onEvent) {
  const es = new EventSource(`${base}/_events/stream`);
  es.onmessage = (m) => onEvent(JSON.parse(m.data));
  return es;
}
