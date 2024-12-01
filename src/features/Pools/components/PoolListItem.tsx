import {
  Box,
  Center,
  CircularProgress,
  CircularProgressLabel,
  Flex,
  Grid,
  GridItem,
  Highlight,
  HStack,
  Image,
  Tag,
  Text,
  useColorMode,
  useDisclosure,
  VStack
} from '@chakra-ui/react'
import router from 'next/router'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import { wSolToSol } from '@/utils/token'
import AddressChip from '@/components/AddressChip'
import Button from '@/components/Button'
import { Desktop, Mobile } from '@/components/MobileDesktop'
import PanelCard from '@/components/PanelCard'
import TokenAvatar from '@/components/TokenAvatar'
import TokenAvatarPair from '@/components/TokenAvatarPair'
import Tooltip from '@/components/Tooltip'
import { AprKey, FormattedPoolInfoItem } from '@/hooks/pool/type'
import ChartInfoIcon from '@/icons/misc/ChartInfoIcon'
import SwapPoolItemIcon from '@/icons/misc/SwapPoolItemIcon'
import OpenBookIcon from '@/icons/misc/OpenBookIcon'
import PulseIcon from '@/icons/misc/PulseIcon'
import LiquidityLockIcon from '@/icons/misc/LiquidityLockIcon'
import QuestionCircleIcon from '@/icons/misc/QuestionCircleIcon'
import StarIcon from '@/icons/misc/StarIcon'
import { useAppStore } from '@/store'
import { colors } from '@/theme/cssVariables'
import { formatCurrency, formatToRawLocaleStr } from '@/utils/numberish/formatter'
import toPercentString from '@/utils/numberish/toPercentString'
import { poolListGrid } from '../cssBlocks'
import { TimeBase } from '../Pools'
import { getFavoritePoolCache, setFavoritePoolCache, toAPRPercent } from '../util'
import PoolDetailMobileDrawer from './PoolDetailMobileDrawer'
import PoolListItemAprDetailPopoverContent from './PoolListItemAprDetailPopoverContent'
import { aprColors, PoolListItemAprLine } from './PoolListItemAprLine'
import { PoolListItemAprPie } from './PoolListItemAprPie'
import { PoolListItemRewardStack } from './PoolListItemRewardStack'

export default function PoolListItem({
  styleType = 'list',
  index,
  timeBase,
  pool,
  field,
  onOpenChart
}: {
  styleType?: string
  index: number
  timeBase: TimeBase
  pool: FormattedPoolInfoItem
  field: AprKey
  onOpenChart?(): void
}) {
  const { t } = useTranslation()
  const isMobile = useAppStore((s) => s.isMobile)
  const { colorMode } = useColorMode()
  const isLight = colorMode === 'light'
  const [isFavorite, setIsFavoriteState] = useState(getFavoritePoolCache().has(pool.id))

  const [baseToken, quoteToken] = useMemo(
    () => [
      { ...pool.mintA, priority: 3 },
      { ...pool.mintB, priority: 3 }
    ],
    [pool.mintA.address, pool.mintB.address]
  )

  const { isOpen: isPoolDetailOpen, onOpen: onPoolDetailOpen, onClose: onPoolDetailClose } = useDisclosure()

  const timeData = useMemo(() => pool[field], [pool, field])

  const validWeeklyRewards = pool.weeklyRewards.filter(
    (reward) => Number(reward.amount) !== 0 && (!reward.endTime || reward.endTime * 1000 > dayjs().subtract(10, 'day').valueOf())
  )

  const onFavoriteClick = () => {
    setIsFavoriteState((v) => !v)
    setFavoritePoolCache(pool.id)
  }

  const onPoolClick = useCallback(() => {
    isMobile && onPoolDetailOpen()
  }, [isMobile, onPoolDetailOpen])

  const onClickDeposit = useCallback(() => {
    const isStandard = pool.type === 'Standard'
    router.push({
      pathname: isStandard ? '/liquidity/increase' : '/clmm/create-position',
      query: {
        ...(isStandard ? { mode: 'add' } : {}),
        pool_id: pool.id
      }
    })
  }, [pool])

  const onClickSwap = useCallback(() => {
    const [inputMint, outputMint] = [wSolToSol(pool.mintA.address), wSolToSol(pool.mintB.address)]
    router.push({
      pathname: '/swap',
      query: {
        inputMint,
        outputMint
      }
    })
  }, [pool])

  const feeApr = pool?.allApr[field].find((s) => s.isTradingFee)
  const rewardApr = pool?.allApr[field].filter((s) => !s.isTradingFee && !!s.token) || []
  const aprData = useMemo(
    () => ({
      fee: {
        apr: feeApr?.apr || 0,
        percentInTotal: feeApr?.percent || 0
      },
      rewards:
        rewardApr.map((r) => ({
          apr: r.apr,
          percentInTotal: r.percent,
          mint: r.token!
        })) || [],
      apr: rewardApr.reduce((acc, cur) => acc + cur.apr, 0) + (feeApr?.apr || 0)
    }),
    [pool, field]
  )

  return (
    <>
      {styleType === 'list' ? (
        <Box pl={[0, 6]} px={4} py={3} background={index % 2 ? colors.backgroundTransparent07 : ''} sx={poolListGrid} onClick={onPoolClick}>
          <Flex align="center" gap={[2, 4]}>
            <Desktop>
              <Center width={6} height={6}>
                <StarIcon selected={isFavorite} onClick={onFavoriteClick} style={{ cursor: 'pointer', minWidth: '16px' }} />
              </Center>
            </Desktop>
            <Mobile>
              <Box position={'relative'}>
                <Box
                  bg={isFavorite ? colors.selectActiveSecondary : 'transparent'}
                  borderRadius={'0px 8px 8px 0px'}
                  position="absolute"
                  top={'50%'}
                  left={-4}
                  width={'2.5px'}
                  height={5}
                  transform={'auto'}
                  translateY={'-50%'}
                ></Box>
              </Box>
            </Mobile>

            <Tooltip
              label={
                <Box py={0.5}>
                  <AddressChip address={pool.id} renderLabel={`${t('common.pool_id')}:`} mb="2" textProps={{ fontSize: 'xs' }} />
                  <AddressChip
                    address={baseToken.address}
                    renderLabel={<TokenAvatar token={baseToken} size="xs" />}
                    textProps={{ fontSize: 'xs' }}
                  />
                  <AddressChip
                    address={quoteToken.address}
                    renderLabel={<TokenAvatar token={quoteToken} size="xs" />}
                    textProps={{ fontSize: 'xs' }}
                  />
                </Box>
              }
            >
              <Grid
                gridTemplate={[
                  `
                  "a n" auto
                  "t t" auto / auto 1fr`,
                  `
                  "a t" auto
                  "n n" auto / auto 1fr`,
                  `
                  "a n" auto
                  "a t" auto / auto 1fr`
                ]}
                columnGap={[1, 2]}
                rowGap={[0.5, 0]}
                alignItems="center"
              >
                {/* token pair avatar*/}
                <GridItem area="a">
                  <TokenAvatarPair token1={baseToken} token2={quoteToken} size={['sm', 'smi', 'md']} />
                </GridItem>

                {/* name */}
                <GridItem area="n">
                  <Text color={isLight ? colors.textSecondary : colors.textPrimary} fontSize={['md', 'lg']} fontWeight="500">
                    {pool.poolName.replaceAll(/\s+/g, '')}
                  </Text>
                </GridItem>

                {/* tags */}
                <GridItem area="t">
                  <HStack align="center">
                    <Tag size="sm" variant="rounded">
                      {formatToRawLocaleStr(toPercentString(pool.feeRate * 100))}
                    </Tag>

                    {pool.isOpenBook && (
                      <Tooltip label="This pool shares liquidity to the OpenBook order-book">
                        <Flex alignItems="center">
                          <Tag size="sm" variant="rounded">
                            <OpenBookIcon />
                          </Tag>
                        </Flex>
                      </Tooltip>
                    )}
                  </HStack>
                </GridItem>
              </Grid>
            </Tooltip>
          </Flex>

          <Desktop>
            <HStack justify={'flex-end'} gap={2}>
              <Text fontSize={['sm', 'lg']} textAlign={'right'}>
                {formatCurrency(pool.tvl, { symbol: '$', decimalPlaces: 0 })}
              </Text>
              <Box minWidth="22px">
                {pool.type === 'Concentrated' && pool.burnPercent > 5 && (
                  <Tooltip
                    label={t('liquidity.total_locked_position', {
                      percent: formatToRawLocaleStr(toPercentString(pool.burnPercent, { alreadyPercented: true }))
                    })}
                  >
                    <CircularProgress
                      size="22px"
                      thickness="8px"
                      value={pool.burnPercent}
                      trackColor="rgba(191, 210, 255, 0.3)"
                      color={colors.lightPurple}
                    >
                      <CircularProgressLabel display="flex" justifyContent="center">
                        <LiquidityLockIcon />
                      </CircularProgressLabel>
                    </CircularProgress>
                  </Tooltip>
                )}
              </Box>
            </HStack>
          </Desktop>

          {/* <Text as={'span'} fontSize={['sm', 'lg']} textAlign={'right'}>
            {formatCurrency(timeData.volume, { symbol: '$', abbreviated: isMobile, decimalPlaces: 0 })}
          </Text>

          <Desktop>
            <Text as={'span'} fontSize={['sm', 'lg']} textAlign={'right'}>
              {formatCurrency(timeData.volumeFee, { symbol: '$', decimalPlaces: 0 })}
            </Text>
          </Desktop> */}

          {/* <Desktop>
            <HStack justify={'flex-end'}>
              <Box>
                <Tooltip label={t('liquidity_pools.view_chart_tooltip')}>
                  <Box
                    display={'grid'}
                    placeItems={'center'}
                    cursor={'pointer'}
                    rounded={'full'}
                    border={`2px solid ${colors.chart03}`}
                    px={3}
                    py={1}
                    onClick={onOpenChart}
                  >
                    <ChartInfoIcon />
                  </Box>
                </Tooltip>
              </Box>
              <Box>
                <Tooltip label={t('swap.title')}>
                  <Box
                    display={'grid'}
                    placeItems={'center'}
                    cursor={'pointer'}
                    rounded={'full'}
                    border={`2px solid ${colors.chart03}`}
                    px={3}
                    py={1}
                    onClick={onClickSwap}
                  >
                    <SwapPoolItemIcon fill={colors.chart03} />
                  </Box>
                </Tooltip>
              </Box>

              <Button variant="outline" size="sm" onClick={onClickDeposit}>
                {t('button.deposit')}
              </Button>
            </HStack>
          </Desktop> */}
        </Box>
      ) : (
        <Box display="block" onClick={onPoolClick}>

        </Box>
      )}
      {/* <Mobile>
        <PoolDetailMobileDrawer
          poolId={pool.id}
          pairName={pool.poolName}
          isOpen={isPoolDetailOpen}
          baseToken={baseToken}
          quoteToken={quoteToken}
          isFavorite={isFavorite}
          onFavoriteClick={onFavoriteClick}
          feeTier={pool.feeRate * 100}
          isOpenBook={pool.isOpenBook}
          onClose={onPoolDetailClose}
          onDeposit={onClickDeposit}
          timeBase={timeBase}
          volume={formatCurrency(timeData.volume, { decimalPlaces: 0 })}
          fees={formatCurrency(timeData.volumeFee, { decimalPlaces: 0 })}
          tvl={formatCurrency(pool.tvl, { decimalPlaces: 0 })}
          aprData={aprData}
          weeklyRewards={validWeeklyRewards}
          isEcosystem={pool.rewardDefaultPoolInfos === 'Ecosystem'}
        />
      </Mobile> */}
    </>
  )
}
