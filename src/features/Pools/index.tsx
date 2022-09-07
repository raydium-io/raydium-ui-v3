import { useState, useEffect, useCallback, ChangeEvent, MouseEvent, useRef } from 'react'
import InfiniteScroll from 'react-infinite-scroll-component'
import { PairJsonInfo, ApiJsonPairInfo } from '@raydium-io/raydium-sdk'
import Link from 'next/link'
import { usePoolStore } from './usePoolStore'
import { formatLocaleStr } from '@/util/number'
import { useTokenStore, useLiquidityStore, useTokenAccountStore } from '@/store'

import { Avatar, Flex, Box, Button, Switch, useDisclosure } from '@chakra-ui/react'
import useSort from '@/hooks/useSort'
import WithdrawLiquidity from './components/WithdrawLiquidity'
import LoadingSkeleton from './components/LoadingSkeleton'

const perPage = 20
const col1Style = { flex: 2, minWidth: '200px', p: '4px 6px', mb: '10px' }
const colStyle = { flex: 1, minWidth: '15%', p: '4px 6px', mb: '10px' }

function Pools() {
  const { isOpen, onClose, onOpen } = useDisclosure()
  const pairInfoList = usePoolStore((s) => s.pairInfoList)
  const poolMap = useLiquidityStore((s) => s.poolMap)
  const tokenMap = useTokenStore((s) => s.tokenMap)
  const [getTokenBalanceUiAmount] = useTokenAccountStore((s) => [s.getTokenBalanceUiAmount, s.tokenAccounts])

  const [filteredList, setFilteredList] = useState<PairJsonInfo[]>([])
  const [displayList, setDisplayList] = useState<PairJsonInfo[]>([])
  const [showStaked, setShowStaked] = useState<boolean>(false)
  const modalDataRef = useRef<{ pairInfo: ApiJsonPairInfo; balance: string } | undefined>()
  const { sortFn, onChangeSortData } = useSort({})

  useEffect(() => {
    const filteredList = showStaked
      ? pairInfoList.filter((pair) =>
          getTokenBalanceUiAmount(pair.lpMint, tokenMap.get(poolMap.get(pair.ammId)?.baseMint || '')?.decimals).gte('0')
        )
      : pairInfoList
    setFilteredList(filteredList)
    setDisplayList(filteredList.slice(0, perPage))
  }, [pairInfoList, showStaked, getTokenBalanceUiAmount, tokenMap, poolMap])

  useEffect(() => {
    setFilteredList((list) => {
      const sortedList = [...sortFn(list)]
      setDisplayList((displayList) => (sortedList.length ? sortedList.slice(0, displayList.length) : displayList))
      return sortedList
    })
  }, [sortFn])

  const fetchData = useCallback(() => {
    setDisplayList((list) => list.concat(filteredList.slice(list.length, list.length + perPage)))
  }, [filteredList])

  const handleSwitchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setShowStaked(e.currentTarget.checked)
  }

  const handleClickSort = (e: MouseEvent<HTMLDivElement>) => {
    onChangeSortData(e.currentTarget.dataset['sort'] || '')
  }

  const handleClickRemove = (pairInfo: ApiJsonPairInfo, balance: string) => {
    modalDataRef.current = { pairInfo, balance }
    onOpen()
  }

  return (
    <>
      <Switch onChange={handleSwitchChange} />
      <Flex>
        <Box sx={col1Style}>Pool</Box>
        <Box sx={colStyle} cursor="pointer" onClick={handleClickSort} data-sort="liquidity">
          Liquidity
        </Box>
        <Box sx={colStyle} cursor="pointer" onClick={handleClickSort} data-sort="volume7d">
          Volume 7D
        </Box>
        <Box sx={colStyle} cursor="pointer" onClick={handleClickSort} data-sort="fee7d">
          Fees 7D
        </Box>
        <Box sx={colStyle} cursor="pointer" onClick={handleClickSort} data-sort="apr7d">
          APR 7D
        </Box>
        <Box sx={colStyle} />
      </Flex>
      <Box id="poolCtr" height={['70vh', '300px']} overflowY="auto">
        {pairInfoList.length ? (
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
                      <Button onClick={() => handleClickRemove(pair, balance.text)} size="sm" ml="5px">
                        -
                      </Button>
                    )}
                    <div>{balance.text}</div>
                  </Box>
                </Flex>
              )
            })}
          </InfiniteScroll>
        ) : (
          <LoadingSkeleton />
        )}
      </Box>
      {isOpen && <WithdrawLiquidity onClose={onClose} pairInfo={modalDataRef.current!.pairInfo} balance={modalDataRef.current!.balance} />}
    </>
  )
}

export default Pools
