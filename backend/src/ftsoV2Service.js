const { ethers } = require("ethers");

// 1. Coston2 Network Configuration
// RPC URL for Flare Testnet Coston2
const RPC_URL = "https://coston2-api.flare.network/ext/C/rpc";
const provider = new ethers.JsonRpcProvider(RPC_URL);

// 2. FTSOv2 Contract Address (Coston2)
// This is the specific address for the 'Fast Updates' contract on Coston2
const FTSO_V2_ADDRESS = "0x3d893C53D9e8056135C26C8c638B76C8b60Df726";

// 3. ABI (Interface)
// We only need the function to get a single feed
const FTSO_V2_ABI = [
  "function getFeedById(bytes21 _feedId) view returns (uint256 _value, int8 _decimals, uint64 _timestamp)"
];

// 4. Feed IDs (Block-Latency Feeds)
// These are unique IDs for each token. 
// See official docs for more: https://dev.flare.network/ftso/feeds
const FEED_IDS = {
  "FLR": "0x01464c522f55534400000000000000000000000000", // FLR/USD
  "BTC": "0x014254432f55534400000000000000000000000000", // BTC/USD
  "ETH": "0x014554482f55534400000000000000000000000000", // ETH/USD
  "XRP": "0x015852502f55534400000000000000000000000000", // XRP/USD
  "SOL": "0x01534f4c2f55534400000000000000000000000000", // SOL/USD
  "SGB": "0x015347422f55534400000000000000000000000000", // SGB/USD
  "DOGE": "0x01444f47452f555344000000000000000000000000" // DOGE/USD
};

async function getFtsoV2Price(symbol) {
  try {
    const cleanSymbol = symbol.toUpperCase();
    const feedId = FEED_IDS[cleanSymbol];

    if (!feedId) {
      console.warn(`[FTSOv2] No Feed ID found for ${cleanSymbol}`);
      return null; 
    }

    // Connect to the contract
    const ftsoV2 = new ethers.Contract(FTSO_V2_ADDRESS, FTSO_V2_ABI, provider);

    // Fetch the data
    // Returns: [value (BigInt), decimals (BigInt), timestamp (BigInt)]
    const [priceBigInt, decimalsBigInt, timestampBigInt] = await ftsoV2.getFeedById(feedId);

    // Convert Decimals
    // FTSOv2 returns dynamic decimals (usually 2 or 5 depending on asset)
    const decimals = Number(decimalsBigInt);
    const price = Number(priceBigInt) / Math.pow(10, decimals);

    return {
      symbol: cleanSymbol,
      price: price,
      timestamp: Number(timestampBigInt),
      source: "FTSOv2"
    };

  } catch (error) {
    console.error(`[FTSOv2] Error fetching ${symbol}:`, error.message);
    return null;
  }
}

module.exports = { getFtsoV2Price };