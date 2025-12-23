import { useState, useEffect, useRef } from 'react'
import initWasm, { WasmOrderbook } from 'kraken-wasm'

const SYMBOLS = ['BTC/USD', 'ETH/USD', 'SOL/USD']

export default function App() {
  const [status, setStatus] = useState('Initializing...')
  const [prices, setPrices] = useState({})
  const [alerts, setAlerts] = useState([
    { id: 1, symbol: 'BTC/USD', type: 'above', price: 100000, active: true },
    { id: 2, symbol: 'ETH/USD', type: 'below', price: 3000, active: true },
  ])
  const [alertHistory, setAlertHistory] = useState([])
  const [newAlert, setNewAlert] = useState({ symbol: 'BTC/USD', type: 'above', price: '' })
  const booksRef = useRef({})
  const wsRef = useRef(null)

  useEffect(() => {
    let mounted = true

    async function init() {
      await initWasm()
      if (!mounted) return

      SYMBOLS.forEach(sym => {
        booksRef.current[sym] = new WasmOrderbook()
      })

      setStatus('Connecting...')
      const ws = new WebSocket('wss://ws.kraken.com/v2')
      wsRef.current = ws

      ws.onopen = () => {
        setStatus('Connected')
        ws.send(JSON.stringify({
          method: 'subscribe',
          params: { channel: 'book', symbol: SYMBOLS, depth: 10 }
        }))
      }

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)
        if (data.channel === 'book' && data.data) {
          const symbol = data.data[0]?.symbol
          if (symbol && booksRef.current[symbol]) {
            booksRef.current[symbol].apply_message(event.data)
            const midPrice = booksRef.current[symbol].get_mid_price()
            if (midPrice) {
              setPrices(prev => {
                const newPrices = { ...prev, [symbol]: midPrice }
                return newPrices
              })
            }
          }
        }
      }

      ws.onclose = () => setStatus('Disconnected')
      ws.onerror = () => setStatus('Error')
    }

    init()
    return () => {
      mounted = false
      wsRef.current?.close()
    }
  }, [])

  // Check alerts
  useEffect(() => {
    alerts.forEach(alert => {
      if (!alert.active) return
      const currentPrice = prices[alert.symbol]
      if (!currentPrice) return

      const triggered = alert.type === 'above'
        ? currentPrice >= alert.price
        : currentPrice <= alert.price

      if (triggered) {
        setAlerts(prev => prev.map(a =>
          a.id === alert.id ? { ...a, active: false } : a
        ))
        setAlertHistory(prev => [{
          id: Date.now(),
          symbol: alert.symbol,
          type: alert.type,
          targetPrice: alert.price,
          actualPrice: currentPrice,
          time: new Date().toLocaleTimeString()
        }, ...prev].slice(0, 20))
      }
    })
  }, [prices, alerts])

  const addAlert = () => {
    if (!newAlert.price) return
    setAlerts(prev => [...prev, {
      id: Date.now(),
      symbol: newAlert.symbol,
      type: newAlert.type,
      price: parseFloat(newAlert.price),
      active: true
    }])
    setNewAlert({ ...newAlert, price: '' })
  }

  const removeAlert = (id) => {
    setAlerts(prev => prev.filter(a => a.id !== id))
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>HAVWATCH</h1>
        <div style={styles.statusBar}>
          <span style={{
            ...styles.statusDot,
            background: status === 'Connected' ? '#00FF88' : '#FF4444'
          }} />
          <span>{status}</span>
        </div>
      </header>

      <div style={styles.content}>
        <div style={styles.pricesPanel}>
          <h2 style={styles.sectionTitle}>LIVE PRICES</h2>
          {SYMBOLS.map(sym => (
            <div key={sym} style={styles.priceRow}>
              <span style={styles.symbol}>{sym}</span>
              <span style={styles.price}>
                ${prices[sym]?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '---'}
              </span>
            </div>
          ))}
        </div>

        <div style={styles.alertsPanel}>
          <h2 style={styles.sectionTitle}>ACTIVE ALERTS</h2>
          <div style={styles.alertsList}>
            {alerts.filter(a => a.active).map(alert => (
              <div key={alert.id} style={styles.alertItem}>
                <span style={styles.alertIcon}>◉</span>
                <span>{alert.symbol} {alert.type} ${alert.price.toLocaleString()}</span>
                <button style={styles.removeBtn} onClick={() => removeAlert(alert.id)}>×</button>
              </div>
            ))}
            {alerts.filter(a => a.active).length === 0 && (
              <div style={styles.emptyState}>No active alerts</div>
            )}
          </div>

          <div style={styles.addAlert}>
            <select
              style={styles.select}
              value={newAlert.symbol}
              onChange={e => setNewAlert({ ...newAlert, symbol: e.target.value })}
            >
              {SYMBOLS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select
              style={styles.select}
              value={newAlert.type}
              onChange={e => setNewAlert({ ...newAlert, type: e.target.value })}
            >
              <option value="above">Above</option>
              <option value="below">Below</option>
            </select>
            <input
              style={styles.input}
              type="number"
              placeholder="Price"
              value={newAlert.price}
              onChange={e => setNewAlert({ ...newAlert, price: e.target.value })}
            />
            <button style={styles.addBtn} onClick={addAlert}>+</button>
          </div>
        </div>

        <div style={styles.historyPanel}>
          <h2 style={styles.sectionTitle}>ALERT HISTORY</h2>
          <div style={styles.historyList}>
            {alertHistory.map(h => (
              <div key={h.id} style={styles.historyItem}>
                <span style={styles.historyTime}>{h.time}</span>
                <span style={styles.historyBell}>🔔</span>
                <span>{h.symbol} crossed ${h.targetPrice.toLocaleString()} (was ${h.actualPrice.toLocaleString()})</span>
              </div>
            ))}
            {alertHistory.length === 0 && (
              <div style={styles.emptyState}>No triggered alerts yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    background: '#0a0e14',
    color: '#b3b1ad',
    fontFamily: "'SF Mono', monospace",
    padding: '20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    borderBottom: '1px solid #2a2e38',
    paddingBottom: '15px',
  },
  title: {
    color: '#00D9FF',
    fontSize: '24px',
    fontWeight: 'bold',
    letterSpacing: '4px',
  },
  statusBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  content: {
    display: 'grid',
    gridTemplateColumns: '1fr 1.5fr 1.5fr',
    gap: '20px',
  },
  pricesPanel: {
    background: '#12171f',
    borderRadius: '8px',
    padding: '20px',
    border: '1px solid #2a2e38',
  },
  alertsPanel: {
    background: '#12171f',
    borderRadius: '8px',
    padding: '20px',
    border: '1px solid #2a2e38',
  },
  historyPanel: {
    background: '#12171f',
    borderRadius: '8px',
    padding: '20px',
    border: '1px solid #2a2e38',
  },
  sectionTitle: {
    color: '#00D9FF',
    fontSize: '12px',
    letterSpacing: '2px',
    marginBottom: '15px',
  },
  priceRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px 0',
    borderBottom: '1px solid #2a2e38',
  },
  symbol: {
    color: '#b3b1ad',
  },
  price: {
    color: '#FFD700',
    fontWeight: 'bold',
  },
  alertsList: {
    marginBottom: '15px',
  },
  alertItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 0',
    borderBottom: '1px solid #2a2e38',
  },
  alertIcon: {
    color: '#00FF88',
  },
  removeBtn: {
    marginLeft: 'auto',
    background: 'transparent',
    border: 'none',
    color: '#FF4444',
    cursor: 'pointer',
    fontSize: '18px',
  },
  addAlert: {
    display: 'flex',
    gap: '10px',
  },
  select: {
    background: '#1a1f29',
    border: '1px solid #2a2e38',
    color: '#b3b1ad',
    padding: '8px',
    borderRadius: '4px',
  },
  input: {
    background: '#1a1f29',
    border: '1px solid #2a2e38',
    color: '#b3b1ad',
    padding: '8px',
    borderRadius: '4px',
    flex: 1,
  },
  addBtn: {
    background: '#00D9FF',
    border: 'none',
    color: '#0a0e14',
    padding: '8px 15px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  historyList: {
    maxHeight: '300px',
    overflowY: 'auto',
  },
  historyItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 0',
    borderBottom: '1px solid #2a2e38',
    fontSize: '13px',
  },
  historyTime: {
    color: '#666',
    fontSize: '11px',
  },
  historyBell: {
    fontSize: '14px',
  },
  emptyState: {
    color: '#666',
    textAlign: 'center',
    padding: '20px',
  },
}
