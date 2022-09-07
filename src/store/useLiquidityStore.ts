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
  loadPoolsAct: (forceUpdate?: boolean) => void

  currentSDKPoolInfo: SDKParsedLiquidityInfo | null
  loadSdkPoolInfo: (params: { inputMint: string; outputMint: string }) => void

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
}

const initLiquiditySate = {
  poolList: [],
  poolMap: new Map(),
  currentSDKPoolInfo: null,
  computePairAmountAct: null
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
    loadSdkPoolInfo: ({ inputMint, outputMint }) => {
      const action = { type: 'loadSdkPoolInfo' }
      const raydium = useAppStore.getState().raydium
      if (!raydium) return

      const [inputKey, outputKey] = [
        validateAndParsePublicKey({ publicKey: inputMint, transformSol: true }).toBase58(),
        validateAndParsePublicKey({ publicKey: outputMint, transformSol: true }).toBase58()
      ]

      const pool = raydium.liquidity.allPools.find(
        (pool) =>
          (pool.baseMint === inputKey && pool.quoteMint === outputKey) || (pool.quoteMint === inputKey && pool.baseMint === outputKey)
      )
      if (!pool) return

      raydium.liquidity.sdkParseJsonLiquidityInfo([pool]).then((data) => {
        set({ currentSDKPoolInfo: data[0] }, false, action)
      })
    },
    computePairAmountAct: async (params) => {
      const raydium = useAppStore.getState().raydium

      const { poolId, fixedAmount, anotherToken } = params
      const res = await raydium!.liquidity.computePairAmount({
        poolId,
        amount: fixedAmount,
        anotherToken,
        slippage: new Percent(1, 100)
      })
      return res
    },

    addLiquidityAct: async (params) => {
      const raydium = useAppStore.getState().raydium
      const { execute } = await raydium!.liquidity.addLiquidity(params)
      try {
        return await execute()
      } catch {
        return ''
      }
    }
  }),
  'useLiquidityStore'
)
