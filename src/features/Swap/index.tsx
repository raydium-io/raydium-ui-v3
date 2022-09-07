import { useEffect, useState, useCallback } from 'react'
import { Button } from '@chakra-ui/react'
import { PublicKey } from '@solana/web3.js'
import { TokenJson } from '@raydium-io/raydium-sdk'
import shallow from 'zustand/shallow'
import { debounce } from 'lodash'

import { useTokenStore, useTokenAccountStore } from '@/store'
import { useSwapStore, ComputeParams } from './useSwapStore'
import TokenInput from '@/component/TokenInput'
import ExchangeRate from '@/component/ExchangeRate'

function Swap() {
  const { tokenMap } = useTokenStore(
    (s) => ({
      tokenMap: s.tokenMap
    }),
    shallow
  )
  const [getTokenBalanceUiAmount, tokenAccountMap] = useTokenAccountStore((s) => [s.getTokenBalanceUiAmount, s.tokenAccountMap], shallow)
  const { computedSwapResult, computeSwapAmountAct, swapTokenAct, computing } = useSwapStore()

  const [mintInput, setMintInput] = useState<string>('4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R')
  const [mintOutput, setMintOutput] = useState<string>(PublicKey.default.toBase58())
  const [amountIn, setAmountIn] = useState<string>('')

  const [tokenInput, tokenOutput] = [tokenMap.get(mintInput), tokenMap.get(mintOutput)]

  const handleCompute = useCallback(
    debounce((params: ComputeParams) => {
      computeSwapAmountAct(params)
    }, 100),
    [computeSwapAmountAct]
  )

  const handleInputChange = useCallback((val: string) => {
    setAmountIn(val)
  }, [])

  const handleSelectToken = useCallback((token: TokenJson, side?: string) => {
    if (side === 'input') {
      setMintInput(token.mint)
      setMintOutput((mint) => (token.mint === mint ? '' : mint))
      return
    }
    setMintOutput(token.mint)
    setMintInput((mint) => (token.mint === mint ? '' : mint))
  }, [])

  const handleSwap = useCallback(() => {
    swapTokenAct({ inputMint: mintInput, amount: amountIn })
  }, [swapTokenAct, mintInput, amountIn])

  const handleChangeSide = useCallback(() => {
    setMintInput(mintOutput)
    setAmountIn(computedSwapResult?.amountOut.toExact() || '')
    setMintOutput(mintInput)
  }, [mintInput, mintOutput, computedSwapResult])

  useEffect(() => {
    if (!mintInput || !mintOutput) return
    handleCompute({
      inputMint: mintInput,
      outputMint: mintOutput,
      amount: amountIn
    })
  }, [mintInput, mintOutput, amountIn, handleCompute])

  const [balanceInput, balanceOutput] = [
    mintInput ? getTokenBalanceUiAmount(mintInput) : '',
    mintOutput ? getTokenBalanceUiAmount(mintOutput) : ''
  ]

  const ata = tokenAccountMap.get(mintInput)?.[0]
  const isButtonDisabled = !ata || ata.amount.toNumber() < Number(amountIn)

  return (
    <>
      Swap
      <div>
        <TokenInput side="input" token={tokenInput} value={amountIn} onChange={handleInputChange} onTokenChange={handleSelectToken} />
        {balanceInput} {tokenInput?.symbol}
        <Button display="block" my="10px" onClick={handleChangeSide}>
          ^
        </Button>
        <TokenInput
          side="output"
          token={tokenOutput}
          value={computedSwapResult?.amountOut.toExact() || ''}
          onTokenChange={handleSelectToken}
          readonly={true}
        />
        <div>
          {balanceOutput} {tokenOutput?.symbol}
        </div>
        {computedSwapResult && <div>min received {computedSwapResult?.minAmountOut.toExact()}</div>}
        {computedSwapResult?.executionPrice && tokenInput && tokenOutput && (
          <ExchangeRate tokenInput={tokenInput!} tokenOutput={tokenOutput!} executionPrice={computedSwapResult?.executionPrice} />
        )}
        <Button disabled={isButtonDisabled} onClick={handleSwap} isLoading={computing} loadingText="Loading pool..">
          Swap
        </Button>
      </div>
    </>
  )
}

export default Swap
