"""F2T Live ML Observatory — Streamlit edition.

Polls each sidecar's /_events?since= endpoint (no SSE needed) and lets you
probe /predict and /recommend. Shows REAL model output only.
"""
import os
import requests
import streamlit as st

PRICING = os.environ.get("PRICING_URL", "http://localhost:8000")
RECO = os.environ.get("RECO_URL", "http://localhost:8001")

st.set_page_config(page_title="F2T ML Observatory", layout="wide")
st.title("F2T — Live ML Observatory")

if "p_seq" not in st.session_state:
    st.session_state.p_seq = 0
    st.session_state.r_seq = 0
    st.session_state.p_feed = []
    st.session_state.r_feed = []


def health(base):
    try:
        return requests.get(f"{base}/health", timeout=2).json()
    except Exception:
        return {"status": "down"}


def poll(base, seq_key, feed_key):
    try:
        data = requests.get(f"{base}/_events", params={"since": st.session_state[seq_key]}, timeout=2).json()
    except Exception:
        return
    for e in data.get("events", []):
        st.session_state[feed_key].insert(0, e)
        st.session_state[seq_key] = max(st.session_state[seq_key], e["seq"])
    st.session_state[feed_key] = st.session_state[feed_key][:30]


hc1, hc2 = st.columns(2)
hc1.metric("pricing :8000", health(PRICING).get("status", "down"))
hc2.metric("reco :8001", health(RECO).get("status", "down"))

col1, col2 = st.columns(2)

with col1:
    st.subheader("Pricing DDQN")
    with st.form("predict"):
        cat = st.selectbox("category", ["fruit", "root", "leafy", "herbs"])
        fr = st.slider("freshness", 0.0, 1.0, 0.9, 0.05)
        inv = st.number_input("inventory_ratio", value=0.5)
        bp = st.number_input("base_price", value=10000.0)
        cp = st.number_input("competitor_ref_price", value=9500.0)
        if st.form_submit_button("Probe /predict"):
            requests.post(f"{PRICING}/predict", json={"state_vectors": [{
                "productId": "probe", "category": cat, "freshness": fr,
                "inventory_ratio": inv, "base_price": bp, "competitor_ref_price": cp}]}, timeout=5)
    poll(PRICING, "p_seq", "p_feed")
    for e in st.session_state.p_feed:
        if e["kind"] != "predict":
            continue
        clip = "⚠ clipped" if e["safety_clipped"] else "no clip"
        st.markdown(f"**{e['productId']} · {e['category']}** → {round(e['targetPrice']):,}đ "
                    f"| action {e['action_idx']}/{e['n_actions']} | Δ {e['delta_pct']}% | {e['freshness_tag']} | {clip}")
        st.caption("obs: " + ", ".join(f"{x:.2f}" for x in e["obs"]))

with col2:
    st.subheader("Recommender FP-Growth")
    with st.form("recommend"):
        carts = st.text_input("cart_categories (phẩy)", "leafy,fruit")
        tk = st.number_input("top_k", value=5, step=1)
        if st.form_submit_button("Probe /recommend"):
            requests.post(f"{RECO}/recommend", json={
                "cart_categories": [c.strip() for c in carts.split(",") if c.strip()],
                "top_k": int(tk)}, timeout=5)
    poll(RECO, "r_seq", "r_feed")
    for e in st.session_state.r_feed:
        if e["kind"] != "recommend":
            continue
        recs = ", ".join(f"{r['category']} ({r['score']})" for r in e["recommendations"])
        st.markdown(f"**cart: {', '.join(e['cart_categories'])}** | source: {e['source']}")
        st.caption("→ " + (recs or "(none)"))

st.button("🔄 Refresh feed")  # manual re-run; rerun also refreshes health + polls
