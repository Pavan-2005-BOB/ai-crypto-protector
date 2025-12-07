// backend/src/server.js
const express = require("express");
const cors = require("cors");
const axios = require("axios");

// Custom modules
const getAISuggestion = require("./aiService");
const getChainSignals = require("./chainSignals");
const getSentimentSignals = require("./sentimentSignals");
const { getFtsoV2Price } = require("./ftsoV2Service");
const { addTrade, getTrades } = require("./tradeService");

const app = express();

// Allow frontend
app.use(cors({ origin: "*" }));
app.use(express.json());

// CoinGecko map for extra market data
const COINGECKO_MAP = {
  BTC: "bitcoin",
  ETH: "ethereum",
  XRP: "ripple",
  SOL: "solana",
  FLR: "flare-networks",
  SGB: "songbird",
  DOGE: "dogecoin",
};

// Health check
app.get("/", (req, res) => {
  res.send("Flare AI Backend is Running");
});

// --- PRICE ENDPOINT (Hybrid: FTSOv2 + CoinGecko) ---
app.get("/price/:symbol", async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const cgId = COINGECKO_MAP[symbol];

  let ftsoData = null;
  let cgData = null;

  // A. Fetch real price from Flare FTSOv2
  try {
    console.log(`[FTSOv2] Fetching ${symbol}...`);
    ftsoData = await getFtsoV2Price(symbol);
  } catch (err) {
    console.warn("[FTSOv2] Fetch failed:", err.message);
  }

  // B. Fetch volume/change from CoinGecko
  if (cgId) {
    try {
      const cgRes = await axios.get(
        `https://api.coingecko.com/api/v3/simple/price?ids=${cgId}&vs_currencies=usd&include_24hr_vol=true&include_24hr_change=true`,
        { timeout: 1500 }
      );
      cgData = cgRes.data[cgId];
    } catch (err) {
      console.warn("[CoinGecko] Fetch failed:", err.message);
    }
  }

  // C. Merge logic
  const finalPrice = ftsoData?.price || cgData?.usd || 0;
  const finalVolume = cgData?.usd_24h_vol || 0;
  const finalChange = cgData?.usd_24h_change || 0;
  const finalSource = ftsoData
    ? "FTSOv2 (On-chain)"
    : cgData
    ? "CoinGecko"
    : "Unknown";

  if (finalPrice === 0) {
    return res
      .status(500)
      .json({ error: "Price unavailable from all sources" });
  }

  res.json({
    symbol,
    price: finalPrice,
    volume24h: finalVolume,
    change24h: finalChange,
    timestamp: ftsoData?.timestamp || Date.now(),
    source: finalSource,
  });
});

// --- AI ENDPOINT (Combines all your signals) ---
app.post("/ai/suggestion", (req, res) => {
  const { price } = req.body;

  if (!price) {
    return res.status(400).json({ error: "Price is required" });
  }

  // 1. Get signals
  const chain = getChainSignals();           // whaleInflow, networkStress
  const sentiment = getSentimentSignals();   // sentimentScore, fudLevel
  const aiAnalysis = getAISuggestion(price); // { action, risk, reason }

  // 2. Build explanation
  const reasons = [];
  if (aiAnalysis.action === "SELL")
    reasons.push("Price is in high-risk zone");
  if (aiAnalysis.action === "BUY")
    reasons.push("Price is in attractive entry zone");
  if (chain.whaleInflow > 80)
    reasons.push("High whale activity detected");
  if (sentiment.fudLevel > 70)
    reasons.push("Market FUD is unusually high");

  const fullExplanation =
    reasons.length > 0 ? reasons.join(". ") + "." : aiAnalysis.reason;

  // 3. Respond
  res.json({
    market: { price },
    chain,
    sentiment,
    ai: aiAnalysis,
    explanation: fullExplanation,
  });
});

// --- TRADE ENDPOINTS (Simulation only) ---

// Save a virtual trade (BUY / SELL)
app.post("/trade", (req, res) => {
  const { symbol, side, quantity, price } = req.body;

  if (!symbol || !side || !quantity || !price) {
    return res
      .status(400)
      .json({ error: "Missing trade fields (symbol, side, quantity, price)" });
  }

  try {
    const trade = addTrade({
      symbol,
      side,
      quantity: Number(quantity),
      price: Number(price),
    });
    res.json(trade);
  } catch (err) {
    console.error("Trade error:", err);
    res.status(500).json({ error: "Failed to record trade" });
  }
});

// Return trade history
app.get("/trades", (req, res) => {
  try {
    const allTrades = getTrades();
    res.json(allTrades);
  } catch (err) {
    console.error("Get trades error:", err);
    res.status(500).json({ error: "Failed to load trades" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
