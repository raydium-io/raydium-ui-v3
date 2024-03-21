import { Flex, HStack, Text, useDisclosure } from '@chakra-ui/react'
import { ApiV3PoolInfoStandardItem, ApiV3Token, TokenInfo } from '@raydium-io/raydium-sdk-v2'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import Button from '@/components/Button'
import IntervalCircle, { IntervalCircleHandler } from '@/components/IntervalCircle'
import TokenInput from '@/components/TokenInput'
import HorizontalSwitchSmallIcon from '@/icons/misc/HorizontalSwitchSmallIcon'
import { useAppStore, useLiquidityStore, useTokenAccountStore } from '@/store'
import useFetchRpcPoolData from '@/hooks/pool/amm/useFetchRpcPoolData'
import { colors } from '@/theme/cssVariables'
import { formatLocaleStr } from '@/utils/numberish/formatter'
import { getMintSymbol, wSolToSolString } from '@/utils/token'
// import AutoSwapModal from './components/AutoSwapModal'
import StakeLpModal from './components/StakeLpModal'

import Decimal from 'decimal.js'
import shallow from 'zustand/shallow'
// import { QuestionToolTip } from '@/components/QuestionToolTip'
import { useEvent } from '@/hooks/useEvent'
import { throttle } from '@/utils/functionMethods'
import useRefreshEpochInfo from '@/hooks/app/useRefreshEpochInfo'

const InputWidth = ['100%']

export default function AddLiquidity({
  pool,
  poolNotFound,
  tokenPair,
  onSelectToken,
  onRefresh
}: {
  pool?: ApiV3PoolInfoStandardItem
  isLoading: boolean
  poolNotFound: boolean
  tokenPair: { base?: ApiV3Token; quote?: ApiV3Token }
  onRefresh: () => void
  onSelectToken: (token: TokenInfo | ApiV3Token, side: 'base' | 'quote') => void
}) {
  const { t } = useTranslation()
  const [addLiquidityAct, computePairAmount] = useLiquidityStore((s) => [s.addLiquidityAct, s.computePairAmount], shallow)
  const epochInfo = useAppStore((s) => s.epochInfo)
  useRefreshEpochInfo()

  // const { isOpen: isOpenAutoSwapModal, onOpen: onOpenAutoSwapModal, onClose: onCloseAutoSwapModal } = useDisclosure()
  const { isOpen: isStakeLpOpen, onOpen: onOpenStakeLp, onClose: onCloseStakeLp } = useDisclosure()
  const { isOpen: isReverse, onToggle: onToggleReverse } = useDisclosure()

  const getTokenBalanceUiAmount = useTokenAccountStore((s) => s.getTokenBalanceUiAmount)
  const { data: rpcData, mutate } = useFetchRpcPoolData({ poolId: pool?.id })

  const [computeFlag, setComputeFlag] = useState(Date.now())
  const [isTxSending, setIsTxSending] = useState(false)
  // const [autoSwap, setAutoSwap] = useState(true)
  const [pairAmount, setPairAmount] = useState<{ base: string; quote: string }>({ base: '', quote: '' })
  const computeAmountRef = useRef<{ base: string; quote: string }>({ base: '', quote: '' })
  const computedLpRef = useRef(new Decimal(0))
  const focusRef = useRef<'base' | 'quote'>('base')

  const circleRef = useRef<IntervalCircleHandler>(null)

  const handleCompute = useEvent(() => {
    if (!pool) return
    const isBase = focusRef.current === 'base'
    const updateSide = isBase ? 'quote' : 'base'
    if (computeAmountRef.current[focusRef.current] === '' || poolNotFound) {
      setPairAmount((prev) => {
        computeAmountRef.current = { ...prev, [updateSide]: '' }
        return { ...prev, [updateSide]: '' }
      })
      return
    }

    const r = computePairAmount({
      pool: {
        ...pool,
        mintAmountA: rpcData ? new Decimal(rpcData.baseReserve.toString()).div(10 ** rpcData.baseDecimals).toNumber() : pool.mintAmountA,
        mintAmountB: rpcData ? new Decimal(rpcData.quoteReserve.toString()).div(10 ** rpcData.quoteDecimals).toNumber() : pool.mintAmountB,
        lpAmount: rpcData ? new Decimal(rpcData.lpSupply.toString()).div(10 ** rpcData.lpDecimals).toNumber() : pool.lpAmount
      },
      amount: computeAmountRef.current[focusRef.current] || '0',
      baseIn: isBase
    })
    computeAmountRef.current[updateSide] = r.maxOutput
    computedLpRef.current = new Decimal(r.liquidity.toString()).div(10 ** pool.lpMint.decimals)
    setPairAmount((prev) => ({
      ...prev,
      [updateSide]: r.output
    }))
  })

  const handleAmountChange = useEvent((val: string, side: 'base' | 'quote') => {
    computeAmountRef.current[side] = val
    setPairAmount((pair) => ({
      ...pair,
      [side]: val
    }))
    handleCompute()
  })

  useEffect(() => {
    handleCompute()
  }, [pool, computeFlag, poolNotFound, rpcData, epochInfo])

  const [isBalanceAEnough, isBalanceBEnough] = [
    tokenPair.base
      ? new Decimal(getTokenBalanceUiAmount({ mint: tokenPair.base.address, decimals: tokenPair.base.decimals }).text).gte(
          pairAmount.base || '0'
        )
      : true,
    tokenPair.quote
      ? new Decimal(getTokenBalanceUiAmount({ mint: tokenPair.quote.address, decimals: tokenPair.quote.decimals }).text).gte(
          pairAmount.quote || '0'
        )
      : true
  ]

  let error =
    new Decimal(pairAmount.base || '0').lte(0) || new Decimal(pairAmount.quote || '0').lte(0)
      ? {
          key: 'error.enter_token_amount',
          props: {}
        }
      : undefined
  error =
    error ||
    (!isBalanceAEnough || !isBalanceBEnough
      ? {
          key: 'error.insufficient_sub_balance',
          props: {
            token: isBalanceAEnough
              ? getMintSymbol({ mint: tokenPair.quote!, transformSol: true })
              : getMintSymbol({ mint: tokenPair.base!, transformSol: true })
          }
        }
      : undefined)

  const handleEnd = useCallback(
    throttle(() => {
      mutate()
      onRefresh()
      setComputeFlag(Date.now())
    }, 1000),
    [mutate, onRefresh]
  )

  const handleClickCircle = useEvent(() => {
    circleRef.current?.restart()
    handleEnd()
  })

  const handleClickAdd = () => {
    if (!pool) return
    setIsTxSending(true)
    addLiquidityAct({
      poolInfo: pool,
      amountA: computeAmountRef.current.base,
      amountB: computeAmountRef.current.quote,
      fixedSide: focusRef.current === 'base' ? 'a' : 'b',
      onSuccess: () => {
        setPairAmount({ base: '', quote: '' })
        computeAmountRef.current = { base: '', quote: '' }
      },
      onConfirmed: () => {
        if (pool.farmOngoingCount > 0) onOpenStakeLp()
      },
      onFinally: () => setIsTxSending(false)
    })
  }

  return (
    <Flex direction="column" w="full" px="24px" py="40px" bg={colors.backgroundLight}>
      {/* modal */}
      {/* <AutoSwapModal
        isOpen={isOpenAutoSwapModal}
        autoSwap={autoSwap}
        onClose={onCloseAutoSwapModal}
        onConfirm={() => {
          setAutoSwap((p) => !p)
          onCloseAutoSwapModal()
        }}
      /> */}
      {/* header */}
      {/* TODO: currently auto-swap can't enabled */}
      {/* <Flex w="full" flexGrow={1} justify="space-between">
        <HStack spacing={2}>
          <Text color={colors.textTertiary}>{t('liquidity.auto_swap')}</Text>
          <Box onClick={onOpenAutoSwapModal}>
            <Switch isChecked={autoSwap} />
            <Switch isChecked={false} disabled />
          </Box>
          <QuestionToolTip label={<Box>{t('liquidity.auto_swap_hint')}</Box>} iconProps={{ color: colors.textTertiary }} />
        </HStack>
      </Flex> */}
      {/* base token */}
      <Flex mt={5} justify="center" align="center" w={InputWidth} h="118px" borderRadius="12px">
        <TokenInput
          width="100%"
          ctrSx={{ w: '100%' }}
          topBlockSx={{ py: '6px' }}
          token={tokenPair.base}
          value={pairAmount.base}
          disableSelectToken
          onChange={(v) => handleAmountChange(v, 'base')}
          onTokenChange={(token) => onSelectToken(token, 'base')}
          onFocus={() => (focusRef.current = 'base')}
        />
      </Flex>
      {/* quote token */}
      <Flex mt={3} justify="center" align="center" w={InputWidth} h="118px" borderRadius="12px">
        <TokenInput
          width="100%"
          ctrSx={{ w: '100%' }}
          topBlockSx={{ py: '6px' }}
          token={tokenPair.quote}
          value={pairAmount.quote}
          disableSelectToken
          onChange={(v) => handleAmountChange(v, 'quote')}
          onTokenChange={(token) => onSelectToken(token, 'quote')}
          onFocus={() => (focusRef.current = 'quote')}
        />
      </Flex>
      {/* total deposit */}
      <Flex
        mt={4}
        justify="space-between"
        align="center"
        w={InputWidth}
        h="60px"
        bg={colors.backgroundTransparent12}
        borderRadius="12px"
        px={5}
        py={4}
      >
        <Text fontSize="sm" color={colors.textSecondary} opacity={0.6}>
          {t('liquidity.total_deposit')}
        </Text>
        <Text fontSize="xl" color={colors.textPrimary} fontWeight="medium">
          ${formatLocaleStr(new Decimal(pool?.lpPrice ?? 0).mul(computedLpRef.current).toString())}
        </Text>
      </Flex>
      {/* footer */}
      <Flex mt={5} justify="space-between" align="center" w={InputWidth}>
        <HStack fontSize="sm" color={colors.textSecondary} spacing="6px">
          <Text>
            {pool
              ? `1 ${wSolToSolString(pool[isReverse ? 'mintB' : 'mintA'].symbol)} ≈ ${Number(
                  new Decimal(pool[isReverse ? 'mintAmountA' : 'mintAmountB'] / pool[isReverse ? 'mintAmountB' : 'mintAmountA']).toFixed(
                    Math.max(pool[isReverse ? 'mintA' : 'mintB'].decimals, 6)
                  )
                )} ${wSolToSolString(pool[isReverse ? 'mintA' : 'mintB'].symbol)}`
              : '-'}
          </Text>
          <HorizontalSwitchSmallIcon cursor="pointer" onClick={onToggleReverse} />
        </HStack>
        <HStack fontSize="xl" color={colors.textPrimary} fontWeight="medium" spacing={3}>
          <IntervalCircle
            componentRef={circleRef}
            svgWidth={18}
            strokeWidth={2}
            trackStrokeColor={colors.secondary}
            trackStrokeOpacity={0.5}
            filledTrackStrokeColor={colors.secondary}
            onClick={handleClickCircle}
            onEnd={handleEnd}
          />
        </HStack>
      </Flex>
      <Button
        mt={7}
        w="full"
        isDisabled={poolNotFound || !pool || !!error}
        isLoading={isTxSending}
        loadingText={`${t('liquidity.add_liquidity')}...`}
        onClick={handleClickAdd}
      >
        {error ? t(error.key, error.props) : poolNotFound ? t('liquidity.pool_not_found') : t('liquidity.add_liquidity')}
      </Button>

      <StakeLpModal isOpen={isStakeLpOpen} onClose={onCloseStakeLp} />
    </Flex>
  )
}