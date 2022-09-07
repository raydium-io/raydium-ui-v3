import { useEffect, useRef } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { useAppStore } from '@/store/useAppStore'
import shallow from 'zustand/shallow'
import { RaydiumApiBatchRequestParams } from '@raydium-io/raydium-sdk'
import { useToast, ToastPosition, Box } from '@chakra-ui/react'

const toastConfig = {
  duration: 50000,
  isClosable: true,
  position: 'bottom-right' as ToastPosition,
  containerStyle: {
    maxWidth: '300px',
    '& .chakra-alert__desc': {
      wordBreak: 'break-word'
    }
  }
}

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
  const toast = useToast()
  const walletRef = useRef(wallet)

  useEffect(() => {
    if (wallet && publicKey) {
      toast({
        title: `${wallet.adapter.name} wallet connected`,
        description: `Wallet ${publicKey}`,
        status: 'success',
        ...toastConfig
      })
      walletRef.current = wallet
      return
    }
    if (walletRef.current) {
      toast({
        title: `${walletRef.current.adapter.name} wallet disconnected`,
        status: 'warning',
        ...toastConfig
      })
      walletRef.current = wallet
    }
  }, [wallet, toast, publicKey])

  useEffect(() => {
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
      useAppStore.setState({ connected: !!publicKey }, false, 'useInitConnection')
    }
  }, [raydium, publicKey, signAllTransactions])
}

export default useInitConnection
