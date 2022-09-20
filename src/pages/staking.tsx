import { ApiFarmPools } from 'test-raydium-sdk-v2'
import Staking from '@/features/Staking'
import useInitFarmData, { fetchFarmInitialProps } from '@/features/Farm/useInitFarmData'

function StakingPage(props: { defaultApiFarms: ApiFarmPools }) {
  useInitFarmData(props)
  return <Staking />
}

StakingPage.getInitialProps = fetchFarmInitialProps

export default StakingPage
