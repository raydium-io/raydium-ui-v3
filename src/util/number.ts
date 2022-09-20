import { Numberish, toFraction } from 'test-raydium-sdk-v2'
import Big from 'big.js'

export function formatLocaleStr(num: Numberish, decimalPlace?: number) {
  const fractionNum = toFraction(num)
  const intNum = fractionNum.toFixed(decimalPlace || 0)
  return intNum.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export const toBig = (params: { amount: string; decimals: number; decimalDone?: boolean }) => {
  Big.DP = params.decimals || Big.DP
  let big = new Big(params.amount)
  if (!params.decimalDone) big = big.div(10 ** params.decimals)
  return big
}
