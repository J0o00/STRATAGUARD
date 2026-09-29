import math
from datetime import datetime

import numpy as np
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st
from sklearn.ensemble import RandomForestClassifier

st.set_page_config(page_title="STRATAGUARD AI", page_icon="⛏️", layout="wide")

# -----------------------------
# Demo model: trained on synthetic/controlled deformation patterns.
# This is explicitly a prototype risk classifier, not a mine-safety model.
# -----------------------------
@st.cache_resource
def build_demo_model():
    rng = np.random.default_rng(42)
    rows = []
    labels = []
    for label, center in enumerate([0.15, 0.38, 0.62, 0.84]):
        for _ in range(500):
            disp = np.clip(rng.normal(center * 18, 1.8), 0, 30)
            rate = np.clip(rng.normal(center * 1.8, 0.35), 0, 4)
            tilt = np.clip(rng.normal(center * 0.20, 0.04), 0, 0.5)
            vib = np.clip(rng.normal(center * 0.85, 0.12), 0, 1.5)
            neigh = np.clip(rng.normal(center * 0.9, 0.12), 0, 1.2)
            persistence = np.clip(rng.normal(center * 0.95, 0.08), 0, 1.2)
            rows.append([disp, rate, tilt, vib, neigh, persistence])
            labels.append(label)
    X = np.asarray(rows)
    y = np.asarray(labels)
    model = RandomForestClassifier(n_estimators=180, random_state=42, max_depth=8)
    model.fit(X, y)
    return model

MODEL = build_demo_model()

SCENARIOS = {
    "Normal conditions": dict(level=0, internet=True, node_failure=False),
    "Progressive deformation": dict(level=2, internet=True, node_failure=False),
    "Critical deformation": dict(level=3, internet=True, node_failure=False),
    "Node S5 failure": dict(level=2, internet=True, node_failure=True),
    "Internet outage": dict(level=2, internet=False, node_failure=False),
}

NODES = [f"S{i}" for i in range(1, 10)]
POSITIONS = {
    "S1": (0, 0), "S2": (1, 0), "S3": (2, 0),
    "S4": (0, 1), "S5": (1, 1), "S6": (2, 1),
    "S7": (0, 2), "S8": (1, 2), "S9": (2, 2),
}

st.markdown("""
<style>
.block-container {padding-top: 1.2rem; padding-bottom: 1rem;}
.small-note {font-size: 0.85rem; color: #6b7280;}
.metric-card {padding: 0.7rem 0.9rem; border: 1px solid #e5e7eb; border-radius: 12px;}
</style>
""", unsafe_allow_html=True)

st.title("⛏️ STRATAGUARD AI")
st.caption("Virtual proof-of-concept • Mine Subsidence Monitoring, Risk Assessment & Early Warning")

with st.sidebar:
    st.header("Simulation Controls")
    scenario = st.selectbox("Demo scenario", list(SCENARIOS.keys()))
    intensity = st.slider("Deformation intensity", 0, 100, 55, 5)
    failed_node = st.selectbox("Simulated failed node", ["None"] + NODES, index=5 if SCENARIOS[scenario]["node_failure"] else 0)
    st.divider()
    st.subheader("Architecture")
    st.write("Surface Nodes → Self-Healing LoRa Mesh → Edge Gateway → AI → GIS → Alert")
    st.caption("The communication layer is simulated virtually; no physical LoRa hardware is required for this demo.")

cfg = SCENARIOS[scenario]
if failed_node != "None":
    cfg = dict(cfg)
    cfg["node_failure"] = True

# Generate sensor state
rng = np.random.default_rng(7)
base_level = cfg["level"]
# intensity scales deformation but keeps scenario semantics
scenario_factor = {0: 0.15, 1: 0.35, 2: 0.62, 3: 0.86}[base_level]
severity = np.clip(0.45 * scenario_factor + 0.55 * (intensity / 100), 0.05, 1.0)

rows = []
for node in NODES:
    x, y = POSITIONS[node]
    # S5 is the epicentre; neighboring nodes receive attenuated deformation.
    dist = math.sqrt((x - 1) ** 2 + (y - 1) ** 2)
    spatial = math.exp(-0.75 * dist)
    local = severity * spatial
    noise = rng.normal(0, 0.03)
    disp = max(0, 1.0 + 16 * local + rng.normal(0, 0.6))
    rate = max(0, 0.12 + 1.8 * local + rng.normal(0, 0.08))
    tilt = max(0, 0.01 + 0.18 * local + rng.normal(0, 0.012))
    vibration = np.clip(0.10 + 0.9 * local + rng.normal(0, 0.06), 0, 1.5)
    neighbor = np.clip(0.15 + 0.95 * local + rng.normal(0, 0.06), 0, 1.2)
    persistence = np.clip(0.10 + 0.95 * local + noise, 0, 1.2)
    battery = np.clip(90 - 12 * (node in ["S5", "S8"]) - rng.normal(0, 2), 8, 100)
    rssi = int(-65 - 9 * dist + rng.normal(0, 2))
    packet = np.clip(99 - 4 * dist + rng.normal(0, 1), 80, 100)
    rows.append([node, x, y, disp, rate, tilt, vibration, neighbor, persistence, battery, rssi, packet])

df = pd.DataFrame(rows, columns=["node", "x", "y", "displacement", "rate", "tilt", "vibration", "neighbor", "persistence", "battery", "rssi", "packet"])

if failed_node != "None":
    df.loc[df.node == failed_node, ["battery", "packet"]] = [0, 0]
    df.loc[df.node == failed_node, "status"] = "OFFLINE"
else:
    df["status"] = "ONLINE"

# Model predictions
features = ["displacement", "rate", "tilt", "vibration", "neighbor", "persistence"]
df["risk_class"] = MODEL.predict(df[features])
df["risk_prob"] = MODEL.predict_proba(df[features]).max(axis=1)

# If a node is failed, don't treat it as a deformation signal.
df.loc[df.status == "OFFLINE", "risk_class"] = 0
df.loc[df.status == "OFFLINE", "risk_prob"] = 0

labels = {0: "NORMAL", 1: "WATCH", 2: "WARNING", 3: "CRITICAL"}
df["risk"] = df.risk_class.map(labels)

risk_order = ["NORMAL", "WATCH", "WARNING", "CRITICAL"]
colors = {"NORMAL": "#16a34a", "WATCH": "#eab308", "WARNING": "#f97316", "CRITICAL": "#dc2626", "OFFLINE": "#6b7280"}

active = df[df.status == "ONLINE"]
if len(active):
    max_idx = active["risk_prob"].idxmax()
    overall = active.loc[max_idx, "risk"]
    overall_prob = float(active.loc[max_idx, "risk_prob"])
else:
    overall, overall_prob = "UNKNOWN", 0

# Header metrics
c1, c2, c3, c4, c5 = st.columns(5)
c1.metric("Overall Risk", overall)
c2.metric("Risk Confidence", f"{overall_prob * 100:.0f}%")
c3.metric("Active Nodes", f"{(df.status == 'ONLINE').sum()}/{len(df)}")
c4.metric("Peak Displacement", f"{df.displacement.max():.1f} mm")
c5.metric("Gateway", "ONLINE" if cfg["internet"] else "OFFLINE MODE")

if overall in ["WARNING", "CRITICAL"]:
    st.error(f"⚠️ {overall}: progressive deformation pattern detected around the monitored zone. Trigger inspection / response workflow.")
elif overall == "WATCH":
    st.warning("🟡 WATCH: deformation trend requires continued monitoring.")
else:
    st.success("🟢 NORMAL: no significant deformation pattern in the current simulation.")

# Map + node table
left, right = st.columns([1.35, 1])
with left:
    st.subheader("Virtual Mine Surface / Sensor Map")
    fig = go.Figure()
    # mesh edges; reroute around failed node by adding a visible alternate path
    edges = [("S1","S2"),("S2","S3"),("S4","S5"),("S5","S6"),("S7","S8"),("S8","S9"),
             ("S1","S4"),("S4","S7"),("S2","S5"),("S5","S8"),("S3","S6"),("S6","S9")]
    for a,b in edges:
        if a == failed_node or b == failed_node:
            continue
        xa, ya = POSITIONS[a]; xb, yb = POSITIONS[b]
        fig.add_trace(go.Scatter(x=[xa,xb], y=[ya,yb], mode="lines", line=dict(color="#94a3b8", width=2), hoverinfo="skip", showlegend=False))
    # Alternate route indication
    if failed_node != "None":
        alt = [("S1","S4"),("S4","S7"),("S7","S8"),("S8","S9")]
        for a,b in alt:
            xa, ya = POSITIONS[a]; xb, yb = POSITIONS[b]
            fig.add_trace(go.Scatter(x=[xa,xb], y=[ya,yb], mode="lines", line=dict(color="#2563eb", width=5, dash="dot"), hoverinfo="skip", showlegend=False))
    for _, r in df.iterrows():
        color = colors["OFFLINE"] if r.status == "OFFLINE" else colors[r.risk]
        fig.add_trace(go.Scatter(x=[r.x], y=[r.y], mode="markers+text", text=[r.node], textposition="top center",
                                 marker=dict(size=25, color=color, line=dict(color="white", width=2)),
                                 customdata=[[r.displacement, r.tilt, r.vibration, r.risk, r.battery, r.rssi]],
                                 hovertemplate="<b>%{text}</b><br>Displacement: %{customdata[0]:.1f} mm<br>Tilt: %{customdata[1]:.2f}°<br>Vibration: %{customdata[2]:.2f}<br>Risk: %{customdata[3]}<br>Battery: %{customdata[4]:.0f}%<br>RSSI: %{customdata[5]} dBm<extra></extra>",
                                 showlegend=False))
    fig.add_annotation(x=1, y=1, text="UNDERGROUND PANEL P-03", showarrow=False, font=dict(size=12))
    fig.update_layout(height=440, margin=dict(l=10,r=10,t=10,b=10), xaxis=dict(visible=False, range=[-0.5,2.5]), yaxis=dict(visible=False, range=[-0.5,2.5]), plot_bgcolor="#f8fafc", paper_bgcolor="white")
    st.plotly_chart(fig, use_container_width=True)
    if failed_node != "None":
        st.info(f"🔄 **Self-healing mesh:** {failed_node} is offline. The virtual network is demonstrating an alternate route around the failed node.")

with right:
    st.subheader("Node Status")
    show = df[["node","risk","displacement","tilt","battery","rssi","packet","status"]].copy()
    show.columns = ["Node","Risk","Disp. (mm)","Tilt (°)","Battery (%)","RSSI (dBm)","Packet %","Status"]
    st.dataframe(show, use_container_width=True, hide_index=True, height=440)

# Trends
st.subheader("Deformation Trend")
steps = 24
t = np.arange(steps)
trend_factor = severity
trend = 1.0 + (t / (steps - 1)) ** (1.7 if base_level < 3 else 1.3) * (4 + 16 * trend_factor)
trend += rng.normal(0, 0.15, steps)
trend = np.maximum.accumulate(trend - np.minimum(0, trend.min() - 1))
trend_df = pd.DataFrame({"Time step": t, "S5 displacement (mm)": trend})
fig2 = px.line(trend_df, x="Time step", y="S5 displacement (mm)", markers=True)
fig2.update_layout(height=300, margin=dict(l=10,r=10,t=10,b=10), yaxis_title="Displacement (mm)")
st.plotly_chart(fig2, use_container_width=True)

# Explainability and system health
c1, c2 = st.columns(2)
with c1:
    st.subheader("Why is the risk changing?")
    peak = df.loc[df.displacement.idxmax()]
    factors = pd.DataFrame({
        "Feature": ["Displacement", "Displacement rate", "Tilt", "Vibration anomaly", "Neighbour correlation", "Persistence"],
        "Relative signal": [peak.displacement / 20, peak.rate / 2, peak.tilt / 0.2, peak.vibration / 1.0, peak.neighbor / 1.0, peak.persistence / 1.0]
    })
    factors["Relative signal"] = factors["Relative signal"].clip(0, 1)
    fig3 = px.bar(factors, x="Relative signal", y="Feature", orientation="h", range_x=[0,1])
    fig3.update_layout(height=310, margin=dict(l=10,r=10,t=10,b=10), xaxis_title="Normalized signal", yaxis_title="")
    st.plotly_chart(fig3, use_container_width=True)
with c2:
    st.subheader("System Health")
    health = {
        "Sensor network": "🟢 ACTIVE",
        "Edge gateway": "🟢 ACTIVE",
        "Local AI": "🟢 ACTIVE",
        "Local storage": "🟢 ACTIVE",
        "Internet backhaul": "🟢 ONLINE" if cfg["internet"] else "🔴 OFFLINE",
        "Local alerts": "🟢 AVAILABLE",
        "Cloud sync": "🟢 READY" if cfg["internet"] else "🟡 QUEUED",
    }
    for k, v in health.items():
        st.write(f"**{k}:** {v}")
    if not cfg["internet"]:
        st.warning("Internet is unavailable. Monitoring, local inference, storage and local alerts continue; buffered data will sync when connectivity returns.")

# Alert log
st.subheader("Event / Alert Log")
now = datetime.now().strftime("%H:%M:%S")
events = [
    [now, "SYSTEM", "Virtual monitoring session started", "INFO"],
    [now, "S5", f"Deformation pattern: {overall}", "ALERT" if overall in ["WARNING","CRITICAL"] else "INFO"],
]
if failed_node != "None":
    events.append([now, failed_node, "Node/link failure detected — alternate route simulated", "RECOVERY"])
if not cfg["internet"]:
    events.append([now, "GATEWAY", "Internet unavailable — switched to offline-first mode", "OFFLINE"])
log = pd.DataFrame(events, columns=["Time","Source","Event","Type"])
st.dataframe(log, use_container_width=True, hide_index=True)

st.caption("Prototype disclaimer: this virtual demo uses synthetic/controlled data patterns. It demonstrates the proposed sensing, networking, edge, AI and alert workflow; real mine deployment requires mine-specific field data, calibration, validation and safety authorization.")
