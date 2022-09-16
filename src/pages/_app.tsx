import type { PropsWithChildren } from 'react'
import { memo } from 'react'
import type { AppProps, AppContext } from 'next/app'
import App from 'next/app'
import { Api, RaydiumApiBatchRequestParams } from '@raydium-io/raydium-sdk'
import { WalletProvider, ThemeProvider } from '../provider'
import useInitConnection from '../hooks/useInitConnection'
import useTokenAccountInfo from '../hooks/useTokenAccountInfo'
import useGlobalToast from '../hooks/useGlobalToast'
import useTxStatus from '../hooks/useTxStatus'
import Layout from '@/component/Layout'
import { apiSsrCache } from '../util/ssrCache'

// Use require instead of import since order matters
require('@solana/wallet-adapter-react-ui/styles.css')

type SSRData = Omit<RaydiumApiBatchRequestParams, 'api'>

const Content = memo(function Content({ children, ...props }: PropsWithChildren<SSRData>) {
  useGlobalToast()
  useInitConnection(props)
  useTokenAccountInfo()
  useTxStatus()
  return <>{children}</>
})

const MyApp = ({ Component, pageProps, ...props }: AppProps & SSRData) => {
  return (
    <WalletProvider>
      <ThemeProvider>
        <Layout>
          <Content {...props}>
            <Component {...pageProps} />
          </Content>
        </Layout>
      </ThemeProvider>
    </WalletProvider>
  )
}

MyApp.getInitialProps = async (appContext: AppContext) => {
  try {
    const ctx = await App.getInitialProps(appContext)
    const api = new Api({ cluster: 'mainnet', timeout: 10 * 1000 })

    const ssrRequest = [
      {
        name: 'defaultApiTokens',
        api: async () => await api.getTokens()
      },
      {
        name: 'defaultApiLiquidityPools',
        api: async () => await api.getLiquidityPools()
      },
      {
        name: 'defaultApiPairsInfo',
        api: async () => await api.getPairsInfo()
      },
      {
        name: 'defaultRaydiumTokenPrice',
        api: async () => await api.getRaydiumTokenPrice(),
        config: { ttl: 1000 * 60 }
      }
    ]
    const preloadData: Record<string, any> = {}
    for (let i = 0; i < ssrRequest.length; i++) {
      const config = ssrRequest[i]
      preloadData[config.name] = apiSsrCache.get(config.name) || (await config.api())
      apiSsrCache.set(config.name, preloadData[config.name])
    }

    return { ...ctx, ...preloadData }
  } catch (err) {
    return {}
  }
}

export default MyApp
