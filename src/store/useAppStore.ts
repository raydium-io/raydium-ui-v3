import { Connection, PublicKey } from '@solana/web3.js'
import { Raydium, RaydiumLoadParams } from '@raydium-io/raydium-sdk'
import createStore from './createStore'
import { useTokenStore } from './useTokenStore'
import { useLiquidityStore } from './useLiquidityStore'

interface AppState {
  raydium?: Raydium
  connection?: Connection
  publicKey?: PublicKey
  initialing: boolean
  connected: boolean
  initRaydiumAct: (payload: RaydiumLoadParams & { defaultRaydiumTokenPrice?: Record<string, number> }) => Promise<void>
}

const appInitState = {
  raydium: undefined,
  initialing: false,
  connected: false
}

export const useAppStore = createStore<AppState>(
  (set, get) => ({
    ...appInitState,
    initRaydiumAct: async (payload) => {
      const actionLog = { type: 'initRaydiumAct' }
      if (get().initialing) return

      set({ initialing: true }, false, actionLog)
      const raydium = await Raydium.load(payload)
      ;(window as any).raydium = raydium
      set({ raydium, initialing: false, connected: !!payload.owner }, false, actionLog)
      raydium.token.fetchTokenPrices(payload.defaultRaydiumTokenPrice)

      useTokenStore.setState(
        {
          tokenList: raydium.token.allTokens,
          tokenMap: raydium.token.allTokenMap
        },
        false,
        actionLog
      )

      useLiquidityStore.setState(
        {
          poolList: raydium.liquidity.allPools,
          poolMap: raydium.liquidity.allPoolMap
        },
        false,
        actionLog
      )
    },
    reset: () => set(appInitState)
  }),
  'useAppStore'
)
