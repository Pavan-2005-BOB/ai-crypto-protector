// Simulated on-chain signals (placeholder for real FTSO or blockchain APIs)
module.exports = function getChainSignals() {
  return {
    whaleInflow: Math.floor(Math.random() * 100),    // 0–100
    networkStress: Math.floor(Math.random() * 100),  // 0–100
  };
};
