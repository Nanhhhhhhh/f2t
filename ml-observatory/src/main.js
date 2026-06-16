import { PRICING, RECO, health, predict, recommend, streamEvents } from "./api.js";

const pricingFeed = document.getElementById("pricing-feed");
const recoFeed = document.getElementById("recommender-feed");

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => (
  { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function prepend(feed, el) {
  feed.prepend(el);
  while (feed.children.length > 30) feed.removeChild(feed.lastChild);
}

// Labels + display scales for the 12-D observation vector (see _build_obs).
const OBS_LABELS = ["fresh", "inv", "dow·sin", "dow·cos", "restock", "demand",
  "prevΔ", "comp", "to_waste", "inv_cov", "d̂", "p_waste"];
const OBS_SCALE = [1, 2, 1, 1, 1, 3, 0.5, 2, 1, 1, 50, 1];

const fmtVnd = (v) => Math.round(v).toLocaleString("vi-VN") + "đ";
const pctLabel = (d) => (d > 0 ? "+" : "") + Math.round(d * 100) + "%";
const tagBadge = (t) => `<span class="tag tag-${esc(t)}">${esc(t)}</span>`;

function qChart(e) {
  const q = e.q_values || [];
  const cand = e.candidates || [];
  const mask = e.action_mask || [];
  const valid = q.filter((x) => x !== null);
  const qmin = valid.length ? Math.min(...valid) : 0;
  const qmax = valid.length ? Math.max(...valid) : 1;
  const span = qmax - qmin;
  return q.map((val, i) => {
    const isArg = i === e.action_idx;
    const masked = val === null || mask[i] === false;
    // when only one action is valid (span 0), give it a clear full-ish bar
    const w = masked ? 0 : (span <= 0 ? 70 : 4 + ((val - qmin) / span) * 96);
    const cls = "q-row" + (isArg ? " q-arg" : "") + (masked ? " q-masked" : "");
    return `<div class="${cls}">
      <span class="q-lbl">${pctLabel(cand[i] ?? 0)}</span>
      <span class="q-track"><span class="q-fill" style="width:${w}%"></span></span>
      <span class="q-val">${masked ? "masked" : val.toFixed(2)}${isArg ? " ◀" : ""}</span>
    </div>`;
  }).join("");
}

function obsGrid(e) {
  return e.obs.map((v, i) => {
    const w = Math.min(100, (Math.abs(v) / (OBS_SCALE[i] || 1)) * 100);
    return `<div class="obs-cell" title="${OBS_LABELS[i]} = ${Number(v).toFixed(3)}">
      <span class="obs-lbl">${OBS_LABELS[i]}</span>
      <span class="obs-track"><span class="obs-fill" style="width:${w}%"></span></span>
      <span class="obs-num">${Number(v).toFixed(2)}</span>
    </div>`;
  }).join("");
}

function priceCard(e) {
  const div = document.createElement("div");
  div.className = "card pcard" + (e.safety_clipped ? " clip" : "");
  if (!e.q_values) {
    // fallback for events emitted before the q-vector upgrade
    div.innerHTML = `<strong>${esc(e.productId)} · ${esc(e.category)}</strong> → ${fmtVnd(e.targetPrice)}
      <div class="kv"><span>action ${e.action_idx}/${e.n_actions}</span><span>Δ ${e.delta_pct}%</span></div>`;
    return div;
  }
  const raw = e.raw_target ?? e.targetPrice;
  const clipRow = e.safety_clipped
    ? `<div class="clip-row clip-on"><span class="clip-badge">SAFETY CLIP</span> model muốn <b>${fmtVnd(raw)}</b> <span class="arrow">→</span> <b>${fmtVnd(e.targetPrice)}</b></div>`
    : `<div class="clip-row">base ${fmtVnd(e.base_price)} <span class="arrow">→</span> <b>${fmtVnd(e.targetPrice)}</b> · ${e.delta_pct >= 0 ? "+" : ""}${e.delta_pct}%</div>`;
  div.innerHTML = `
    <div class="pcard-head">
      <div class="ph-id"><strong>${esc(e.productId)}</strong><span class="muted">${esc(e.category)}</span>${tagBadge(e.freshness_tag)}</div>
      <div class="ph-price">${fmtVnd(e.targetPrice)}</div>
    </div>
    <div class="sec-title">Q-values · action <b>${e.action_idx}</b>/${e.n_actions} · Δ ${pctLabel(e.candidate_delta)}</div>
    <div class="q-chart">${qChart(e)}</div>
    ${clipRow}
    <div class="sec-title">observation · 12-D</div>
    <div class="obs-grid">${obsGrid(e)}</div>`;
  return div;
}

function recoCard(e) {
  const div = document.createElement("div");
  div.className = "card rcard" + (e.source === "fallback" ? " fallback" : "");
  const recs = e.recommendations || [];
  const maxLift = recs.length ? Math.max(...recs.map((r) => r.score)) : 1;
  const chips = recs.map((r, i) => {
    const w = Math.round((r.score / maxLift) * 100);
    return `<div class="rec-chip${i === 0 ? " top" : ""}">
      <div class="rec-row"><span class="rec-cat">${esc(r.category)}</span><span class="rec-lift">${r.score}</span></div>
      <span class="rec-bar"><span style="width:${w}%"></span></span>
    </div>`;
  }).join("");
  div.innerHTML = `
    <div class="rcard-head">
      <span class="cart"><span class="muted">cart</span> ${e.cart_categories.map(esc).join(" + ")}</span>
      <span class="src src-${esc(e.source)}">${esc(e.source)}</span>
    </div>
    <div class="rec-chips">${chips || '<span class="muted">(none)</span>'}</div>`;
  return div;
}

streamEvents(PRICING, (e) => {
  if (e.kind === "predict") prepend(pricingFeed, priceCard(e));
});
streamEvents(RECO, (e) => {
  if (e.kind === "recommend") prepend(recoFeed, recoCard(e));
});

const pill = (label, status) =>
  `<span class="pill ${status === "ok" ? "ok" : "down"}"><i></i>${label} ${status}</span>`;

async function refreshHealth() {
  const [p, r] = await Promise.all([health(PRICING), health(RECO)]);
  document.getElementById("health").innerHTML =
    pill("pricing", p.status) + pill("reco", r.status);
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
