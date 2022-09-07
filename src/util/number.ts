import { Numberish, toFraction } from '@raydium-io/raydium-sdk'

export function formatLocaleStr(num: Numberish, decimalPlace?: number) {
  const fractionNum = toFraction(num)
  const intNum = fractionNum.toFixed(decimalPlace || 0)
  return intNum.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}
