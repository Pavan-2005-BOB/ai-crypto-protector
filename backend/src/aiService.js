// Simple rule-based AI logic (no API key needed)
module.exports = function getAISuggestion(price) {
  if (price > 70000) {
    return {
      action: "SELL",
      risk: "HIGH",
      reason: "Price is extremely high. Profit-taking recommended."
    };
  } else if (price < 50000) {
    return {
      action: "BUY",
      risk: "MEDIUM",
      reason: "Price is below average range. Could be a good entry point."
    };
  } else {
    return {
      action: "HOLD",
      risk: "LOW",
      reason: "Price is stable. Market not showing strong movement."
    };
  }
};
