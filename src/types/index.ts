export interface User {
  id: string
  phone: string
  name: string
  cashBalance: number
  totalTopUps: number
  createdAt: string
}

export interface Stock {
  symbol: string
  name: string
  sector: string
  currentPrice: number
  previousClose: number
  openPrice: number
  dayHigh: number
  dayLow: number
  volume: number
  marketCap: number
  description: string
  logoUrl: string
  exchange: string
  priceUpdatedAt: string
  updatedAt: string
  change?: number
  changePercent?: number
  marketOpen?: boolean
}

export interface Holding {
  id: string
  userId: string
  stockSymbol: string
  shares: number
  avgCost: number
  stock: Stock
  currentValue?: number
  gainLoss?: number
  gainLossPercent?: number
}

export interface Order {
  id: string
  userId: string
  stockSymbol: string
  type: 'MARKET' | 'LIMIT'
  side: 'BUY' | 'SELL'
  shares: number
  limitPrice?: number
  fillPrice?: number
  status: 'PENDING' | 'FILLED' | 'CANCELLED' | 'REJECTED'
  createdAt: string
  filledAt?: string
  stock: Stock
}

export interface WatchlistItem {
  id: string
  userId: string
  stockSymbol: string
  stock: Stock
}

export interface PortfolioSnapshot {
  id: string
  userId: string
  totalValue: number
  cashBalance: number
  snapshotAt: string
}

export interface PricePoint {
  timestamp: string
  price: number
  volume: number
}

export interface Portfolio {
  user: User
  holdings: Holding[]
  totalValue: number
  totalCost: number
  totalGainLoss: number
  totalGainLossPercent: number
  dayChange: number
  dayChangePercent: number
  portfolioHistory: PortfolioSnapshot[]
}

export interface OrderFormData {
  symbol: string
  side: 'BUY' | 'SELL'
  type: 'MARKET' | 'LIMIT'
  shares: number
  limitPrice?: number
}

export type TimeRange = '1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL'

export interface ApiResponse<T> {
  data?: T
  error?: string
}

export interface TopMover {
  symbol: string
  name: string
  currentPrice: number
  change: number
  changePercent: number
}

export interface Transaction {
  id: string
  userId: string
  type: string
  realAmountCents: number
  virtualAmount: number
  status: string
  createdAt: string
}
