// backend/src/tradeService.js

let trades = [];
let nextId = 1;

function addTrade({ symbol, side, quantity, price }) {
  const valueUSD = quantity * price;
  const trade = {
    id: nextId++,
    symbol: symbol.toUpperCase(),
    side,
    quantity,
    price,
    valueUSD,
    timestamp: Date.now(),
  };

  trades.unshift(trade);
  return trade;
}

function getTrades() {
  return trades;
}

module.exports = {
  addTrade,
  getTrades,
};
