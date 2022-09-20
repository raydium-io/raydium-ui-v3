import { PropsWithChildren, useCallback } from 'react'
import { Button, ButtonProps } from '@chakra-ui/react'
import { useAppStore } from '@/store'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'

type Props = PropsWithChildren<ButtonProps>

export default function ConnectedButton({ children, onClick, disabled, ...props }: Props) {
  const connected = useAppStore((s) => s.connected)
  const { setVisible } = useWalletModal()
  const handleClick = useCallback(() => setVisible(true), [setVisible])

  return (
    <Button {...props} disabled={connected ? disabled : false} onClick={connected ? onClick : handleClick}>
      {connected ? children : 'Connect Wallet'}
    </Button>
  )
}
