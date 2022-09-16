import { PropsWithChildren, useCallback } from 'react'
import { Button, ButtonProps } from '@chakra-ui/react'
import { useAppStore } from '@/store'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'

type Props = PropsWithChildren<ButtonProps>

export default function ConnectedButton({ children, onClick, ...props }: Props) {
  const connected = useAppStore((s) => s.connected)
  const { setVisible } = useWalletModal()
  const handleClick = useCallback(() => setVisible(true), [setVisible])

  return (
    <Button {...props} onClick={connected ? onClick : handleClick}>
      {connected ? children : 'Connect Wallet'}
    </Button>
  )
}
