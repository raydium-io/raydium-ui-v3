import { useState, useEffect, useCallback, ChangeEvent } from 'react'
import InfiniteScroll from 'react-infinite-scroll-component'
import { PairJsonInfo } from '@raydium-io/raydium-sdk'
import Link from 'next/link'
import { usePoolStore } from './usePoolStore'
import { formatLocaleStr } from '@/util/number'
import { useTokenStore, useLiquidityStore, useTokenAccountStore } from '@/store'

import { Avatar, Flex, Box, Button, Switch } from '@chakra-ui/react'

const perPage = 20

const col1Style = { flex: 2, p: '4px 6px', mb: '10px' }
const colStyle = { flex: 1, p: '4px 6px', mb: '10px' }

function Pools() {
  const pairInfoList = usePoolStore((s) => s.pairInfoList)
  const poolMap = useLiquidityStore((s) => s.poolMap)
  const tokenMap = useTokenStore((s) => s.tokenMap)
  const [getTokenBalanceUiAmount] = useTokenAccountStore((s) => [s.getTokenBalanceUiAmount, s.tokenAccounts])
  const [filteredList, setFilteredList] = useState<PairJsonInfo[]>([])
  const [displayList, setDisplayList] = useState<PairJsonInfo[]>([])
  const [showStaked, setShowStaked] = useState<boolean>(false)

  useEffect(() => {
    if (!showStaked) {
      setFilteredList(pairInfoList)
      setDisplayList(pairInfoList.slice(0, perPage))
      return
    }
    const filtered = pairInfoList.filter(
      (pair) => Number(getTokenBalanceUiAmount(pair.lpMint, tokenMap.get(poolMap.get(pair.ammId)?.baseMint || '')?.decimals)) > 0
    )
    setFilteredList(filtered)
    setDisplayList(filtered.slice(0, perPage))
  }, [pairInfoList, showStaked, getTokenBalanceUiAmount, tokenMap, poolMap])

  const fetchData = useCallback(() => {
    setDisplayList((list) => list.concat(filteredList.slice(list.length, list.length + perPage)))
  }, [filteredList])

  const hanldeSwitchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setShowStaked(e.currentTarget.checked)
  }

  return (
    <>
      <Switch onChange={hanldeSwitchChange} />
      <Flex>
        <Box sx={col1Style}>Pool</Box>
        <Box sx={colStyle}>Liquidity</Box>
        <Box sx={colStyle}>Volume 7D</Box>
        <Box sx={colStyle}>Fees 7D</Box>
        <Box sx={colStyle}>APR 7D</Box>
        <Box sx={colStyle} />
      </Flex>
      <Box id="poolCtr" height={['70vh', '300px']} overflowY="auto">
        <InfiniteScroll
          scrollableTarget="poolCtr"
          dataLength={displayList.length} //This is important field to render the next data
          next={fetchData}
          hasMore={displayList.length < pairInfoList.length}
          loader={<></>}
        >
          {displayList.map((pair) => {
            const [baseToken, quoteToken] = [
              tokenMap.get(poolMap.get(pair.ammId)?.baseMint || ''),
              tokenMap.get(poolMap.get(pair.ammId)?.quoteMint || '')
            ]
            const balance = getTokenBalanceUiAmount(pair.lpMint, baseToken?.decimals)
            return (
              <Flex key={pair.ammId}>
                <Box sx={col1Style}>
                  <Flex alignItems="center">
                    <Avatar size="sm" name={baseToken?.symbol} src={baseToken?.icon} />
                    <Avatar size="sm" mr="10px" ml="-10px" name={quoteToken?.symbol} src={quoteToken?.icon} />
                    {pair.name}
                  </Flex>
                </Box>
                <Box sx={colStyle}>${formatLocaleStr(pair.liquidity)}</Box>
                <Box sx={colStyle}>${formatLocaleStr(pair.volume7d)}</Box>
                <Box sx={colStyle}>${formatLocaleStr(pair.fee7d)}</Box>
                <Box sx={colStyle}>{pair.apr7d}</Box>
                <Box sx={colStyle}>
                  <Link
                    href={{
                      pathname: '/liquidity',
                      query: {
                        baseMint: baseToken?.mint.toString(),
                        quoteMint: quoteToken?.mint.toString()
                      }
                    }}
                  >
                    <Button size="sm">+</Button>
                  </Link>
                  {Number(balance) > 0 && (
                    <Button size="sm" ml="5px">
                      -
                    </Button>
                  )}
                  <div>{balance}</div>
                </Box>
              </Flex>
            )
          })}
        </InfiniteScroll>
      </Box>
    </>
  )
}

export default Pools
