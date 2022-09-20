import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { Tabs, TabList, TabPanels, Tab, TabPanel, Flex, Box, Hide } from '@chakra-ui/react'
import { HydratedFarmInfo, ApiFarmPools } from 'test-raydium-sdk-v2'
import { useFarmStore } from '@/store/useFarmStore'
import { useTokenStore } from '@/store/useTokenStore'
import FarmListItem from './components/FarmListItem'
import LoadingList from './components/LoadingList'
import { colStyle, col1Style } from './util'

const tabs = ['raydium', 'fusion', 'ecosystem', 'staked']

export default function Farm() {
  const route = useRouter()
  const query = route.query as { tab?: string }
  const defaultIndex = query.tab ? tabs.indexOf(query.tab) : 0
  const hydratedFarms = useFarmStore((s) => s.hydratedFarms)
  const tokenMap = useTokenStore((s) => s.tokenMap)
  const [tabIndex, setTabIndex] = useState(defaultIndex > -1 && defaultIndex < 3 ? defaultIndex : 0)
  const [loading, setLoading] = useState(true)
  const [displayList, setDisplayList] = useState<HydratedFarmInfo[]>([])

  useEffect(() => {
    setDisplayList(
      hydratedFarms.filter((pool) => {
        const tab = tabs[tabIndex]
        const filter = tab === 'staked' ? pool.userHasStaked && !pool.isStakePool : pool.category === tab
        return filter && !pool.isClosedPool
      })
    )
    setLoading(!hydratedFarms.length)
  }, [hydratedFarms, tabIndex])

  return (
    <Tabs
      index={tabIndex}
      onChange={(index) => {
        setTabIndex(index)
        route.replace(route.pathname, { query: { tab: tabs[index] } })
      }}
    >
      <TabList>
        {tabs.map((tab) => (
          <Tab key={tab} minW={['25%', '25%', '200px']} maxW="25%" textTransform="capitalize">
            {tab}
          </Tab>
        ))}
      </TabList>

      <Flex mt="20px" p="1rem">
        <Box sx={col1Style}>Farm</Box>
        <Hide below="md">
          <Box sx={colStyle} cursor="pointer" data-sort="Pending Reward">
            Pending Reward
          </Box>
        </Hide>
        <Box sx={colStyle} cursor="pointer" data-sort="Total APR 30D">
          Total APR 30D
        </Box>
        <Box sx={colStyle} cursor="pointer" data-sort="TVL">
          TVL
        </Box>
        <Hide below="md">
          <Box sx={colStyle} />
        </Hide>
      </Flex>
      <TabPanels>
        {tabs.map((tab, idx) => (
          <TabPanel key={`panel-${tab}`}>
            {loading && <LoadingList defaultTab={tabs[tabIndex] as keyof Omit<ApiFarmPools, 'stake'>} />}
            {idx === tabIndex
              ? displayList.map((pool) => <FarmListItem key={pool.id.toBase58()} farmPool={pool} tokenMap={tokenMap} />)
              : null}
          </TabPanel>
        ))}
      </TabPanels>
    </Tabs>
  )
}
