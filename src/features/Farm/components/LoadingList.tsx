import { ApiFarmPools } from 'test-raydium-sdk-v2'
import { Flex, Box, Avatar, Skeleton } from '@chakra-ui/react'
import { useAppStore } from '@/store/useAppStore'
import { transformWSolName, col1Style, colStyle } from '../util'

export default function LoadingList({ defaultTab }: { defaultTab?: keyof Omit<ApiFarmPools, 'stake'> }) {
  const raydium = useAppStore((s) => s.raydium)
  const category = defaultTab || 'raydium'
  const farms = raydium?.apiData.farmPools?.data[category] || []
  return (
    <>
      {farms.map((farm) => {
        const [baseToken, quoteToken] = [raydium?.token.allTokenMap.get(farm.baseMint), raydium?.token.allTokenMap.get(farm.quoteMint)]
        return (
          <Flex key={farm.id} alignItems="center">
            <Box sx={col1Style}>
              <Avatar size="sm" name={baseToken?.symbol} src={baseToken?.icon} />
              <Avatar size="sm" ml="-12px" mr="6px" name={quoteToken?.symbol} src={quoteToken?.icon} />
              {transformWSolName(`${baseToken?.symbol}-${quoteToken?.symbol}`)}
            </Box>
            <Box sx={colStyle}></Box>
            <Box sx={colStyle} fontSize="18px">
              <Skeleton display="inline-block" w="60px" h="18px" />%
            </Box>
            <Box sx={colStyle}>
              <Skeleton w="100px" h="16px" mb="4px" />
              <Skeleton w="100px" h="16px" />
            </Box>
            <Box sx={colStyle} />
          </Flex>
        )
      })}
    </>
  )
}
