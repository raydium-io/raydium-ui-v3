import { useEffect, useState, useCallback, useRef } from 'react'
import { Button, Flex } from '@chakra-ui/react'
import { useRouter } from 'next/router'
import { TokenJson } from 'test-raydium-sdk-v2'
import shallow from 'zustand/shallow'

import { useTokenStore, useTokenAccountStore } from '@/store'
import { useSwapStore, ComputeParams } from './useSwapStore'
import TokenInput from '@/component/TokenInput'
import ExchangeRate from '@/component/ExchangeRate'
import ContentCard from '@/component/ContentCard'
import { debounceTime, Subject, switchMap, fromEvent, exhaustMap } from 'rxjs'
import { getSwapPairCache, setSwapPairCache } from './util'
import { toBig } from '@/util/number'

const computeSubject = new Subject<ComputeParams>()

function Swap() {
  const router = useRouter()
  const tokenMap = useTokenStore((s) => s.tokenMap)
  const [getTokenBalanceUiAmount, tokenAccountMap] = useTokenAccountStore((s) => [s.getTokenBalanceUiAmount, s.tokenAccountMap], shallow)
  const { computedSwapResult, computeSwapAmountAct, swapTokenAct, computing } = useSwapStore()

  const [inputMint, setInputMint] = useState<string>('')
  const [outputMint, setOutputMint] = useState<string>('')
  const [amountIn, setAmountIn] = useState<string>('')
  const submitBtnRef = useRef<HTMLButtonElement>(null)

  const [tokenInput, tokenOutput] = [tokenMap.get(inputMint), tokenMap.get(outputMint)]

  useEffect(() => {
    const { inputMint, outputMint } = router.query as { inputMint: string; outputMint: string }
    const cache = getSwapPairCache()
    const [defaultInput, defaultOutput] = [inputMint || cache.inputMint, outputMint || cache.outputMint]
    if (tokenMap.get(defaultInput)) setInputMint(defaultInput)
    if (tokenMap.get(defaultOutput)) setOutputMint(defaultOutput)
  }, [router.query, tokenMap])

  useEffect(() => {
    const sub = computeSubject
      .asObservable()
      .pipe(
        debounceTime(200),
        switchMap((params) => computeSwapAmountAct(params))
      )
      .subscribe()
    return () => sub.unsubscribe()
  }, [computeSwapAmountAct])

  const handleInputChange = useCallback((val: string) => {
    setAmountIn(val)
  }, [])

  const handleSelectToken = useCallback((token: TokenJson, side?: string) => {
    if (side === 'input') {
      setInputMint(token.mint)
      setOutputMint((mint) => (token.mint === mint ? '' : mint))
      return
    }
    setOutputMint(token.mint)
    setInputMint((mint) => (token.mint === mint ? '' : mint))
  }, [])

  useEffect(() => {
    const sub = fromEvent(submitBtnRef.current!, 'click')
      .pipe(exhaustMap(() => swapTokenAct({ inputMint, amount: amountIn })))
      .subscribe()
    return () => sub.unsubscribe()
  }, [swapTokenAct, inputMint, amountIn])

  const handleChangeSide = useCallback(() => {
    setInputMint(outputMint)
    setAmountIn(computedSwapResult?.amountOut.toExact() || '')
    setOutputMint(inputMint)
  }, [inputMint, outputMint, computedSwapResult])

  useEffect(() => {
    if (!inputMint || !outputMint) return
    setSwapPairCache({ inputMint, outputMint })
    computeSubject.next({
      inputMint,
      outputMint,
      amount: amountIn
    })
  }, [inputMint, outputMint, amountIn])

  const [balanceInput, balanceOutput] = [
    inputMint ? getTokenBalanceUiAmount({ mint: inputMint }).text : '',
    outputMint ? getTokenBalanceUiAmount({ mint: outputMint }).text : ''
  ]

  const ata = tokenAccountMap.get(inputMint)?.[0]

  const isButtonDisabled =
    !ata ||
    !amountIn ||
    ata.amount.isZero() ||
    toBig({ amount: amountIn, decimals: tokenInput?.decimals || 4, decimalDone: true }).lte(0) ||
    toBig({ amount: ata.amount.toString(), decimals: tokenInput?.decimals || 4 }).lt(amountIn) ||
    computing

  return (
    <ContentCard>
      Swap
      <div>
        <TokenInput
          side="input"
          token={tokenInput}
          balance={balanceInput}
          value={amountIn}
          onChange={handleInputChange}
          onTokenChange={handleSelectToken}
        />
        <Flex justifyContent="center">
          <Button display="block" my="10px" onClick={handleChangeSide}>
            ↕
          </Button>
        </Flex>
        <TokenInput
          side="output"
          token={tokenOutput}
          balance={balanceOutput}
          disableClickBalance={true}
          value={computedSwapResult?.amountOut.toExact() || ''}
          onTokenChange={handleSelectToken}
          readonly={true}
        />
        {computedSwapResult && <div>min received {computedSwapResult?.minAmountOut.toExact()}</div>}
        {computedSwapResult?.executionPrice && tokenInput && tokenOutput && (
          <ExchangeRate tokenInput={tokenInput!} tokenOutput={tokenOutput!} executionPrice={computedSwapResult?.executionPrice} />
        )}
        <Button disabled={isButtonDisabled} ref={submitBtnRef} isLoading={computing} loadingText="Loading pool..">
          Swap
        </Button>
      </div>
    </ContentCard>
  )
}

export default Swap
