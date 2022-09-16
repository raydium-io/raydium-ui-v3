import { ReactNode } from 'react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import Link from 'next/link'
import { Text } from '@chakra-ui/react'

function Layout({ children }: { children: ReactNode }) {
  return (
    <div>
      <WalletMultiButton />
      <div>
        <Text as="span" size="md" mx="4px">
          <Link href="/swap">Swap</Link>
        </Text>
        <Text as="span" size="md" mx="4px">
          <Link href="/liquidity">Liquidity</Link>
        </Text>
        <Text as="span" size="md" mx="4px">
          <Link href="pools">Pools</Link>
        </Text>
        <Text as="span" size="md" mx="4px">
          <Link href="/farm">Farms</Link>
        </Text>
        <Text as="span" size="md" mx="4px">
          <Link href="/staking">Staking</Link>
        </Text>
      </div>
      {children}
    </div>
  )
}

export default Layout
