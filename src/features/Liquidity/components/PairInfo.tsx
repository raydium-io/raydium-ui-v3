import { SDKParsedLiquidityInfo, Raydium } from '@raydium-io/raydium-sdk'
import { Flex } from '@chakra-ui/react'
import { formatLocaleStr } from '@/util/number'

interface Props {
  baseMint: string
  quoteMint: string
  currentSDKPoolInfo?: SDKParsedLiquidityInfo | null
  raydium: Raydium
}

function PairInfo({ raydium, baseMint, quoteMint, currentSDKPoolInfo }: Props) {
  if (!currentSDKPoolInfo) return null

  const { baseMint: poolBaseMint, baseReserve, quoteReserve, id, lpSupply, lpDecimals } = currentSDKPoolInfo

  const [amountBase, amountQuote] = [
    baseMint === poolBaseMint.toBase58() ? baseReserve : quoteReserve,
    quoteMint === poolBaseMint.toBase58() ? baseReserve : quoteReserve
  ]

  const [tokenBase, tokenQuote] = [
    raydium.mintToTokenAmount({ mint: baseMint, amount: amountBase || 0, decimalDone: true }),
    raydium.mintToTokenAmount({ mint: quoteMint, amount: amountQuote || 0, decimalDone: true })
  ]

  const [tokenInput, tokenOutput] = [raydium.token.allTokenMap.get(baseMint), raydium.token.allTokenMap.get(quoteMint)]

  return (
    <>
      1 {tokenInput!.symbol} ≈ {tokenQuote!.div(tokenBase!).toFixed(lpDecimals)} {tokenOutput!.symbol}
      <br />1 {tokenOutput!.symbol} ≈ {tokenBase!.div(tokenQuote!).toFixed(lpDecimals)} {tokenInput!.symbol}
      <Flex justifyContent="space-between" maxW="300px">
        <div>Pool Liquidity({tokenInput?.symbol}): </div>
        <div>
          {formatLocaleStr(tokenBase?.toExact() || '', 2)} {tokenInput?.symbol}
        </div>
      </Flex>
      <Flex justifyContent="space-between" maxW="300px">
        <div>Pool Liquidity({tokenOutput?.symbol}): </div>
        <div>
          {formatLocaleStr(tokenQuote?.toExact() || '', 2)} {tokenOutput?.symbol}
        </div>
      </Flex>
      <Flex justifyContent="space-between" maxW="300px">
        <div>LP Supply: </div>
        <div>
          {formatLocaleStr(
            raydium.liquidity
              .lpMintToTokenAmount({
                poolId: id,
                amount: lpSupply,
                decimalDone: true
              })
              .toExact() || '',
            2
          )}{' '}
          LP
        </div>
      </Flex>
    </>
  )
}

export default PairInfo
