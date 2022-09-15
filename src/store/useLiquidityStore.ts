import {
  LiquidityPoolJsonInfo,
  Percent,
  SDKParsedLiquidityInfo,
  validateAndParsePublicKey,
  Token,
  TokenAmount,
  PublicKeyish,
  LiquiditySide
} from '@raydium-io/raydium-sdk'

import createStore from './createStore'
import { useAppStore } from './useAppStore'
import { toastSubject } from '@/hooks/useGlobalToast'
import { txStatusSubject } from '@/hooks/useTxStatus'

interface LiquidityStore {
  poolList: LiquidityPoolJsonInfo[]
  poolMap: Map<string, LiquidityPoolJsonInfo>
  lpTokenMap: Map<string, Token>
  currentSDKPoolInfo: SDKParsedLiquidityInfo | null
  loadingPoolInfo: boolean
  poolNotFound: boolean

  loadPoolsAct: (forceUpdate?: boolean) => void
  loadSdkPoolInfoAct: (params: { inputMint: string; outputMint: string }) => void
  computePairAmountAct: (parmas: {
    poolId: PublicKeyish
    fixedAmount: TokenAmount
    anotherToken: Token
  }) => Promise<{ anotherAmount: TokenAmount; maxAnotherAmount: TokenAmount } | undefined>
  addLiquidityAct: (params: {
    poolId: PublicKeyish
    amountInA: TokenAmount
    amountInB: TokenAmount
    fixedSide: LiquiditySide
  }) => Promise<string>
  removeLiquidityAct: (params: {
    poolId: string
    amount: string
    config?: {
      bypassAssociatedCheck?: boolean
    }
  }) => Promise<string>
  resetComputeStateAct: () => void
}

const initLiquiditySate = {
  poolList: [],
  poolMap: new Map(),
  lpTokenMap: new Map(),
  currentSDKPoolInfo: null,
  loadingPoolInfo: false,
  poolNotFound: false
}

export const useLiquidityStore = createStore<LiquidityStore>(
  (set, get) => ({
    ...initLiquiditySate,
    loadPoolsAct: (forceUpdate?: boolean) => {
      const raydium = useAppStore.getState().raydium
      if (!raydium) return
      raydium.liquidity.load({ forceUpdate: !!forceUpdate }).then(() => {
        set({
          lpTokenMap: raydium.liquidity.lpTokenMap,
          poolList: raydium.liquidity.allPools,
          poolMap: raydium.liquidity.allPoolMap
        })
      })
    },
    loadSdkPoolInfoAct: ({ inputMint, outputMint }) => {
      const action = { type: 'loadSdkPoolInfoAct' }
      const raydium = useAppStore.getState().raydium
      if (!raydium) return
      if (!inputMint || !outputMint) {
        set({ currentSDKPoolInfo: null, loadingPoolInfo: false, poolNotFound: false }, false, action)
        return
      }

      set({ loadingPoolInfo: true, poolNotFound: false }, false, action)
      const [inputKey, outputKey] = [
        validateAndParsePublicKey({ publicKey: inputMint, transformSol: true }).toBase58(),
        validateAndParsePublicKey({ publicKey: outputMint, transformSol: true }).toBase58()
      ]

      const pool = raydium.liquidity.allPools.find(
        (pool) =>
          (pool.baseMint === inputKey && pool.quoteMint === outputKey) || (pool.quoteMint === inputKey && pool.baseMint === outputKey)
      )
      if (!pool) {
        set({ loadingPoolInfo: false, poolNotFound: true }, false, action)
        return
      }

      raydium.liquidity.sdkParseJsonLiquidityInfo([pool]).then((data) => {
        set({ currentSDKPoolInfo: data[0], loadingPoolInfo: false, poolNotFound: false }, false, action)
      })
    },
    computePairAmountAct: async (params) => {
      const raydium = useAppStore.getState().raydium
      if (!raydium) return
      const { poolId, fixedAmount, anotherToken } = params
      return raydium.liquidity.computePairAmount({
        poolId,
        amount: fixedAmount,
        anotherToken,
        slippage: new Percent(1, 100)
      })
    },

    addLiquidityAct: async (params) => {
      const raydium = useAppStore.getState().raydium
      if (!raydium) return ''
      const { execute } = await raydium.liquidity.addLiquidity(params)
      try {
        const txId = await execute()
        txStatusSubject.next({ txId })
        return txId
      } catch (e: any) {
        toastSubject.next({ txError: e })
        return ''
      }
    },

    removeLiquidityAct: async (params) => {
      const raydium = useAppStore.getState().raydium
      if (!raydium) return ''
      const { poolId, amount, config } = params
      const { execute } = await raydium.liquidity.removeLiquidity({
        poolId,
        amountIn: raydium.liquidity.lpMintToTokenAmount({ poolId, amount }),
        config
      })
      try {
        const txId = await execute()
        txStatusSubject.next({ txId })
        return txId
      } catch (e: any) {
        toastSubject.next({ txError: e })
        return ''
      }
    },

    resetComputeStateAct: () => {
      set({ currentSDKPoolInfo: null, loadingPoolInfo: false, poolNotFound: false }, false, { type: 'resetComputeStateAct' })
    }
  }),
  'useLiquidityStore'
)
