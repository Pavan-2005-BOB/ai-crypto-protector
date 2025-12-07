// src/App.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import "./App.css";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const API_BASE = "http://localhost:5000";

// Coins supported by your backend
const SUPPORTED_COINS = [
  { symbol: "BTC", name: "Bitcoin" },
  { symbol: "ETH", name: "Ethereum" },
  { symbol: "XRP", name: "Ripple" },
  { symbol: "SOL", name: "Solana" },
  { symbol: "FLR", name: "Flare" },
  { symbol: "SGB", name: "Songbird" },
  { symbol: "DOGE", name: "Dogecoin" },
];

// Helper: compute holdings per symbol from trade history
function computeHoldings(trades) {
  const map = {};
  for (const t of trades) {
    const sym = t.symbol;
    if (!map[sym]) map[sym] = 0;
    map[sym] += t.side === "BUY" ? t.quantity : -t.quantity;
  }
  return map;
}

function App() {
  const [symbol, setSymbol] = useState("BTC");
  const [priceData, setPriceData] = useState(null);
  const [status, setStatus] = useState("");
  const [ai, setAi] = useState(null);
  const [balance, setBalance] = useState(100000); // demo balance

  const [quantity, setQuantity] = useState(1);
  const [trades, setTrades] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [holdings, setHoldings] = useState({});

  // 1. Fetch trades on mount
  useEffect(() => {
    const fetchTrades = async () => {
      try {
        const res = await axios.get(`${API_BASE}/trades`);
        setTrades(res.data);
        // Note: holdings will be updated by the effect below
      } catch (err) {
        console.error("Failed to load trades", err);
      }
    };
    fetchTrades();
  }, []);

  // 2. Auto-recalculate holdings whenever trades change
  // This prevents calculation errors and removes duplicate logic
  useEffect(() => {
    setHoldings(computeHoldings(trades));
  }, [trades]);

  const backendOk = status && status.toLowerCase().includes("running");

  const checkBackend = async () => {
    try {
      const res = await axios.get(`${API_BASE}/`);
      setStatus(res.data);
    } catch (err) {
      console.error(err);
      setStatus("Error connecting to backend");
    }
  };

  const fetchPrice = async () => {
    try {
      setPriceData(null);
      setAi(null);
      setChartData([]);

      const res = await axios.get(`${API_BASE}/price/${symbol}`);
      setPriceData(res.data);

      // --- create synthetic intraday data for chart (demo) ---
      const base = res.data.price;
      const points = Array.from({ length: 40 }).map((_, i) => {
        const variation = (Math.random() - 0.5) * 0.02 * base; // ±2%
        return {
          index: i,
          price: Number((base + variation).toFixed(2)),
        };
      });
      setChartData(points);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch price");
    }
  };

  const getAISuggestion = async () => {
    if (!priceData) return alert("Fetch price first!");

    try {
      const res = await axios.post(`${API_BASE}/ai/suggestion`, {
        price: priceData.price,
      });
      setAi(res.data);
    } catch (err) {
      console.error(err);
      alert("Could not fetch AI advice");
    }
  };

  const handleSymbolChange = (e) => {
    setSymbol(e.target.value);
  };

  // --- FIXED PLACE TRADE FUNCTION ---
  const placeTrade = async (side) => {
    if (!priceData) return alert("Fetch price first!");
    if (!quantity || quantity <= 0) return alert("Enter a valid quantity");

    const sym = priceData.symbol;
    const tradeValue = quantity * priceData.price;
    const currentHolding = holdings[sym] || 0;

    // 1) Balance check for BUY
    if (side === "BUY" && balance < tradeValue) {
      return alert("Not enough demo balance for this trade");
    }

    // 2) Holding check for SELL
    if (side === "SELL" && quantity > currentHolding) {
      return alert(`You only have ${currentHolding} ${sym} in storage`);
    }

    try {
      const res = await axios.post(`${API_BASE}/trade`, {
        symbol: sym,
        side, // "BUY" or "SELL"
        quantity,
        price: priceData.price,
      });

      // 3) Update demo balance
      setBalance((prev) =>
        side === "BUY" ? prev - tradeValue : prev + tradeValue
      );

      // 4) Update trades
      // The useEffect above will detect this change and auto-update holdings
      setTrades((prev) => [res.data, ...prev]);

      alert(`${side} order placed!`);
    } catch (err) {
      console.error("Trade failed:", err);
      alert("Trade failed");
    }
  };

  return (
    <div className="app-container">
      {/* ===== Sidebar ===== */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">A</div>
          <div>
            <div className="sidebar-logo-text-main">AI Guardian</div>
            <div className="sidebar-logo-text-sub">Flare · FTSO</div>
          </div>
        </div>

        <div className="sidebar-balance">
          <div className="sidebar-balance-label">Demo balance</div>
          <div className="sidebar-balance-value">
            $
            {balance.toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}
          </div>
          <div className="sidebar-balance-tag">Virtual trading only</div>
        </div>

        <div>
          <div className="sidebar-nav-section-title">Analytics</div>
          <div className="sidebar-nav">
            <button className="sidebar-nav-item active">
              <span className="sidebar-nav-dot" />
              Trading
            </button>
            <button className="sidebar-nav-item">Portfolio (soon)</button>
            <button className="sidebar-nav-item">Alerts (soon)</button>
          </div>

          <div className="sidebar-nav-section-title">System</div>
          <div className="sidebar-nav">
            <button className="sidebar-nav-item" onClick={checkBackend}>
              Backend status
            </button>
            {status && (
              <div className="sidebar-status">
                <span
                  className={
                    "sidebar-status-dot " + (backendOk ? "ok" : "error")
                  }
                />
                <span>{status}</span>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ===== Main content ===== */}
      <main className="main-content">
        {/* Top bar */}
        <header className="topbar">
          <div>
            <div className="topbar-left-title">
              Trading dashboard
              <span className="topbar-pill">Multi‑layer AI protection</span>
            </div>
            <div className="topbar-subtitle">
              FTSO price + on‑chain + sentiment fused into one protective
              cockpit.
            </div>
            <div
              style={{
                marginTop: 6,
                fontSize: 12,
                color: "#9ca3af",
              }}
            >
              🔗 Network: <b>Flare Coston2 Testnet (FTSO)</b> · 💸 Mode:{" "}
              <b>Simulation only (no real funds)</b>
            </div>
          </div>

          <div className="topbar-actions">
            <button className="topbar-btn ghost">Log in</button>
            <button className="topbar-btn primary">Sign up</button>
          </div>
        </header>

        {/* Grid: chart + trade panel */}
        <div className="main-grid">
          {/* ===== Chart + history section ===== */}
          <section className="chart-section">
            {/* Asset bar */}
            <div className="asset-bar">
              <div className="asset-bar-left">
                <select
                  value={symbol}
                  onChange={handleSymbolChange}
                  className="asset-dropdown"
                >
                  {SUPPORTED_COINS.map((coin) => (
                    <option key={coin.symbol} value={coin.symbol}>
                      {coin.name} ({coin.symbol})
                    </option>
                  ))}
                </select>
                {priceData && (
                  <span className="asset-symbol-label">{priceData.symbol}</span>
                )}
              </div>

              <button className="asset-refresh-btn" onClick={fetchPrice}>
                Refresh price
              </button>
            </div>

            {/* Price strip */}
            {priceData && (
              <div className="asset-strip">
                <div className="asset-price">
                  $
                  {(priceData.price || 0).toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                </div>
                <div className="asset-metrics">
                  <div>
                    <span className="asset-metrics-label">24h Volume</span>
                    <span className="asset-metrics-value">
                      ${(priceData.volume24h || 0).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="asset-metrics-label">24h Change</span>
                    <span
                      className={
                        "asset-change " +
                        ((priceData.change24h || 0) >= 0 ? "up" : "down")
                      }
                    >
                      {(priceData.change24h || 0).toFixed(2)}%
                    </span>
                  </div>
                  <div>
                    <span className="asset-metrics-label">Source</span>
                    <span className="asset-metrics-value">
                      {priceData.source || "FTSO / API"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Chart area */}
            <div className="chart-wrapper">
              <div className="chart-card">
                <div className="chart-toolbar">
                  <span className="chart-toolbar-label">Price action</span>
                  <span className="chart-toolbar-note">
                    Synthetic intraday curve (demo)
                  </span>
                </div>

                <div className="chart-placeholder">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={chartData}
                        margin={{
                          top: 10,
                          right: 10,
                          left: 0,
                          bottom: 0,
                        }}
                      >
                        <XAxis dataKey="index" hide />
                        <YAxis domain={["dataMin", "dataMax"]} hide />
                        <Tooltip
                          formatter={(value) => [`$${value}`, "Price"]}
                          labelFormatter={() => ""}
                        />
                        <Line
                          type="monotone"
                          dataKey="price"
                          stroke="#00ff9d"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="chart-empty-text">
                      Select an asset and click <b>Refresh price</b> to load
                      chart data.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* History */}
            <div className="history-panel">
              <div className="history-header-row">
                <span className="history-title">Transaction history</span>
                <span className="history-count-pill">
                  {trades.length} trade
                  {trades.length === 1 ? "" : "s"}
                </span>
              </div>

              {trades.length === 0 ? (
                <p className="history-empty">
                  No trades yet. Use BUY / SELL on the right to simulate
                  positions.
                </p>
              ) : (
                <div className="history-table-wrapper">
                  <table className="history-table">
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Side</th>
                        <th>Symbol</th>
                        <th style={{ textAlign: "right" }}>Qty</th>
                        <th style={{ textAlign: "right" }}>Price ($)</th>
                        <th style={{ textAlign: "right" }}>Value ($)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trades.map((t) => (
                        <tr className="history-row" key={t.id}>
                          <td>{new Date(t.timestamp).toLocaleString()}</td>
                          <td
                            className={"history-side " + (t.side || "")}
                          >
                            {t.side}
                          </td>
                          <td>{t.symbol}</td>
                          <td style={{ textAlign: "right" }}>{t.quantity}</td>
                          <td style={{ textAlign: "right" }}>
                            {t.price?.toFixed ? t.price.toFixed(2) : t.price}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            {t.valueUSD && t.valueUSD.toFixed
                              ? t.valueUSD.toFixed(2)
                              : t.valueUSD}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          {/* ===== Trade + AI panel ===== */}
          <section className="trade-panel">
            <div className="trade-panel-header">
              <span className="trade-panel-title">Trade & AI protection</span>
              <div className="trade-mode-toggle">
                <span className="trade-mode-pill active">Manual</span>
                <span className="trade-mode-pill">Auto (soon)</span>
              </div>
            </div>

            {/* Trade card */}
            <div className="trade-card">
              <div className="trade-label-row">
                <span className="trade-label">Position size (units)</span>
                <span className="trade-helper-text">
                  Demo only – no real funds
                </span>
              </div>
              <input
                type="number"
                className="trade-input"
                value={quantity}
                min="0"
                step="0.0001"
                onChange={(e) => setQuantity(Number(e.target.value))}
              />

              <div className="trade-summary-row">
                <span>Estimated value</span>
                <span className="trade-summary-value">
                  $
                  {priceData
                    ? (quantity * priceData.price).toFixed(2)
                    : "0.00"}
                </span>
              </div>

              <div className="trade-summary-row">
                <span>Current holding</span>
                <span className="trade-summary-value">
                  {holdings[priceData?.symbol || symbol] || 0}{" "}
                  {priceData?.symbol || symbol}
                </span>
              </div>

              <div className="trade-buttons-row">
                <button
                  className="trade-btn-buy"
                  onClick={() => placeTrade("BUY")}
                  disabled={!priceData}
                >
                  Buy
                </button>
                <button
                  className="trade-btn-sell"
                  onClick={() => placeTrade("SELL")}
                  disabled={!priceData}
                >
                  Sell
                </button>
              </div>
            </div>

            {/* AI card */}
            <div className="ai-card">
              <div className="ai-card-header">
                <span className="ai-card-title">AI risk engine</span>
                <span className="ai-card-tag">
                  Price · on‑chain · sentiment
                </span>
              </div>

              <button
                className="ai-analyze-btn"
                onClick={getAISuggestion}
                disabled={!priceData}
              >
                {priceData
                  ? "Analyze current setup"
                  : "Fetch price to enable AI"}
              </button>

              {ai ? (
                <>
                  <div className="ai-grid">
                    <div className="ai-pill">
                      <div className="ai-pill-label">Whale inflow</div>
                      <div className="ai-pill-value">
                        {ai.chain?.whaleInflow ?? 0}/100
                      </div>
                    </div>
                    <div className="ai-pill">
                      <div className="ai-pill-label">Network stress</div>
                      <div className="ai-pill-value">
                        {ai.chain?.networkStress ?? 0}/100
                      </div>
                    </div>
                    <div className="ai-pill">
                      <div className="ai-pill-label">Sentiment score</div>
                      <div className="ai-pill-value">
                        {ai.sentiment?.sentimentScore ?? 0}/100
                      </div>
                    </div>
                    <div className="ai-pill">
                      <div className="ai-pill-label">FUD level</div>
                      <div className="ai-pill-value">
                        {ai.sentiment?.fudLevel ?? 0}/100
                      </div>
                    </div>
                  </div>

                  <div className="ai-decision-row">
                    Decision:
                    <span
                      className={
                        "ai-decision-badge " + (ai.ai?.action || "HOLD")
                      }
                    >
                      {ai.ai?.action || "HOLD"}
                    </span>
                  </div>

                  <div className="ai-risk-text">
                    Risk: <b>{ai.ai?.risk}</b>
                  </div>

                  <div className="ai-explanation-text">
                    “{ai.explanation}”
                  </div>
                </>
              ) : (
                <p className="ai-placeholder-text">
                  Run an analysis to see a transparent explanation of why the AI
                  suggests BUY / SELL / HOLD.
                </p>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default App;