import { useEffect } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { useAppStore, useTokenAccountStore } from '@/store'

function useTokenAccountInfo() {
  const { connection } = useConnection()
  const { publicKey } = useWallet()
  const raydium = useAppStore((s) => s.raydium)

  const { fetchTokenAccountAct, tokenAccounts, tokenAccountRawInfos } = useTokenAccountStore()

  useEffect(() => {
    if (!connection || !publicKey) return
    fetchTokenAccountAct({ connection, owner: publicKey })

    const listenerId = connection.onAccountChange(publicKey, () => fetchTokenAccountAct({ connection, owner: publicKey }), 'confirmed')
    return () => {
      connection.removeAccountChangeListener(listenerId)
    }
  }, [connection?.rpcEndpoint, publicKey, fetchTokenAccountAct])

  useEffect(() => {
    if (raydium && tokenAccounts.length) {
      raydium.account.updateTokenAccount({
        tokenAccounts,
        tokenAccountRawInfos
      })
    }
  }, [raydium, tokenAccounts, tokenAccountRawInfos])
}

export default useTokenAccountInfo
