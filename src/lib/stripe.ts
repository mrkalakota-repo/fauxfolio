import Stripe from 'stripe'

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-03-25.dahlia' as any })
  : null

export const TOPUP_PRICE_CENTS = 100          // $1.00
export const TOPUP_VIRTUAL_CASH = 10_000      // $10,000 virtual
export const hasStripe = !!process.env.STRIPE_SECRET_KEY

export const TOURNAMENT_ENTRY_CENTS = 199     // $1.99
export const TOURNAMENT_VIRTUAL_CASH = 20_000 // $20,000 tournament starting balance
