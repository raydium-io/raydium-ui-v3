import { useEffect } from 'react'
import { Api, ApiFarmPools } from '@raydium-io/raydium-sdk'
import Farm from '@/features/Farm'
import shallow from 'zustand/shallow'
import { useAppStore, useFarmStore, useLiquidityStore } from '../store'
import { debounceTime, Subject, switchMap } from 'rxjs'

const loadFarmSubject = new Subject<{ forceUpdate?: boolean; skipPrice?: boolean }>()
function FarmPage({ defaultApiFarms }: { defaultApiFarms: ApiFarmPools }) {
  const loadPoolsAct = useLiquidityStore((s) => s.loadPoolsAct)
  const loadHydratedFarmAct = useFarmStore((s) => s.loadHydratedFarmAct)
  const [raydium, connected, connection, publicKey] = useAppStore((s) => [s.raydium, s.connected, s.connection, s.publicKey], shallow)

  useEffect(() => {
    const sub = loadFarmSubject
      .asObservable()
      .pipe(
        debounceTime(200),
        switchMap((params) => loadHydratedFarmAct(params))
      )
      .subscribe()
    return () => sub.unsubscribe()
  }, [loadHydratedFarmAct])

  useEffect(() => {
    if (!raydium) return
    loadPoolsAct()
    raydium.apiData.farmPools = { fetched: Date.now(), data: defaultApiFarms }
    loadFarmSubject.next({})
  }, [raydium, defaultApiFarms, loadPoolsAct])

  useEffect(() => () => loadFarmSubject.next({ forceUpdate: true, skipPrice: true }), [connected])
  useEffect(() => {
    let listenerId: number | undefined
    if (connection && publicKey) {
      listenerId = connection.onAccountChange(publicKey, () => {
        loadFarmSubject.next({ forceUpdate: true, skipPrice: true })
      })
    }

    return () => {
      listenerId && connection && connection!.removeAccountChangeListener(listenerId)
    }
  }, [connection, publicKey])

  return <Farm />
}

FarmPage.getInitialProps = async function () {
  const api = new Api({ cluster: 'mainnet', timeout: 10 * 1000 })
  const defaultApiFarms = await api.getFarmPools()
  return { defaultApiFarms }
}

export default FarmPage
