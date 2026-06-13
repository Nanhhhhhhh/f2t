import { PRICING, RECO, health, predict, recommend, streamEvents } from "./api.js";

const pricingFeed = document.getElementById("pricing-feed");
const recoFeed = document.getElementById("recommender-feed");

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => (
  { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function prepend(feed, el) {
  feed.prepend(el);
  while (feed.children.length > 30) feed.removeChild(feed.lastChild);
}

function priceCard(e) {
  const div = document.createElement("div");
  div.className = "card" + (e.safety_clipped ? " clip" : "");
  // scale |delta%| to a 4–100% bar width for a quick visual cue
  const pct = Math.min(100, Math.abs(e.delta_pct) * 3 + 4);
  div.innerHTML = `
    <strong>${esc(e.productId)} · ${esc(e.category)}</strong> → ${Math.round(e.targetPrice).toLocaleString()}đ
    <div class="kv">
      <span>action ${e.action_idx}/${e.n_actions}</span>
      <span>Δ ${e.delta_pct}%</span>
      <span>tag ${esc(e.freshness_tag)}</span>
      <span>${e.safety_clipped ? "⚠ safety-clipped" : "no clip"}</span>
    </div>
    <div class="bar" style="width:${pct}%"></div>
    <div class="kv"><span>obs[${e.obs.length}]: ${e.obs.map((x) => Number(x).toFixed(2)).join(", ")}</span></div>`;
  return div;
}

function recoCard(e) {
  const div = document.createElement("div");
  div.className = "card" + (e.source === "fallback" ? " fallback" : "");
  const recs = e.recommendations.map((r) => `${esc(r.category)} (${r.score})`).join(", ");
  div.innerHTML = `
    <strong>cart: ${e.cart_categories.map(esc).join(", ")}</strong>
    <div class="kv"><span>source: ${esc(e.source)}</span><span>top_k ${e.top_k}</span></div>
    <div class="kv"><span>→ ${recs || "(none)"}</span></div>`;
  return div;
}

streamEvents(PRICING, (e) => {
  if (e.kind === "predict") prepend(pricingFeed, priceCard(e));
});
streamEvents(RECO, (e) => {
  if (e.kind === "recommend") prepend(recoFeed, recoCard(e));
});

async function refreshHealth() {
  const [p, r] = await Promise.all([health(PRICING), health(RECO)]);
  document.getElementById("health").innerHTML =
    `<span class="${p.status === "ok" ? "ok" : "down"}">pricing ${p.status}</span>` +
    `<span class="${r.status === "ok" ? "ok" : "down"}">reco ${r.status}</span>`;
}
refreshHealth();
setInterval(refreshHealth, 5000);

document.getElementById("predict-form").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const f = new FormData(ev.target);
  const res = await predict({ state_vectors: [{
    productId: "probe-" + Date.now().toString().slice(-4),
    category: f.get("category"),
    freshness: +f.get("freshness"),
    inventory_ratio: +f.get("inventory_ratio"),
    base_price: +f.get("base_price"),
    competitor_ref_price: +f.get("competitor_ref_price"),
  }] });
  if (!res) alert("Pricing sidecar không phản hồi (kiểm tra :8000)");
  // result arrives via the live stream
});

document.getElementById("recommend-form").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const f = new FormData(ev.target);
  const res = await recommend({
    cart_categories: f.get("cart_categories").split(",").map((s) => s.trim()).filter(Boolean),
    top_k: +f.get("top_k"),
  });
  if (!res) alert("Recommender sidecar không phản hồi (kiểm tra :8001)");
  // result arrives via the live stream
});
