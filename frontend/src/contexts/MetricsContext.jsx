import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'

/**
 * MetricsContext — Shared WebSocket connection for real-time GPU metrics.
 * 
 * PROBLEM SOLVED: Previously, 7+ components each opened their own WebSocket
 * to ws://localhost:8000/ws/metrics, causing redundant connections, redundant
 * JSON.parse() calls, and redundant setState re-renders.
 * 
 * SOLUTION: Single WebSocket, single JSON.parse(), debounced state updates
 * (coalesced via requestAnimationFrame to ~60Hz max), shared via React context.
 */

const MetricsContext = createContext(null)

const WS_URL = 'ws://localhost:8000/ws/metrics'
const RECONNECT_BASE_DELAY = 1000
const RECONNECT_MAX_DELAY = 30000

export function MetricsProvider({ children }) {
  const [metrics, setMetrics] = useState(null)
  const [isConnected, setIsConnected] = useState(false)

  const wsRef = useRef(null)
  const reconnectTimeoutRef = useRef(null)
  const reconnectDelayRef = useRef(RECONNECT_BASE_DELAY)
  const pendingDataRef = useRef(null)
  const rafRef = useRef(null)

  // Debounced state update — coalesce rapid WS messages into a single React render
  // using requestAnimationFrame (~16ms batching, prevents re-render thrashing)
  const flushPendingData = useCallback(() => {
    if (pendingDataRef.current !== null) {
      setMetrics(pendingDataRef.current)
      pendingDataRef.current = null
    }
    rafRef.current = null
  }, [])

  const scheduleUpdate = useCallback((data) => {
    pendingDataRef.current = data
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(flushPendingData)
    }
  }, [flushPendingData])

  const connect = useCallback(() => {
    // Clean up any existing connection
    if (wsRef.current) {
      try { wsRef.current.close() } catch (e) { /* ignore */ }
    }

    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => {
      setIsConnected(true)
      reconnectDelayRef.current = RECONNECT_BASE_DELAY  // Reset backoff on success
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        scheduleUpdate(data)
      } catch (e) {
        console.error('[MetricsContext] Failed to parse WS payload:', e)
      }
    }

    ws.onerror = (error) => {
      console.error('[MetricsContext] WebSocket error:', error)
    }

    ws.onclose = () => {
      setIsConnected(false)
      wsRef.current = null

      // Exponential backoff reconnection
      const delay = reconnectDelayRef.current
      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectDelayRef.current = Math.min(delay * 2, RECONNECT_MAX_DELAY)
        connect()
      }, delay)
    }
  }, [scheduleUpdate])

  useEffect(() => {
    connect()

    return () => {
      // Cleanup on unmount
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [connect])

  const contextValue = React.useMemo(() => ({
    metrics,
    isConnected
  }), [metrics, isConnected])

  return (
    <MetricsContext.Provider value={contextValue}>
      {children}
    </MetricsContext.Provider>
  )
}

/**
 * Hook to consume shared metrics from the single WebSocket connection.
 * Replaces individual WebSocket connections in Dashboard, GPUMonitor,
 * AIDataCenter, WaterComputePlanner, ComputeComparison, ControlCenter.
 */
export function useSharedMetrics() {
  const context = useContext(MetricsContext)
  if (context === null) {
    throw new Error('useSharedMetrics must be used within a MetricsProvider')
  }
  return context
}
