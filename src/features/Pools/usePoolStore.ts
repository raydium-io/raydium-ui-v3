import { PairJsonInfo } from 'test-raydium-sdk-v2'
import { createStore, useAppStore } from '@/store'

interface PoolStore {
  pairInfoList: PairJsonInfo[]
  pairInfoMap: Map<string, PairJsonInfo>
  loadPairInfoAct: (forceUpdate?: boolean) => void
}

const initPoolState = {
  pairInfoList: [],
  pairInfoMap: new Map()
}

export const usePoolStore = createStore<PoolStore>(
  (set, get) => ({
    ...initPoolState,
    loadPairInfoAct: (forceUpdate?: boolean) => {
      const raydium = useAppStore.getState().raydium
      if (!raydium) return
      raydium.liquidity.loadPairs({ forceUpdate: !!forceUpdate }).then(() => {
        set({
          pairInfoList: raydium.liquidity.allPairs.filter((pair) => pair.name.indexOf('unknown') === -1),
          pairInfoMap: raydium.liquidity.allPairsMap
        })
      })
    }
  }),
  'usePoolStore'
)
