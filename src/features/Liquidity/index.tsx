import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/router'
import { Button } from '@chakra-ui/react'
import { TokenAmount, TokenJson, Token, WSOLMint } from '@raydium-io/raydium-sdk'
import { useTokenStore, useLiquidityStore, useAppStore, useTokenAccountStore } from '@/store'
import TokenInput from '@/component/TokenInput'
import PairInfo from './components/PairInfo'
import shallow from 'zustand/shallow'
import { SIDE, getPairCache, setPairCache } from './util'
import { Subject, debounceTime, switchMap, filter, tap } from 'rxjs'
import Big from 'big.js'

interface ComputeParam {
  fixedAmount: TokenAmount
  anotherToken: Token
}
const computeSubject = new Subject<ComputeParam>()

function Liquidity() {
  const router = useRouter()
  const raydium = useAppStore((s) => s.raydium)
  const tokenMap = useTokenStore((s) => s.tokenMap)
  const [getTokenBalanceUiAmount] = useTokenAccountStore((s) => [s.getTokenBalanceUiAmount, s.tokenAccounts], shallow)
  const {
    loadSdkPoolInfoAct,
    currentSDKPoolInfo,
    loadingPoolInfo,
    poolNotFound,
    computePairAmountAct,
    poolMap,
    addLiquidityAct,
    resetComputeStateAct
  } = useLiquidityStore()

  const inputBaseSideRef = useRef<boolean>(true)
  const baseDataRef = useRef<{ baseMint: string; baseVal: string; anotherMint: string }>({ baseMint: '', anotherMint: '', baseVal: '' })
  const computeRef = useRef<ComputeParam | undefined>(undefined)
  const [baseMint, setBaseMint] = useState<string>('')
  const [quoteMint, setQuoteMint] = useState<string>('')
  const [baseAmount, setBaseAmount] = useState<string>('')
  const [quoteAmount, setQuoteAmount] = useState<string>('')
  const [maxAnother, setMaxAnother] = useState<TokenAmount>()

  const [tokenBase, tokenQuote] = [tokenMap.get(baseMint), tokenMap.get(quoteMint)]
  const [baseBalance, quoteBalance] = [getTokenBalanceUiAmount({ mint: baseMint }), getTokenBalanceUiAmount({ mint: quoteMint })]
  const btnDisabled =
    poolNotFound || !currentSDKPoolInfo || !baseMint || !baseAmount || !baseBalance.gt(baseAmount) || !quoteBalance.gt(quoteAmount)

  useEffect(() => {
    const { baseMint, quoteMint } = router.query as { baseMint: string; quoteMint: string }
    const cache = getPairCache()
    const [defaultBase, defaultQuote] = [baseMint || cache.baseMint, quoteMint || cache.quoteMint]

    if (tokenMap.get(defaultBase)) setBaseMint(defaultBase)
    if (tokenMap.get(defaultQuote)) setQuoteMint(defaultQuote)
  }, [router.query, tokenMap])

  useEffect(() => {
    const sub = computeSubject
      .asObservable()
      .pipe(
        debounceTime(150),
        tap((params) => (computeRef.current = loadingPoolInfo ? params : undefined)),
        filter(({ fixedAmount }) => !!currentSDKPoolInfo && !fixedAmount.isZero()),
        switchMap((params) =>
          computePairAmountAct({
            poolId: currentSDKPoolInfo!.id,
            ...params
          })
        )
      )
      .subscribe((res) => {
        if (!res) return
        const { anotherAmount, maxAnotherAmount } = res
        const setFn = inputBaseSideRef.current ? setQuoteAmount : setBaseAmount
        setFn(anotherAmount.toExact())
        setMaxAnother(maxAnotherAmount)
      })

    return () => sub?.unsubscribe()
  }, [loadingPoolInfo, currentSDKPoolInfo, computePairAmountAct])

  useEffect(() => {
    if (!poolMap.size) return
    loadSdkPoolInfoAct({
      inputMint: baseMint,
      outputMint: quoteMint
    })
    setPairCache({ baseMint, quoteMint })

    return () => resetComputeStateAct()
  }, [baseMint, quoteMint, poolMap, loadSdkPoolInfoAct, resetComputeStateAct])

  useEffect(() => {
    /** compute after change pairs */
    currentSDKPoolInfo &&
      raydium &&
      computeSubject.next({
        fixedAmount: raydium.mintToTokenAmount({ mint: baseDataRef.current.baseMint, amount: baseDataRef.current.baseVal }),
        anotherToken: raydium.mintToToken(baseDataRef.current.anotherMint)
      })
  }, [currentSDKPoolInfo, raydium])

  useEffect(() => {
    if (poolNotFound) setQuoteAmount('')
  }, [poolNotFound])

  const handleInputChange = useCallback(
    (val: string, _: number, side?: string) => {
      if (!baseMint || !quoteMint) return
      if (inputBaseSideRef.current !== (side === SIDE.BASE)) return
      const setFn = inputBaseSideRef.current ? setBaseAmount : setQuoteAmount
      baseDataRef.current = {
        baseMint: inputBaseSideRef.current ? baseMint : quoteMint,
        baseVal: val,
        anotherMint: inputBaseSideRef.current ? quoteMint : baseMint
      }
      setFn(val)

      if (raydium) {
        const [fixedAmount, anotherToken] = inputBaseSideRef.current
          ? [raydium.mintToTokenAmount({ mint: baseMint, amount: val }), raydium.mintToToken(quoteMint)]
          : [raydium.mintToTokenAmount({ mint: quoteMint, amount: val }), raydium.mintToToken(baseMint)]
        computeSubject.next({ fixedAmount, anotherToken })
      }

      if (val === '') {
        inputBaseSideRef.current ? setQuoteAmount('') : setBaseAmount('')
        setMaxAnother(undefined)
        return
      }
    },
    [baseMint, quoteMint, raydium]
  )

  const handleSelectToken = useCallback((token: TokenJson, side?: string) => {
    const isBase = side === SIDE.BASE
    if (inputBaseSideRef.current && isBase) baseDataRef.current.baseMint = token.mint
    const [setFn, setPairFn] = isBase ? [setBaseMint, setQuoteMint] : [setQuoteMint, setBaseMint]
    setFn(token.mint)
    setPairFn((mint) => {
      if (mint === token.mint) return ''
      return mint
    })
  }, [])

  const handleFocus = useCallback((side?: string) => {
    inputBaseSideRef.current = side === SIDE.BASE
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

  if (!raydium) return null
  return (
    <>
      Add Liquidity
      <div>
        <TokenInput
          side={SIDE.BASE}
          token={tokenBase}
          balance={baseBalance.text}
          value={baseAmount}
          onChange={handleInputChange}
          onTokenChange={handleSelectToken}
          onFocus={handleFocus}
        />
        <TokenInput
          side={SIDE.QUOTE}
          token={tokenQuote}
          balance={quoteBalance.text}
          onChange={handleInputChange}
          onTokenChange={handleSelectToken}
          value={quoteAmount}
          onFocus={handleFocus}
        />
        <div>
          lp token balance:{' '}
          {getTokenBalanceUiAmount({ mint: currentSDKPoolInfo?.lpMint.toBase58() || '', decimals: currentSDKPoolInfo?.lpDecimals }).text}
        </div>
        Max another: {maxAnother?.toExact()} {maxAnother?.token.mint.equals(WSOLMint) ? 'SOL' : maxAnother?.token.symbol}
        <br />
        <PairInfo baseMint={baseMint} quoteMint={quoteMint} currentSDKPoolInfo={currentSDKPoolInfo} raydium={raydium} />
        <Button disabled={btnDisabled} isLoading={loadingPoolInfo} loadingText="Loading pool.." onClick={handleAddLiquidity}>
          {poolNotFound ? 'Pool Not Found' : 'Add Liquidity'}
        </Button>
      </div>
    </>
  )
}

export default Liquidity
