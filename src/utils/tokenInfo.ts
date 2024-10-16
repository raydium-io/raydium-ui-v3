
export interface TokenPrice {
  price: number
}
export interface TokenInfo {
  [key: string]: TokenPrice
}

export const tokensPrices: TokenInfo = {
  USDC: { price: 1 },
  BTC: { price: 64572.0 },
  ETH: { price: 3430.21 },
  USDT: { price: 0.927121 },
  RAY: { price: 0.01 }
}