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

// Supported coins
const SUPPORTED_COINS = [
  { symbol: "BTC", name: "Bitcoin" },
  { symbol: "ETH", name: "Ethereum" },
  { symbol: "XRP", name: "Ripple" },
  { symbol: "SOL", name: "Solana" },
  { symbol: "FLR", name: "Flare" },
  { symbol: "SGB", name: "Songbird" },
  { symbol: "DOGE", name: "Dogecoin" },
];

// Holdings calculator
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
  const [balance, setBalance] = useState(100000);

  const [quantity, setQuantity] = useState(1);
  const [trades, setTrades] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [holdings, setHoldings] = useState({});

  // NEW: Wallet connection state
  const [walletAddress, setWalletAddress] = useState(null);

  // Connect Wallet
  const connectWallet = async () => {
    if (!window.ethereum) {
      return alert("MetaMask not found. Install it to continue.");
    }

    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      setWalletAddress(accounts[0]);
      console.log("Wallet connected:", accounts[0]);
    } catch (err) {
      console.error("Wallet connection failed", err);
    }
  };

  // Show shortened address
  const formatAddress = (addr) =>
    addr ? addr.slice(0, 6) + "..." + addr.slice(-4) : "";

  // 1. Load trades on mount
  useEffect(() => {
    const fetchTrades = async () => {
      try {
        const res = await axios.get(`${API_BASE}/trades`);
        setTrades(res.data);
      } catch (err) {
        console.error("Failed to load trades", err);
      }
    };
    fetchTrades();
  }, []);

  // 2. Recalculate holdings
  useEffect(() => {
    setHoldings(computeHoldings(trades));
  }, [trades]);

  const backendOk = status && status.toLowerCase().includes("running");

  const checkBackend = async () => {
    try {
      const res = await axios.get(`${API_BASE}/`);
      setStatus(res.data);
    } catch {
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

      const base = res.data.price;
      const points = Array.from({ length: 40 }).map((_, i) => ({
        index: i,
        price: Number((base + (Math.random() - 0.5) * 0.02 * base).toFixed(2)),
      }));

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
    } catch {
      alert("Could not fetch AI advice");
    }
  };

  const placeTrade = async (side) => {
    if (!priceData) return alert("Fetch price first!");
    if (!quantity || quantity <= 0) return alert("Enter valid quantity");

    const sym = priceData.symbol;
    const tradeValue = quantity * priceData.price;
    const currentHolding = holdings[sym] || 0;

    if (side === "BUY" && balance < tradeValue)
      return alert("Not enough demo balance");

    if (side === "SELL" && quantity > currentHolding)
      return alert(`You only have ${currentHolding} ${sym}`);

    try {
      const res = await axios.post(`${API_BASE}/trade`, {
        symbol: sym,
        side,
        quantity,
        price: priceData.price,
      });

      setBalance((prev) =>
        side === "BUY" ? prev - tradeValue : prev + tradeValue
      );

      setTrades((prev) => [res.data, ...prev]);

      alert(`${side} order placed!`);
    } catch {
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
            ${balance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
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

      {/* ===== Main Content ===== */}
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
              <b>Simulation only</b>
            </div>
          </div>

          {/* -------- TOP RIGHT BUTTONS (Wallet Connect Added Here!) -------- */}
          <div className="topbar-actions">
            {walletAddress ? (
              <div className="wallet-connected">
                {formatAddress(walletAddress)}
              </div>
            ) : (
              <button className="topbar-btn primary" onClick={connectWallet}>
                Connect Wallet
              </button>
            )}

            <button className="topbar-btn ghost">Log in</button>
            <button className="topbar-btn primary">Sign up</button>
          </div>
        </header>

        {/* ===== Chart + Trade Panel Grid ===== */}
        <div className="main-grid">
          {/* LEFT SIDE — chart + history */}
          <section className="chart-section">
            <div className="asset-bar">
              <div className="asset-bar-left">
                <select
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  className="asset-dropdown"
                >
                  {SUPPORTED_COINS.map((c) => (
                    <option key={c.symbol} value={c.symbol}>
                      {c.name} ({c.symbol})
                    </option>
                  ))}
                </select>

                {priceData && (
                  <span className="asset-symbol-label">
                    {priceData.symbol}
                  </span>
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
                  ${priceData.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
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
                      {priceData.source}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Chart */}
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
                      <LineChart data={chartData}>
                        <XAxis dataKey="index" hide />
                        <YAxis domain={["dataMin", "dataMax"]} hide />
                        <Tooltip formatter={(v) => [`$${v}`, "Price"]} />
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
                      Click <b>Refresh price</b> to load chart data.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Trade History */}
            <div className="history-panel">
              <div className="history-header-row">
                <span className="history-title">Transaction history</span>
                <span className="history-count-pill">
                  {trades.length} trade{trades.length !== 1 ? "s" : ""}
                </span>
              </div>

              {trades.length === 0 ? (
                <p className="history-empty">
                  No trades yet. Use BUY / SELL to simulate.
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
                        <tr key={t.id}>
                          <td>{new Date(t.timestamp).toLocaleString()}</td>
                          <td className={`history-side ${t.side}`}>{t.side}</td>
                          <td>{t.symbol}</td>
                          <td style={{ textAlign: "right" }}>{t.quantity}</td>
                          <td style={{ textAlign: "right" }}>
                            {t.price.toFixed(2)}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            {t.valueUSD.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          {/* RIGHT SIDE — Trading + AI Panel */}
          <section className="trade-panel">
            <div className="trade-panel-header">
              <span className="trade-panel-title">Trade & AI protection</span>
              <div className="trade-mode-toggle">
                <span className="trade-mode-pill active">Manual</span>
                <span className="trade-mode-pill">Auto (soon)</span>
              </div>
            </div>

            <div className="trade-card">
              <div className="trade-label-row">
                <span className="trade-label">Position size (units)</span>
                <span className="trade-helper-text">Demo only</span>
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
                  ${priceData ? (quantity * priceData.price).toFixed(2) : "0.00"}
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
                  disabled={!priceData}
                  onClick={() => placeTrade("BUY")}
                >
                  Buy
                </button>

                <button
                  className="trade-btn-sell"
                  disabled={!priceData}
                  onClick={() => placeTrade("SELL")}
                >
                  Sell
                </button>
              </div>
            </div>

            <div className="ai-card">
              <div className="ai-card-header">
                <span className="ai-card-title">AI risk engine</span>
                <span className="ai-card-tag">
                  Price · On-chain · Sentiment
                </span>
              </div>

              <button
                className="ai-analyze-btn"
                onClick={getAISuggestion}
                disabled={!priceData}
              >
                {priceData ? "Analyze current setup" : "Fetch price first"}
              </button>

              {ai ? (
                <>
                  <div className="ai-grid">
                    <div className="ai-pill">
                      <div className="ai-pill-label">Whale inflow</div>
                      <div className="ai-pill-value">
                        {ai.chain?.whaleInflow}/100
                      </div>
                    </div>

                    <div className="ai-pill">
                      <div className="ai-pill-label">Network stress</div>
                      <div className="ai-pill-value">
                        {ai.chain?.networkStress}/100
                      </div>
                    </div>

                    <div className="ai-pill">
                      <div className="ai-pill-label">Sentiment score</div>
                      <div className="ai-pill-value">
                        {ai.sentiment?.sentimentScore}/100
                      </div>
                    </div>

                    <div className="ai-pill">
                      <div className="ai-pill-label">FUD level</div>
                      <div className="ai-pill-value">
                        {ai.sentiment?.fudLevel}/100
                      </div>
                    </div>
                  </div>

                  <div className="ai-decision-row">
                    Decision:
                    <span className={`ai-decision-badge ${ai.ai?.action}`}>
                      {ai.ai?.action}
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
                  Run analysis to get BUY / SELL / HOLD recommendation.
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
