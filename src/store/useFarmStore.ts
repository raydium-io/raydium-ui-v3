import { FarmPoolJsonInfo, SdkParsedFarmInfo, HydratedFarmInfo } from 'test-raydium-sdk-v2'
import { PublicKey } from '@solana/web3.js'
import { toastSubject } from '@/hooks/useGlobalToast'
import { txStatusSubject } from '@/hooks/useTxStatus'
import createStore from './createStore'
import { useAppStore } from './useAppStore'

export interface FarmStore {
  farmPool: FarmPoolJsonInfo[]
  sdkParsedFarmInfo: SdkParsedFarmInfo[]
  hydratedFarms: HydratedFarmInfo[]
  hydratedFarmMap: Map<string, HydratedFarmInfo>
  loadFarmAct: () => void
  loadHydratedFarmAct: (params: { forceUpdate?: boolean; skipPrice?: boolean }) => Promise<void>
  withdrawFarmAct: (params: { farmId: PublicKey; lpMint: PublicKey; amount: string; isStaking?: boolean }) => Promise<string>
  depositFarmAct: (params: { farmId: PublicKey; lpMint: PublicKey; amount: string; isStaking?: boolean }) => Promise<string>
}

const initFarmSate = {
  farmPool: [],
  sdkParsedFarmInfo: [],
  hydratedFarms: [],
  hydratedFarmMap: new Map()
}

export const useFarmStore = createStore<FarmStore>(
  (set, get) => ({
    ...initFarmSate,
    loadFarmAct: (forceUpdate?: boolean) => {
      const raydium = useAppStore.getState().raydium
      if (!raydium) return
      raydium.farm.load({ forceUpdate: !!forceUpdate }).then(() => {
        set(
          {
            farmPool: raydium.farm.allFarms,
            sdkParsedFarmInfo: raydium.farm.allParsedFarms
          },
          false,
          'loadFarmAct'
        )
      })
    },
    loadHydratedFarmAct: async (params) => {
      const raydium = useAppStore.getState().raydium
      if (!raydium) return
      return raydium.farm.loadHydratedFarmInfo(params).then(() => {
        set(
          {
            farmPool: raydium.farm.allFarms,
            sdkParsedFarmInfo: raydium.farm.allParsedFarms,
            hydratedFarms: raydium.farm.allHydratedFarms,
            hydratedFarmMap: raydium.farm.allHydratedFarmMap
          },
          false,
          'loadFarmAct'
        )
      })
    },

    withdrawFarmAct: async ({ farmId, lpMint, amount, isStaking }) => {
      const raydium = useAppStore.getState().raydium
      if (!raydium) return ''
      const { execute } = await raydium.farm.withdraw({
        farmId: new PublicKey(farmId),
        amount: isStaking
          ? raydium.decimalAmount({ mint: lpMint, amount })
          : raydium.farm.lpDecimalAmount({
              mint: lpMint,
              amount
            })
      })

      try {
        const txId = await execute()
        txStatusSubject.next({ txId, onSuccess: () => get().loadHydratedFarmAct({ forceUpdate: true, skipPrice: true }) })
        return txId
      } catch (e: any) {
        toastSubject.next({ txError: e })
        return ''
      }
    },
    depositFarmAct: async ({ farmId, lpMint, amount, isStaking }) => {
      const raydium = useAppStore.getState().raydium
      if (!raydium) return ''
      const { execute } = await raydium.farm.deposit({
        farmId: new PublicKey(farmId),
        amount: isStaking
          ? raydium.decimalAmount({ mint: lpMint, amount })
          : raydium.farm.lpDecimalAmount({
              mint: lpMint,
              amount
            })
      })
      try {
        const txId = await execute()
        txStatusSubject.next({ txId, onSuccess: () => get().loadHydratedFarmAct({ forceUpdate: true, skipPrice: true }) })
        return txId
      } catch (e: any) {
        toastSubject.next({ txError: e })
        return ''
      }
    }
  }),
  'useFarmStore'
)
