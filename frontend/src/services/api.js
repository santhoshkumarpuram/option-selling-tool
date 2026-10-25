import axios from 'axios'

const client = axios.create({
  baseURL: '/api',
  timeout: 45000,
})

const api = {
  // Auth & Broker
  async connectBroker(payload) {
    const { data } = await client.post('/auth/connect', payload)
    return data
  },

  async getBrokerStatus() {
    const { data } = await client.get('/auth/status')
    return data
  },

  async getAllBrokers() {
    const { data } = await client.get('/auth/all')
    return data
  },

  // Scanner
  async getScanner() {
    const { data } = await client.get('/scanner')
    return data
  },

  async refreshScanner() {
    const { data } = await client.post('/scanner/refresh')
    return data
  },

  // Analysis
  async getAnalysis(symbol) {
    const { data } = await client.get(`/analysis/${encodeURIComponent(symbol)}`)
    return data
  },

  // Options & Strategy
  async getOptionChain(symbol, expiry) {
    const { data } = await client.get(`/options/chain/${encodeURIComponent(symbol)}`, {
      params: expiry ? { expiry } : {},
    })
    return data
  },

  async calculateStrategy(payload) {
    const { data } = await client.post('/options/strategy', payload)
    return data
  },

  async placeOrder(payload) {
    const { data } = await client.post('/options/order', payload)
    return data
  },

  // Positions
  async getPositions(status) {
    const { data } = await client.get('/positions', {
      params: status ? { status } : {},
    })
    return data
  },

  async closePosition(id) {
    const { data } = await client.post(`/positions/${id}/close`)
    return data
  },

  // Settings
  async getSettings() {
    const { data } = await client.get('/settings')
    return data
  },

  async updateSettings(payload) {
    const { data } = await client.put('/settings', payload)
    return data
  },
}

export default api
