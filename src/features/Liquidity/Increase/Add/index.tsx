import { Flex, HStack, Text, useDisclosure } from '@chakra-ui/react'
import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import Button from '@/components/Button'
import IntervalCircle, { IntervalCircleHandler } from '@/components/IntervalCircle'
import TokenInput from '@/components/TokenInput'
import HorizontalSwitchSmallIcon from '@/icons/misc/HorizontalSwitchSmallIcon'
import { useAppStore, useLiquidityStore, useTokenAccountStore } from '@/store'
import { colors } from '@/theme/cssVariables'
import { formatCurrency } from '@/utils/numberish/formatter'
import StakeLpModal from './components/StakeLpModal'
import { SlippageAdjuster } from '@/components/SlippageAdjuster'
import { IDL } from '@/idl/raydium_cp_swap';
import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import Decimal from 'decimal.js'
import shallow from 'zustand/shallow'
import { useEvent } from '@/hooks/useEvent'
import { throttle } from '@/utils/functionMethods'
import useRefreshEpochInfo from '@/hooks/app/useRefreshEpochInfo'
import { Program, AnchorProvider, BN, utils } from '@project-serum/anchor';
import { useWallet } from '@solana/wallet-adapter-react';
import { getAmmConfigAddress, getAuthAddress, getPoolAddress, getPoolLpMintAddress, getPoolVaultAddress, getOrcleAccountAddress } from '@/utils/pda'
import dexConfig from '@/config/config'

// Custom type interfaces to replace Raydium SDK types
interface PoolInfo {
  mintA: { address: string; symbol: string; decimals: number }
  mintB: { address: string; symbol: string; decimals: number }
  mintAmountA: number
  mintAmountB: number
  lpAmount: number
  lpPrice: number
  lpMint: { decimals: number }
  farmOngoingCount: number
  programId: string,
  poolId: string
}

interface TokenInfo {
  address: string
  symbol: string
  decimals: number
}

const InputWidth = ['100%']

export default function AddLiquidity({
  pool,
  poolNotFound,
  tokenPair,
  rpcData,
  mutate,
  onSelectToken,
  onRefresh
}: {
  pool?: PoolInfo
  isLoading: boolean
  poolNotFound: boolean
  tokenPair: { base?: TokenInfo; quote?: TokenInfo }
  rpcData?: any // Replace with the appropriate custom type for RPC data
  mutate: () => void
  onRefresh: () => void
  onSelectToken: (token: TokenInfo, side: 'base' | 'quote') => void
}) {
  const wallet = useWallet();
  const { t } = useTranslation()
  const [addLiquidityAct, computePairAmount, addCpmmLiquidityAct] = useLiquidityStore(
    (s) => [s.addLiquidityAct, s.computePairAmount, s.addCpmmLiquidityAct],
    shallow
  )
  const epochInfo = useAppStore((s) => s.epochInfo)
  useRefreshEpochInfo()

  const { isOpen: isStakeLpOpen, onOpen: onOpenStakeLp, onClose: onCloseStakeLp } = useDisclosure()
  const { isOpen: isReverse, onToggle: onToggleReverse } = useDisclosure()

  const getTokenBalanceUiAmount = useTokenAccountStore((s) => s.getTokenBalanceUiAmount)
  const rpcMintAmountA = rpcData
    ? new Decimal(rpcData.baseReserve.toString()).div(10 ** (pool?.mintA.decimals ?? 0)).toNumber()
    : pool?.mintAmountA
  const rpcMintAmountB = rpcData
    ? new Decimal(rpcData.quoteReserve.toString()).div(10 ** (pool?.mintB.decimals ?? 0)).toNumber()
    : pool?.mintAmountB

  const [computeFlag, setComputeFlag] = useState(Date.now())
  const [isTxSending, setIsTxSending] = useState(false)
  const [pairAmount, setPairAmount] = useState<{ base: string; quote: string }>({ base: '', quote: '' })
  const computeAmountRef = useRef<{ base: string; quote: string }>({ base: '', quote: '' })
  const computedLpRef = useRef(new Decimal(0))
  const focusRef = useRef<'base' | 'quote'>('base')

  const circleRef = useRef<IntervalCircleHandler>(null)

  const [tokenBalance, setTokenBalance] = useState<{ token1: number, token2: number }>({ token1: 0, token2: 0 })

  const anchorWallet = useMemo(() => {
    if (!wallet.publicKey || !wallet.signTransaction || !wallet.signAllTransactions) return null;
    return {
      publicKey: wallet.publicKey,
      signTransaction: wallet.signTransaction.bind(wallet),
      signAllTransactions: wallet.signAllTransactions.bind(wallet),
    };
  }, [wallet]);

  const fetchAmount = async () => {
    try {
      if (anchorWallet && tokenPair.base && tokenPair.quote && pool) {

        const connection = new Connection(dexConfig.network, 'confirmed');
        const provider = new AnchorProvider(connection, anchorWallet, AnchorProvider.defaultOptions());
        const programId = new PublicKey(dexConfig.programId);
        const program = new Program(IDL, programId, provider);

        const token0 = new PublicKey(tokenPair.base?.address)
        const token1 = new PublicKey(tokenPair.quote?.address)

        const poolAddress = new PublicKey(pool.poolId)

        // const [vault0] = await getPoolVaultAddress(
        //   poolAddress,
        //   token0,
        //   program.programId
        // );
        // const [vault1] = await getPoolVaultAddress(
        //   poolAddress,
        //   token1,
        //   program.programId
        // );

        const vault0 = getAssociatedTokenAddressSync(token0, poolAddress, true, TOKEN_PROGRAM_ID)
        const vault1 = getAssociatedTokenAddressSync(token1, poolAddress, true)

        const tokenBalance1 = await connection.getTokenAccountBalance(vault0);
        const tokenBalance2 = await connection.getTokenAccountBalance(vault1);

        setTokenBalance({
          token1: tokenBalance1.value.uiAmount ? tokenBalance1.value.uiAmount : 0,
          token2: tokenBalance2.value.uiAmount ? tokenBalance2.value.uiAmount : 0
        })
      }
    } catch (error) {
      console.log(error)
    }
  }

  useEffect(() => {
    fetchAmount()
  }, [])

  const handleCompute = useEvent(() => {
    if (!pool) return
    // const isBase = focusRef.current === 'base'
    // const updateSide = isBase ? 'quote' : 'base'
    // if (computeAmountRef.current[focusRef.current] === '' || poolNotFound) {
    //   setPairAmount((prev) => {
    //     computeAmountRef.current = { ...prev, [updateSide]: '' }
    //     return { ...prev, [updateSide]: '' }
    //   })
    //   return
    // }

    // const rpcLpAmount = rpcData?.lpAmount ?? rpcData?.lpSupply
    // computePairAmount({
    //   pool: {
    //     ...pool,
    //     lpAmount: rpcData ? new Decimal(rpcLpAmount!.toString()).div(10 ** rpcData.lpDecimals).toNumber() : pool.lpAmount
    //   },
    //   amount: computeAmountRef.current[focusRef.current] || '0',
    //   baseReserve: rpcData?.baseReserve || new BN(new Decimal(pool.mintAmountA).mul(10 ** pool.mintA.decimals).toString()),
    //   quoteReserve: rpcData?.quoteReserve || new BN(new Decimal(pool.mintAmountB).mul(10 ** pool.mintB.decimals).toString()),
    //   baseIn: isBase
    // }).then((r) => {
    //   computeAmountRef.current[updateSide] = new Decimal(r.maxOutput).toFixed()
    //   computedLpRef.current = new Decimal(r.liquidity.toString())
    //   setPairAmount((prev) => ({
    //     ...prev,
    //     [updateSide]: new Decimal(r.output).toFixed()
    //   }))
    // })

    tokenBalance?.token1
    const isBase = focusRef.current === 'base'
    const updateSide = isBase ? 'quote' : 'base'
    let amount = 0;

    if (updateSide === "base") {
      amount = parseFloat(computeAmountRef.current[focusRef.current]) * tokenBalance?.token2 / tokenBalance?.token1
    }
    else {
      amount = parseFloat(computeAmountRef.current[focusRef.current]) * tokenBalance?.token1 / tokenBalance?.token2
    }

    setPairAmount((prev) => ({
      ...prev,
      [updateSide]: amount
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
  // error =
  //   error ||
  //   (!isBalanceAEnough || !isBalanceBEnough
  //     ? {
  //       key: 'error.insufficient_sub_balance',
  //       props: {
  //         token: isBalanceAEnough ? getTokenSymbol(tokenPair.quote!) : getTokenSymbol(tokenPair.base!)
  //       }
  //     }
  //     : undefined)

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

    const callBacks = {
      onSent: () => {
        setPairAmount({ base: '', quote: '' })
        computeAmountRef.current = { base: '', quote: '' }
      },
      onConfirmed: () => {
        if (pool.farmOngoingCount > 0) onOpenStakeLp()
      },
      onFinally: () => setIsTxSending(false)
    }

    const baseIn = focusRef.current === 'base'

    // addLiquidityAct({
    //   poolInfo: pool,
    //   amountA: computeAmountRef.current.base,
    //   amountB: computeAmountRef.current.quote,
    //   fixedSide: baseIn ? 'a' : 'b',
    //   ...callBacks
    // })
  }

  return (
    <Flex direction="column" w="full" px="24px" py="40px" bg={colors.backgroundLight}>
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
          {formatCurrency(new Decimal(pool?.lpPrice ?? 0).mul(computedLpRef.current.div(10 ** (pool?.lpMint.decimals ?? 0))).toString(), {
            symbol: '$'
          })}
        </Text>
      </Flex>
      {/* footer */}
      <Flex mt={5} justify="space-between" align="center" w={InputWidth}>
        <HStack fontSize="sm" color={colors.textSecondary} spacing="6px">
          {/* <Text>
            {pool
              ? `1 ${convertWsolToSolString(pool[isReverse ? 'mintB' : 'mintA'].symbol)} ≈ ${formatCurrency(
                new Decimal((isReverse ? rpcMintAmountA! : rpcMintAmountB!) / (isReverse ? rpcMintAmountB! : rpcMintAmountA!)).toFixed(
                  Math.max(pool[isReverse ? 'mintA' : 'mintB'].decimals, 6),
                  Decimal.ROUND_UP
                )
              )} ${convertWsolToSolString(pool[isReverse ? 'mintA' : 'mintB'].symbol)}`
              : '-'}
          </Text> */}
          <HorizontalSwitchSmallIcon cursor="pointer" onClick={onToggleReverse} />
        </HStack>
        <HStack fontSize="xl" color={colors.textPrimary} fontWeight="medium" spacing={3}>
          <SlippageAdjuster variant="liquidity" />
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
