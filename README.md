# Havwatch - Price Alert Monitor

**Demo:** https://havwatch.vercel.app

A real-time cryptocurrency price alert system powered by the [Havklo SDK](https://github.com/hitakshiA/Havklo_sdk). Set price alerts and get notified when thresholds are crossed.

## What This Demonstrates

I built Havwatch to showcase the **Havklo SDK's** real-time price monitoring capabilities. The app tracks mid-prices from orderbook data and triggers alerts when user-defined thresholds are crossed.

**Key SDK features demonstrated:**
- **Real-time mid-price calculation** - SDK computes mid-price from best bid/ask
- **Multi-symbol tracking** - Monitor 5 trading pairs simultaneously
- **Efficient updates** - `apply_and_get()` returns prices with each orderbook update
- **Production-ready** - Handles high-frequency updates without issues

## Features

- Live price tracking for 5 trading pairs (BTC, ETH, SOL, XRP, ADA)
- Create custom "above" or "below" price alerts
- Alert history with timestamps
- Visual status indicators (SDK loaded, connection status)
- Dark theme optimized for monitoring

## Quick Start

```bash
# Clone the repository
git clone https://github.com/hitakshiA/havwatch.git
cd havwatch

# Install dependencies
npm install

# Start development server
npm run dev
```

Open http://localhost:5173 in your browser.

## How It Works

```javascript
import initWasm, { WasmOrderbook } from './wasm/kraken_wasm.js'

// Track prices from orderbook updates
const result = book.apply_and_get(message, 10)
const currentPrice = result.mid_price

// Check alerts
if (alert.type === 'above' && currentPrice >= alert.price) {
  triggerAlert(alert, currentPrice)
}
```

## Tech Stack

- **React** - UI framework
- **Vite** - Build tool with WASM support
- **Havklo SDK (WASM)** - Kraken orderbook engine
- **Kraken WebSocket v2** - Real-time market data

## About

Built by **Hitakshi Arora** for the Kraken Forge Hackathon.

## License

MIT
