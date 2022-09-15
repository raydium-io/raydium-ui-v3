import { useEffect, useRef } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { useAppStore } from '@/store/useAppStore'
import shallow from 'zustand/shallow'
import { RaydiumApiBatchRequestParams } from '@raydium-io/raydium-sdk'
import { toastSubject } from './useGlobalToast'

function useInitConnection(props: Omit<RaydiumApiBatchRequestParams, 'api'>) {
  const { connection } = useConnection()
  const { publicKey, signAllTransactions, wallet } = useWallet()
  const { initRaydiumAct, raydium } = useAppStore(
    (s) => ({
      initRaydiumAct: s.initRaydiumAct,
      raydium: s.raydium
    }),
    shallow
  )
  const walletRef = useRef(wallet)

  useEffect(() => {
    if (wallet && publicKey) {
      toastSubject.next({
        title: `${wallet.adapter.name} wallet connected`,
        description: `Wallet ${publicKey}`,
        status: 'success'
      })
      walletRef.current = wallet
      return
    }
    if (walletRef.current) {
      toastSubject.next({
        title: `${walletRef.current.adapter.name} wallet disconnected`,
        status: 'warning'
      })
      walletRef.current = wallet
    }
  }, [wallet, publicKey])

  useEffect(() => {
    useAppStore.setState({ connection }, false, 'useInitConnection')
    // raydium sdk initialization can be done with connection only
    if (connection) {
      initRaydiumAct({ owner: publicKey || undefined, connection, signAllTransactions, ...props })
    }
  }, [initRaydiumAct, connection])

  useEffect(() => {
    // if user connected wallet, update pubk
    if (raydium) {
      raydium.setOwner(publicKey || undefined)
      raydium.setSignAllTransactions(signAllTransactions)
      useAppStore.setState({ connected: !!publicKey, publicKey: publicKey || undefined }, false, 'useInitConnection')
    }
  }, [raydium, publicKey, signAllTransactions])
}

export default useInitConnection
