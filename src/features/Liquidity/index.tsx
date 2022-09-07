import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/router'
import { Button } from '@chakra-ui/react'
import { TokenAmount, TokenJson, Token, WSOLMint } from '@raydium-io/raydium-sdk'
import { useTokenStore, useLiquidityStore, useAppStore, useTokenAccountStore } from '@/store'
import TokenInput from '@/component/TokenInput'
import { debounce } from 'lodash'
import PairInfo from './components/PairInfo'
import shallow from 'zustand/shallow'

const SIDE = {
  BASE: 'base',
  QUOTE: 'quote'
}

function Liquidity() {
  const router = useRouter()
  const raydium = useAppStore((s) => s.raydium)
  const tokenMap = useTokenStore((s) => s.tokenMap)
  const [getTokenBalanceUiAmount] = useTokenAccountStore((s) => [s.getTokenBalanceUiAmount, s.tokenAccounts], shallow)
  const { loadSdkPoolInfo, currentSDKPoolInfo, computePairAmountAct, poolList, addLiquidityAct } = useLiquidityStore()

  const inputBaseSideRef = useRef<boolean>(true)
  const [baseMint, setBaseMint] = useState<string>('')
  const [quoteMint, setQuoteMint] = useState<string>('')
  const [baseAmount, setBaseAmount] = useState<string>('')
  const [quoteAmount, setQuoteAmount] = useState<string>('')
  const [maxAnother, setMaxAnother] = useState<TokenAmount>()

  const [tokenBase, tokenQuote] = [tokenMap.get(baseMint), tokenMap.get(quoteMint)]

  useEffect(() => {
    const { baseMint, quoteMint } = router.query as { baseMint: string; quoteMint: string }
    if (baseMint && tokenMap.get(baseMint)) setBaseMint(baseMint)
    if (quoteMint && tokenMap.get(quoteMint)) setQuoteMint(quoteMint)
  }, [router.query, tokenMap])

  const handleCompute = useCallback(
    debounce((params: { fixedAmount: TokenAmount; anotherToken: Token }) => {
      computePairAmountAct({
        poolId: currentSDKPoolInfo!.id,
        ...params
      }).then(({ anotherAmount, maxAnotherAmount }) => {
        const setFn = inputBaseSideRef.current ? setQuoteAmount : setBaseAmount
        setFn(anotherAmount.toExact())
        setMaxAnother(maxAnotherAmount)
      })
    }, 100),
    [currentSDKPoolInfo]
  )

  const handleInputChange = useCallback(
    (val: string, _: number, side?: string) => {
      if (!baseMint || !quoteMint) return
      inputBaseSideRef.current = side === SIDE.BASE
      const setFn = inputBaseSideRef.current ? setBaseAmount : setQuoteAmount
      setFn(val)
      const [fixedAmount, anotherToken] = inputBaseSideRef.current
        ? [raydium!.mintToTokenAmount({ mint: baseMint, amount: val }), raydium!.mintToToken(quoteMint)]
        : [raydium!.mintToTokenAmount({ mint: quoteMint, amount: val }), raydium!.mintToToken(baseMint)]
      if (val === '') {
        inputBaseSideRef.current ? setQuoteAmount('') : setBaseAmount('')
        setMaxAnother(undefined)
        return
      }
      handleCompute({ fixedAmount, anotherToken })
    },
    [baseMint, quoteMint, raydium, handleCompute]
  )

  const handleSelectToken = useCallback((token: TokenJson, side?: string) => {
    const setFn = side === SIDE.BASE ? setBaseMint : setQuoteMint
    setFn(token.mint)
  }, [])

  const handleAddLiquidity = () => {
    const amountArr = [
      raydium!.mintToTokenAmount({ mint: baseMint, amount: baseAmount })!,
      raydium!.mintToTokenAmount({ mint: quoteMint, amount: quoteAmount })!
    ]
    if (currentSDKPoolInfo!.baseMint.toBase58() === quoteMint) amountArr.reverse()
    addLiquidityAct({
      poolId: currentSDKPoolInfo!.id,
      amountInA: amountArr[0],
      amountInB: amountArr[1],
      fixedSide: raydium!.liquidity.getFixedSide({
        poolId: currentSDKPoolInfo!.id,
        inputMint: inputBaseSideRef.current ? baseMint : quoteMint
      })
    })
  }

  useEffect(() => {
    if (!baseMint || !quoteMint || !poolList.length) return
    loadSdkPoolInfo({
      inputMint: baseMint,
      outputMint: quoteMint
    })
  }, [baseMint, quoteMint, poolList, loadSdkPoolInfo])

  useEffect(() => () => useLiquidityStore.setState({ currentSDKPoolInfo: null }, false, { type: 'Liquidity' }), [])

  if (!raydium) return null

  return (
    <>
      Add Liquidity
      <div>
        <TokenInput side={SIDE.BASE} token={tokenBase} value={baseAmount} onChange={handleInputChange} onTokenChange={handleSelectToken} />
        <TokenInput
          side={SIDE.QUOTE}
          token={tokenQuote}
          onChange={handleInputChange}
          onTokenChange={handleSelectToken}
          value={quoteAmount}
        />
        <div>lp token balance: {getTokenBalanceUiAmount(currentSDKPoolInfo?.lpMint.toBase58() || '', currentSDKPoolInfo?.lpDecimals)}</div>
        Max another: {maxAnother?.toExact()} {maxAnother?.token.mint.equals(WSOLMint) ? 'SOL' : maxAnother?.token.symbol}
        <br />
        <PairInfo baseMint={baseMint} quoteMint={quoteMint} currentSDKPoolInfo={currentSDKPoolInfo} raydium={raydium} />
        <Button onClick={handleAddLiquidity}>Add Liquidity</Button>
      </div>
    </>
  )
}

export default Liquidity
