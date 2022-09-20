import { ApiFarmPools } from 'test-raydium-sdk-v2'
import Farm from '@/features/Farm'
import useInitFarmData, { fetchFarmInitialProps } from '@/features/Farm/useInitFarmData'

function FarmPage(props: { defaultApiFarms: ApiFarmPools }) {
  useInitFarmData(props)
  return <Farm />
}

FarmPage.getInitialProps = fetchFarmInitialProps

export default FarmPage
