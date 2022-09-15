import { Percent, GetAmountOutReturn, WSOLMint, SOLMint } from '@raydium-io/raydium-sdk'
import { createStore, useAppStore } from '@/store'
import { isSolWSol, isSol, isWSol } from './util'
import { toastSubject } from '@/hooks/useGlobalToast'
import { txStatusSubject } from '@/hooks/useTxStatus'

interface SwapStore {
  slippage: number
  computing: boolean
  computedSwapResult: GetAmountOutReturn | null
  computeSwapAmountAct: (params: ComputeParams) => Promise<void>
  swapTokenAct: (params: { inputMint: string; amount: string }) => Promise<string | string[] | undefined>
  unWrapSolAct: (amount: string) => Promise<string | undefined>
  wrapSolAct: (amount: string) => Promise<string | undefined>
}

export interface ComputeParams {
  inputMint: string
  outputMint: string
  amount: string
}

const initSwapState = {
  computing: false,
  computedSwapResult: null,
  slippage: 1
}

export const useSwapStore = createStore<SwapStore>(
  (set, get) => ({
    ...initSwapState,

    computeSwapAmountAct: async (params: ComputeParams) => {
      const raydium = useAppStore.getState().raydium
      if (!raydium) return
      const action = { type: 'computeSwapAmountAct' }
      const { inputMint, outputMint, amount } = params
      if (isSolWSol(inputMint, outputMint)) {
        set(
          {
            computedSwapResult: {
              amountOut: raydium.mintToTokenAmount({ mint: inputMint, amount }),
              minAmountOut: raydium.mintToTokenAmount({ mint: outputMint, amount }),
              priceImpact: new Percent(1, 100),
              routes: [],
              routeType: 'amm',
              fixedSide: 'in',
              currentPrice: null,
              executionPrice: null,
              fee: []
            }
          },
          false,
          action
        )
        return
      }

      const { routedPools } = await raydium.trade.getAvailablePools(params)

      if (amount === '') {
        raydium.liquidity.sdkParseJsonLiquidityInfo(routedPools)
        set(() => ({ computing: false, computedSwapResult: null }), false, action)
        return
      }

      set({ computing: true }, false, action)
      const slippage = get().slippage
      const computedSwapResult = await raydium.trade.getBestAmountOut({
        pools: routedPools, // optional, pass only if called getAvailablePools
        amountIn: raydium.decimalAmount({ mint: inputMint, amount })!,
        inputToken: raydium.mintToToken(inputMint),
        outputToken: raydium.mintToToken(outputMint),
        slippage: new Percent(slippage, 100) // means 1 percent
      })

      set({ computedSwapResult, computing: false }, false, action)
    },

    swapTokenAct: async (params) => {
      const raydium = useAppStore.getState().raydium
      const computedSwapResult = get().computedSwapResult
      if (!raydium || !computedSwapResult) return

      const { inputMint, amount } = params
      if (isSolWSol(inputMint, computedSwapResult.amountOut.token.mint.toBase58())) {
        if (isSol(inputMint)) return await get().wrapSolAct(amount)
        if (isWSol(inputMint)) return await get().unWrapSolAct(amount)
      }

      const { execute } = await raydium.trade.swap({
        routes: computedSwapResult.routes,
        routeType: computedSwapResult.routeType,
        amountIn: raydium.mintToTokenAmount({ mint: inputMint, amount })!,
        amountOut: computedSwapResult.minAmountOut,
        fixedSide: 'in'
      })

      try {
        const txIds = await execute()
        txStatusSubject.next({ txId: txIds.pop()! })
        return txIds
      } catch (e: any) {
        toastSubject.next({ txError: e })
        return
      }
    },

    unWrapSolAct: async (amount: string): Promise<string | undefined> => {
      const raydium = useAppStore.getState().raydium
      if (!raydium) return
      const { execute } = await raydium.trade.unWrapWSol(raydium.decimalAmount({ mint: WSOLMint, amount })!)
      try {
        const txId = await execute()
        txStatusSubject.next({ txId })
        return txId
      } catch (e: any) {
        toastSubject.next({ txError: e })
        return
      }
    },

    wrapSolAct: async (amount: string): Promise<string | undefined> => {
      const raydium = useAppStore.getState().raydium
      if (!raydium) return
      const { execute } = await raydium.trade.wrapWSol(raydium.decimalAmount({ mint: SOLMint, amount })!)
      try {
        return await execute()
      } catch {
        return
      }
    }
  }),
  'useSwapStore'
)
