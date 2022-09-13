import { useEffect, useState } from 'react'
import { Tabs, TabList, TabPanels, Tab, TabPanel, Flex, Box } from '@chakra-ui/react'
import { HydratedFarmInfo } from '@raydium-io/raydium-sdk'
import { useFarmStore } from '@/store/useFarmStore'
import { useTokenStore } from '@/store/useTokenStore'
import FarmListItem from './components/FarmListItem'
import LoadingList from './components/LoadingList'
import { colStyle, col1Style } from './util'

const tabs = ['raydium', 'fusion', 'ecosystem', 'staked']

export default function Farm() {
  const hydratedFarms = useFarmStore((s) => s.hydratedFarms)
  const tokenMap = useTokenStore((s) => s.tokenMap)
  const [tabIndex, setTabIndex] = useState(0)
  const [displayList, setDisplayList] = useState<HydratedFarmInfo[]>([])

  useEffect(() => {
    setDisplayList(
      hydratedFarms.filter((pool) => {
        const tab = tabs[tabIndex]
        const filter = tab === 'staked' ? pool.userHasStaked : pool.category === tab
        return filter && !pool.isClosedPool
      })
    )
  }, [hydratedFarms, tabIndex])

  return (
    <Tabs onChange={(index) => setTabIndex(index)}>
      <TabList>
        {tabs.map((tab) => (
          <Tab key={tab} minW="200px" maxW="20%" textTransform="capitalize">
            {tab}
          </Tab>
        ))}
      </TabList>

      <Flex mt="20px" p="1rem">
        <Box sx={col1Style}>Farm</Box>
        <Box sx={colStyle} cursor="pointer" data-sort="Pending Reward">
          Pending Reward
        </Box>
        <Box sx={colStyle} cursor="pointer" data-sort="Total APR 30D">
          Total APR 30D
        </Box>
        <Box sx={colStyle} cursor="pointer" data-sort="TVL">
          TVL
        </Box>
        <Box sx={colStyle} />
      </Flex>
      <TabPanels>
        {tabs.map((tab, idx) => (
          <TabPanel key={`panel-${tab}`}>
            {!hydratedFarms.length && <LoadingList />}
            {idx === tabIndex
              ? displayList.map((pool) => <FarmListItem key={pool.id.toBase58()} farmPool={pool} tokenMap={tokenMap} />)
              : null}
          </TabPanel>
        ))}
      </TabPanels>
    </Tabs>
  )
}
