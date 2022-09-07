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

interface LiquidityStore {
  poolList: LiquidityPoolJsonInfo[]
  poolMap: Map<string, LiquidityPoolJsonInfo>
  currentSDKPoolInfo: SDKParsedLiquidityInfo | null
  loadingPoolInfo: boolean
  poolNotFound: boolean

  loadPoolsAct: (forceUpdate?: boolean) => void
  loadSdkPoolInfoAct: (params: { inputMint: string; outputMint: string }) => void
  computePairAmountAct: (parmas: {
    poolId: PublicKeyish
    fixedAmount: TokenAmount
    anotherToken: Token
  }) => Promise<{ anotherAmount: TokenAmount; maxAnotherAmount: TokenAmount }>
  addLiquidityAct: (params: {
    poolId: PublicKeyish
    amountInA: TokenAmount
    amountInB: TokenAmount
    fixedSide: LiquiditySide
  }) => Promise<string>
  removeLiquidityAct: (params: {
    poolId: string
    amount: TokenAmount
    config?: {
      bypassAssociatedCheck?: boolean
    }
  }) => Promise<string>
  resetComputeStateAct: () => void
}

const initLiquiditySate = {
  poolList: [],
  poolMap: new Map(),
  currentSDKPoolInfo: null,
  computePairAmountAct: null,
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
    computePairAmountAct: (params) => {
      const raydium = useAppStore.getState().raydium

      const { poolId, fixedAmount, anotherToken } = params
      return raydium!.liquidity.computePairAmount({
        poolId,
        amount: fixedAmount,
        anotherToken,
        slippage: new Percent(1, 100)
      })
    },

    addLiquidityAct: async (params) => {
      const raydium = useAppStore.getState().raydium
      const { execute } = await raydium!.liquidity.addLiquidity(params)
      try {
        return await execute()
      } catch {
        return ''
      }
    },

    removeLiquidityAct: async (params) => {
      const raydium = useAppStore.getState().raydium
      const { poolId, amount, config } = params
      const { execute } = await raydium!.liquidity.removeLiquidity({
        poolId,
        amountIn: amount,
        config
      })
      try {
        return await execute()
      } catch {
        return ''
      }
    },

    resetComputeStateAct: () => {
      set({ currentSDKPoolInfo: null, loadingPoolInfo: false, poolNotFound: false }, false, { type: 'resetComputeStateAct' })
    }
  }),
  'useLiquidityStore'
)
