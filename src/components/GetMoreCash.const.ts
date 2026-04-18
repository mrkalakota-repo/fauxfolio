// Shared client-safe constants — do not import server-only modules here

export interface CashPack {
  id: string
  label: string
  priceCents: number
  priceDisplay: string
  virtualCash: number
  // How many $10k units this represents — keeps leaderboard formula (invested = 10k + totalTopUps*10k) correct
  topUpUnits: number
  badge?: string
}

export const CASH_PACKS: CashPack[] = [
  {
    id: 'starter',
    label: 'Starter Pack',
    priceCents: 100,
    priceDisplay: '$1',
    virtualCash: 10_000,
    topUpUnits: 1,
  },
  {
    id: 'booster',
    label: 'Booster Pack',
    priceCents: 299,
    priceDisplay: '$2.99',
    virtualCash: 50_000,
    topUpUnits: 5,
    badge: 'Popular',
  },
  {
    id: 'mega',
    label: 'Mega Pack',
    priceCents: 499,
    priceDisplay: '$4.99',
    virtualCash: 100_000,
    topUpUnits: 10,
    badge: 'Best Value',
  },
]

// Backward-compat alias used in legacy imports
export const TOPUP_VIRTUAL_CASH = 10_000
