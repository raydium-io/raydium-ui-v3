import { useState, useEffect, useCallback, ChangeEvent, MouseEvent, useRef } from 'react'
import InfiniteScroll from 'react-infinite-scroll-component'
import { PairJsonInfo, ApiJsonPairInfo } from '@raydium-io/raydium-sdk'
import Link from 'next/link'
import { usePoolStore } from './usePoolStore'
import { formatLocaleStr } from '@/util/number'
import { useTokenStore, useLiquidityStore, useTokenAccountStore, useAppStore } from '@/store'

import { Avatar, Flex, Box, Button, Switch, useDisclosure, Hide } from '@chakra-ui/react'
import useSort from '@/hooks/useSort'
import ConnectedOnly from '@/component/ConnectedOnly'
import WithdrawLiquidity from './components/WithdrawLiquidity'
import LoadingSkeleton from './components/LoadingSkeleton'
import { wSolToSol } from '@/util/token'

const perPage = 20
const col1Style = { flex: 2, minWidth: '200px', p: '4px 6px', mb: '10px' }
const colStyle = { flex: 1, minWidth: '15%', p: '4px 6px', mb: '10px' }

function Pools() {
  const { isOpen, onClose, onOpen } = useDisclosure()
  const connected = useAppStore((s) => s.connected)
  const pairInfoList = usePoolStore((s) => s.pairInfoList)
  const poolMap = useLiquidityStore((s) => s.poolMap)
  const tokenMap = useTokenStore((s) => s.tokenMap)
  const [getTokenBalanceUiAmount, tokenAccounts] = useTokenAccountStore((s) => [s.getTokenBalanceUiAmount, s.tokenAccounts])

  const [filteredList, setFilteredList] = useState<PairJsonInfo[]>([])
  const [displayList, setDisplayList] = useState<PairJsonInfo[]>([])
  const [showStaked, setShowStaked] = useState<boolean>(false)
  const modalDataRef = useRef<{ pairInfo: ApiJsonPairInfo; balance: string } | undefined>()
  const { sortFn, onChangeSortData } = useSort({ defaultKey: 'volume7d' })

  useEffect(() => {
    const filteredList = showStaked
      ? pairInfoList.filter(
          (pair) =>
            connected &&
            !getTokenBalanceUiAmount({ mint: pair.lpMint, decimals: tokenMap.get(poolMap.get(pair.ammId)?.baseMint || '')?.decimals })
              .isZero
        )
      : pairInfoList
    setFilteredList(filteredList)
    setDisplayList((list) => sortFn(filteredList).slice(0, list.length || perPage))
  }, [pairInfoList, showStaked, getTokenBalanceUiAmount, tokenMap, poolMap, tokenAccounts, connected])

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
        <Hide below="sm">
          <Box sx={colStyle} cursor="pointer" onClick={handleClickSort} data-sort="volume7d">
            Volume 7D
          </Box>
          <Box sx={colStyle} cursor="pointer" onClick={handleClickSort} data-sort="fee7d">
            Fees 7D
          </Box>
        </Hide>
        <Box sx={colStyle} cursor="pointer" onClick={handleClickSort} data-sort="apr7d">
          APR 7D
        </Box>
        <Box sx={colStyle} />
      </Flex>
      <Box id="poolCtr" height={['70vh', '500px']} overflowY="auto">
        {pairInfoList.length ? (
          <InfiniteScroll
            scrollableTarget="poolCtr"
            dataLength={displayList.length} //This is important field to render the next data
            next={fetchData}
            hasMore={displayList.length < pairInfoList.length}
            loader={<></>}
          >
            {displayList.map((pair) => {
              const pool = poolMap.get(pair.ammId)
              const [baseToken, quoteToken] = [tokenMap.get(pool?.baseMint || ''), tokenMap.get(pool?.quoteMint || '')]
              pair
              const balance = getTokenBalanceUiAmount({ mint: pair.lpMint, decimals: pool?.lpDecimals })
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
                  <Hide below="sm">
                    <Box sx={colStyle}>${formatLocaleStr(pair.volume7d)}</Box>
                    <Box sx={colStyle}>${formatLocaleStr(pair.fee7d)}</Box>
                  </Hide>
                  <Box sx={colStyle}>{pair.apr7d}</Box>
                  <Box sx={colStyle}>
                    <ConnectedOnly>
                      <Link
                        href={{
                          pathname: '/liquidity',
                          query: {
                            baseMint: wSolToSol(baseToken?.mint.toString()),
                            quoteMint: wSolToSol(quoteToken?.mint.toString())
                          }
                        }}
                      >
                        <Button size="sm">+</Button>
                      </Link>
                      {!balance.isZero && (
                        <Button onClick={() => handleClickRemove(pair, balance.text)} size="sm" ml="5px">
                          -
                        </Button>
                      )}
                      <div>{balance.text}</div>
                    </ConnectedOnly>
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
