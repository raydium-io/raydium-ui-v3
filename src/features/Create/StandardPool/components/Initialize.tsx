import { useEffect, useCallback, useState, useRef, useMemo } from 'react'
import { Box, Flex, HStack, Text, VStack, useDisclosure, Skeleton } from '@chakra-ui/react'
import shallow from 'zustand/shallow'
import FocusTrap from 'focus-trap-react'
import { usePopper } from 'react-popper'
import { useTranslation } from 'react-i18next'
import {
  ApiV3Token,
  RAYMint,
  TokenInfo,
  solToWSolToken,
  ApiCpmmConfigInfo,
  PoolFetchType,
  solToWSol,
  CREATE_CPMM_POOL_PROGRAM,
  ApiV3PoolInfoStandardItemCpmm
} from '@raydium-io/raydium-sdk-v2'
import { DatePick, HourPick, MinutePick } from '@/components/DateTimePicker'
import DecimalInput from '@/components/DecimalInput'
import Button from '@/components/Button'
import TokenInput from '@/components/TokenInput'
import Tabs from '@/components/Tabs'
import { QuestionToolTip } from '@/components/QuestionToolTip'
import { Select } from '@/components/Select'
import HorizontalSwitchSmallIcon from '@/icons/misc/HorizontalSwitchSmallIcon'
import AddLiquidityPlus from '@/icons/misc/AddLiquidityPlus'
import SubtractIcon from '@/icons/misc/SubtractIcon'
import { useLiquidityStore, useTokenStore } from '@/store'
import { colors } from '@/theme/cssVariables'
import { wSolToSolString, wsolToSolToken } from '@/utils/token'
import { TxErrorModal } from '@/components/Modal/TxErrorModal'
import { ChevronDown, ChevronUp } from 'react-feather'
import { percentFormatter } from '@/utils/numberish/formatter'
import useFetchPoolByMint from '@/hooks/pool/useFetchPoolByMint'
import CreateSuccessModal from './CreateSuccessModal'
import useInitPoolSchema from '../hooks/useInitPoolSchema'
import useBirdeyeTokenPrice from '@/hooks/token/useBirdeyeTokenPrice'
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { IDL } from '@/idl/raydium_cp_swap';
import { Connection, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Keypair, sendAndConfirmTransaction, Transaction } from '@solana/web3.js';
import { Program, AnchorProvider, BN, utils } from '@project-serum/anchor';
import { getAmmConfigAddress, getAuthAddress, getPoolAddress, getPoolLpMintAddress, getPoolVaultAddress, getOrcleAccountAddress } from '@/utils/pda'
import { getOrCreateAssociatedTokenAccount, getAccount, createAssociatedTokenAccountInstruction, createSyncNativeInstruction, NATIVE_MINT, getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID, createCloseAccountInstruction, TokenAccountNotFoundError, TokenInvalidAccountOwnerError } from "@solana/spl-token";
import { ASSOCIATED_PROGRAM_ID } from '@project-serum/anchor/dist/cjs/utils/token'
import { eclipseTokenList } from '@/utils/eclipseTokenList'
import Decimal from 'decimal.js'
import dayjs from 'dayjs'
import axios from 'axios'
import { tokensPrices } from '@/utils/tokenInfo'
import dexConfig from '@/config/config'

export default function Initialize() {
  const { t } = useTranslation()
  const wallet = useWallet();
  const tokenMap = useTokenStore((s) => s.tokenMap)
  const [inputMint, setInputMint] = useState<string>(PublicKey.default.toBase58())
  const [outputMint, setOutputMint] = useState<string>(RAYMint.toBase58())
  // const [baseToken, quoteToken] = [tokenMap.get(inputMint), tokenMap.get(outputMint)]
  const [baseToken, setBaseToken] = useState<TokenInfo | ApiV3Token | undefined>(undefined);
  const [quoteToken, setQuoteToken] = useState<TokenInfo | ApiV3Token | undefined>(undefined)

  // const [createPoolAct, newCreatedPool] = useLiquidityStore((s) => [s.createPoolAct, s.newCreatedPool], shallow)
  const [createdPoolAmm, setCreatePoolAmm] = useState(false);
  const [newCreatedPool, setNewCreatedPool] = useState<{ poolId: PublicKey } | null>(null)

  const [baseIn, setBaeIn] = useState(true)
  const [startDate, setStartDate] = useState<Date | undefined>()
  const { isOpen: isTxError, onOpen: onTxError, onClose: offTxError } = useDisclosure()
  const { isOpen: isLoading, onOpen: onLoading, onClose: offLoading } = useDisclosure()

  const { isOpen: isPopperOpen, onOpen: onPopperOpen, onClose: closePopper } = useDisclosure()
  const popperRef = useRef<HTMLDivElement>(null)
  const [popperElement, setPopperElement] = useState<HTMLDivElement | null>(null)
  const popper = usePopper(popperRef.current, popperElement, {
    placement: 'top-start'
  })
  const [tokenAmount, setTokenAmount] = useState<{ base: string; quote: string }>({ base: '', quote: '' })
  const [baseSymbol, quoteSymbol] = [wSolToSolString(baseToken?.symbol), wSolToSolString(quoteToken?.symbol)]

  // TODO: fee configs
  const cpmmFeeConfigs = useLiquidityStore((s) => s.cpmmFeeConfigs)
  const clmmFeeOptions = Object.values(cpmmFeeConfigs)
  const poolKey = `${baseSymbol}-${quoteSymbol}`
  const [currentConfig, setCurrentConfig] = useState<ApiCpmmConfigInfo | undefined>()

  const { data: tokenPrices = {}, isLoading: isPriceLoading } = useBirdeyeTokenPrice({
    mintList: [inputMint, outputMint]
  })

  const { data } = useFetchPoolByMint({
    shouldFetch: !!inputMint && !!outputMint,
    mint1: inputMint ? solToWSol(inputMint).toString() : '',
    mint2: outputMint ? solToWSol(outputMint || '').toString() : '',
    type: PoolFetchType.Standard
  })

  const existingPools: Map<string, string> = useMemo(
    () =>
      (data || [])
        .filter((pool) => {
          const [token1Mint, token2Mint] = [
            inputMint ? solToWSol(inputMint).toString() : '',
            outputMint ? solToWSol(outputMint || '').toString() : ''
          ]
          return (
            pool.programId === CREATE_CPMM_POOL_PROGRAM.toBase58() &&
            ((pool.mintA?.address === token1Mint && pool.mintB?.address === token2Mint) ||
              (pool.mintA?.address === token2Mint && pool.mintB?.address === token1Mint))
          )
        })
        .reduce((acc, cur) => acc.set(cur.id, (cur as unknown as ApiV3PoolInfoStandardItemCpmm).config.id), new Map()),
    [inputMint, outputMint, data]
  )

  const isSelectedExisted = !!currentConfig && new Set(existingPools.values()).has(currentConfig.id)
  useEffect(() => () => setCurrentConfig(undefined), [poolKey, isSelectedExisted])
  useEffect(() => {
    const defaultConfig = Object.values(cpmmFeeConfigs || {}).find((c) => c.tradeFeeRate === 2500)
    if (!new Set(existingPools.values()).has(defaultConfig?.id || '')) {
      if (defaultConfig) setCurrentConfig(defaultConfig)
      return
    }
  }, [poolKey, existingPools, cpmmFeeConfigs])

  const [startDateMode, setStartDateMode] = useState<'now' | 'custom'>('now')
  const isStartNow = startDateMode === 'now'

  const initialPrice =
    new Decimal(tokenAmount.base || 0).lte(0) || new Decimal(tokenAmount.quote || 0).lte(0)
      ? ''
      : new Decimal(tokenAmount[baseIn ? 'quote' : 'base'] || 0)
        .div(tokenAmount[baseIn ? 'base' : 'quote'] || 1)
        .toDecimalPlaces(baseToken?.decimals ?? 6)
        .toString()

  const currentPrice =
    !tokensPrices[eclipseTokenList.filter(i => i.key === inputMint)[0]?.value.symbol] || !tokensPrices[eclipseTokenList.filter(i => i.key === outputMint)[0]?.value.symbol]
      ? ''
      : new Decimal(tokensPrices[baseIn ? eclipseTokenList.filter(i => i.key === inputMint)[0]?.value.symbol : eclipseTokenList.filter(i => i.key === outputMint)[0]?.value.symbol].price || 0)
        .div(tokensPrices[baseIn ? eclipseTokenList.filter(i => i.key === outputMint)[0]?.value.symbol : eclipseTokenList.filter(i => i.key === inputMint)[0]?.value.symbol].price || 1)
        .toDecimalPlaces(baseToken?.decimals ?? 6)
        .toString()

  const error = useInitPoolSchema({ baseToken, quoteToken, tokenAmount, startTime: startDate, feeConfig: currentConfig })

  useEffect(() => () => useLiquidityStore.setState({ newCreatedPool: undefined }), [])

  const handleSelectToken = useCallback(
    (token: TokenInfo | ApiV3Token, side?: 'input' | 'output') => {
      if (side === 'input') {
        setInputMint(token.address)
        setOutputMint((mint) => (token.address === mint ? '' : mint))
        setBaseToken(token)
        if (token.address === quoteToken?.address) {
          setQuoteToken(undefined)
        }
      }
      if (side === 'output') {
        setOutputMint(token.address)
        setInputMint((mint) => (token.address === mint ? '' : mint))
        setQuoteToken(token)
        if (token.address === baseToken?.address) {
          setBaseToken(undefined)
        }
      }
    },
    [inputMint, outputMint]
  )

  const anchorWallet = useMemo(() => {
    if (!wallet.publicKey || !wallet.signTransaction || !wallet.signAllTransactions) return null;
    return {
      publicKey: wallet.publicKey,
      signTransaction: wallet.signTransaction.bind(wallet),
      signAllTransactions: wallet.signAllTransactions.bind(wallet),
    };
  }, [wallet]);

  const unWrapSol = async () => {
    if (!anchorWallet) return;
    try {
      const connection = new Connection(dexConfig.network, 'confirmed');

      let ata = getAssociatedTokenAddressSync(
        NATIVE_MINT, // mint
        anchorWallet?.publicKey // owner
      );

      const unwrapTransaction = new Transaction().add(
        createCloseAccountInstruction(
          ata,
          anchorWallet.publicKey,
          anchorWallet.publicKey
        )
      );
      const signature = await wallet.sendTransaction(unwrapTransaction, connection)
      console.log(`Unwrap eth ${signature}`)

    } catch (error) {
      console.log(`Unwrap eth: ${error}`)
    }
  }

  const makeWETH = async (tokenOrder: string) => {
    if (!anchorWallet) return
    const connection = new Connection(dexConfig.network, 'confirmed');

    try {
      let ata = getAssociatedTokenAddressSync(
        NATIVE_MINT, // mint
        anchorWallet?.publicKey // owner
      );

      const ataInfo = await connection.getAccountInfo(ata);

      if (!ataInfo) { //  don't exist token account
        let tx = new Transaction().add(
          createAssociatedTokenAccountInstruction(
            anchorWallet.publicKey,
            ata,
            anchorWallet.publicKey,
            NATIVE_MINT
          ),
          // trasnfer SOL
          SystemProgram.transfer({
            fromPubkey: anchorWallet.publicKey,
            toPubkey: ata,
            lamports: tokenOrder === "base" ? Math.floor(parseFloat(tokenAmount.base) * 1e9) : Math.floor(parseFloat(tokenAmount.quote) * 1e9),
          }),
          // sync wrapped SOL balance
          createSyncNativeInstruction(ata, TOKEN_PROGRAM_ID)
        );
        await wallet.sendTransaction(tx, connection);
      }
      else { // when exist token account,
        let tx = new Transaction().add(
          // trasnfer SOL
          SystemProgram.transfer({
            fromPubkey: anchorWallet.publicKey,
            toPubkey: ata,
            lamports: tokenOrder === "base" ? Math.floor(parseFloat(tokenAmount.base) * 1e9) : Math.floor(parseFloat(tokenAmount.quote) * 1e9),
          }),
          // sync wrapped SOL balance
          createSyncNativeInstruction(ata, TOKEN_PROGRAM_ID)
        );
        await wallet.sendTransaction(tx, connection);
      }

    } catch (error) {
      console.log(error)
    }
  }

  const onInitializeClick = async () => {
    if (!anchorWallet) return;
    if (!tokenAmount.base || !tokenAmount.quote) return;
    if (!baseToken || !quoteToken) return;
    onLoading()

    const connection = new Connection(dexConfig.network, 'confirmed');
    const provider = new AnchorProvider(connection, anchorWallet, AnchorProvider.defaultOptions());
    const programId = new PublicKey(dexConfig.programId);
    const program = new Program(IDL, programId, provider);

    try {
      let config_index = 2;
      let tradeFeeRate = new BN(10)
      let protocolFeeRate = new BN(1000)
      let fundFeeRate = new BN(25000)
      let create_fee = new BN(0)

      const [ammConfigPDA] = await getAmmConfigAddress(config_index, program.programId);
      const info = await connection.getAccountInfo(ammConfigPDA);
      if (info == null || info.data.length == 0) {
        await program.methods
          .createAmmConfig(
            config_index,
            tradeFeeRate,
            protocolFeeRate,
            fundFeeRate,
            create_fee
          )
          .accounts({
            owner: anchorWallet.publicKey,
            ammConfig: ammConfigPDA,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
      }

      if (baseToken.address.toString() === NATIVE_MINT.toString()) {
        await makeWETH("base");
      }
      else if (quoteToken.address.toString() === NATIVE_MINT.toString()) {
        await makeWETH("quote");
      }

      const token0 = new PublicKey(baseToken.address)
      const token1 = new PublicKey(quoteToken.address)

      const [auth] = await getAuthAddress(program.programId);
      const [poolAddress] = await getPoolAddress(
        ammConfigPDA,
        token0,
        token1,
        program.programId
      );
      const [lpMintAddress] = await getPoolLpMintAddress(
        poolAddress,
        program.programId
      );
      const [vault0] = await getPoolVaultAddress(
        poolAddress,
        token0,
        program.programId
      );
      const [vault1] = await getPoolVaultAddress(
        poolAddress,
        token1,
        program.programId
      );
      const [creatorLpTokenAddress] = await PublicKey.findProgramAddress(
        [
          anchorWallet.publicKey.toBuffer(),
          TOKEN_PROGRAM_ID.toBuffer(),
          lpMintAddress.toBuffer(),
        ],
        ASSOCIATED_PROGRAM_ID
      );

      const [observationAddress] = await getOrcleAccountAddress(
        poolAddress,
        program.programId
      );

      const creatorToken0 = getAssociatedTokenAddressSync(
        token0,
        anchorWallet.publicKey,
        false,
        new PublicKey(baseToken.programId)
      );
      const creatorToken1 = getAssociatedTokenAddressSync(
        token1,
        anchorWallet.publicKey,
        false,
        new PublicKey(quoteToken.programId)
      );
      // const confirmOptions = {
      //   skipPreflight: true,
      // };

      await program.methods
        .initialize(new BN(parseFloat(tokenAmount.base) * Math.pow(10, eclipseTokenList.filter(i => i.key === token0.toString())[0].value.decimals)), new BN(parseFloat(tokenAmount.quote) * Math.pow(10, eclipseTokenList.filter(i => i.key === token1.toString())[0].value.decimals)), new BN(0))
        .accounts({
          creator: anchorWallet.publicKey,
          ammConfig: ammConfigPDA,
          authority: auth,
          poolState: poolAddress,
          token0Mint: token0,
          token1Mint: token1,
          lpMint: lpMintAddress,
          creatorToken0,
          creatorToken1,
          creatorLpToken: creatorLpTokenAddress,
          token0Vault: vault0,
          token1Vault: vault1,
          // createPoolFee: new PublicKey("HtPorWESXkST2NLsq7CkjvGSeF4JkvXFvtE8S7MtKeXZ"),
          observationState: observationAddress,
          tokenProgram: TOKEN_PROGRAM_ID,
          token0Program: new PublicKey(baseToken.programId),
          token1Program: new PublicKey(quoteToken.programId),
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .rpc();

      let token0Value = eclipseTokenList.filter(item => item.key === token0.toString())[0].value;
      let token1Value = eclipseTokenList.filter(item => item.key === token1.toString())[0].value;

      axios.post(`http://62.3.6.226:8080/epsapi/savePoolInfo`, {
        id: poolAddress.toString(),
        mintA: `101,${token0.toString()},${token0Value.programId},${token0Value.logoURI},${token0Value.symbol},${token0Value.name},${token0Value.decimals}`,
        mintB: `101,${token1.toString()},${token0Value.programId},${token1Value.logoURI},${token1Value.symbol},${token1Value.name},${token1Value.decimals}`
      }).then(function (_response) {
        setNewCreatedPool({ poolId: poolAddress })
        offLoading()
      })

    } catch (error) {
      console.error("Initialize error:", error);
      unWrapSol();
      offLoading()
    }

    // createPoolAct({
    //   pool: {
    //     mintA: solToWSolToken(baseToken!),
    //     mintB: solToWSolToken(quoteToken!),
    //     feeConfig: currentConfig!
    //   },
    //   baseAmount: new Decimal(tokenAmount.base).mul(10 ** baseToken!.decimals).toFixed(0),
    //   quoteAmount: new Decimal(tokenAmount.quote).mul(10 ** quoteToken!.decimals).toFixed(0),
    //   startTime: startDate,
    //   onError: onTxError,
    //   onFinally: offLoading
    // })
  }

  return (
    <VStack borderRadius="20px" w="full" bg={colors.backgroundLight} p={6} spacing={5}>
      {/* initial liquidity */}
      <Flex direction="column" w="full" align={'flex-start'} gap={4}>
        <Text fontWeight="medium" fontSize="sm">
          {t('create_standard_pool.initial_liquidity')}
        </Text>
        <Flex direction="column" w="full" align={'center'}>
          <TokenInput
            ctrSx={{ w: '100%', textColor: colors.textTertiary }}
            topLeftLabel={t('common.base_token')}
            token={baseToken ? wsolToSolToken(baseToken) : undefined}
            value={tokenAmount.base}
            onChange={(val) => setTokenAmount((prev) => ({ ...prev, base: val }))}
            onTokenChange={(token) => handleSelectToken(token, 'input')}
          />
          <Box my={'-10px'} zIndex={1}>
            <AddLiquidityPlus />
          </Box>
          <TokenInput
            ctrSx={{ w: '100%', textColor: colors.textTertiary }}
            topLeftLabel={t('common.quote_token')}
            token={quoteToken ? wsolToSolToken(quoteToken) : undefined}
            value={tokenAmount.quote}
            onChange={(val) => setTokenAmount((prev) => ({ ...prev, quote: val }))}
            onTokenChange={(token) => handleSelectToken(token, 'output')}
          />
        </Flex>
      </Flex>

      <Flex direction="column" w="full" align={'flex-start'} gap={3}>
        <HStack gap={1}>
          <Text fontWeight="medium" fontSize="sm">
            {t('clmm.initial_price')}
          </Text>
          <QuestionToolTip iconType="question" label={t('create_standard_pool.initial_price_tooltip')} />
        </HStack>
        <DecimalInput
          postFixInField
          variant="filledDark"
          readonly
          value={initialPrice}
          inputSx={{ pl: '4px', fontWeight: 500, fontSize: ['md', 'xl'] }}
          ctrSx={{ bg: colors.backgroundDark, borderRadius: 'xl', pr: '14px', py: '6px' }}
          inputGroupSx={{ w: '100%', bg: colors.backgroundDark, alignItems: 'center', borderRadius: 'xl' }}
          postfix={
            <Text variant="label" size="sm" whiteSpace="nowrap" color={colors.textTertiary}>
              {baseIn ? quoteSymbol : baseSymbol}/{baseIn ? baseSymbol : quoteSymbol}
            </Text>
          }
        />
        <HStack spacing={1}>
          <Text fontWeight="400" fontSize="sm" color={colors.textTertiary}>
            {t('create_standard_pool.current_price')}:
          </Text>
          <Text pl={1} fontSize="sm" color={colors.textSecondary} fontWeight="medium" display="flex" alignItems={'center'} gap={1}>
            1 {baseIn ? baseSymbol : quoteSymbol} ≈ {isPriceLoading ? <Skeleton width={14} height={4} /> : currentPrice || '-'}{' '}
            {baseIn ? quoteSymbol : baseSymbol}
          </Text>
          <Box
            padding="1px"
            border={`1px solid ${colors.secondary}`}
            borderRadius="2px"
            width={'fit-content'}
            height={'fit-content'}
            lineHeight={0}
          >
            <HorizontalSwitchSmallIcon fill={colors.secondary} cursor="pointer" onClick={() => setBaeIn((val) => !val)} />
          </Box>
        </HStack>
      </Flex>
      <Flex direction="column" w="full" align={'flex-start'} gap={3}>
        <Text fontWeight="medium" fontSize="sm">
          {t('field.fee_tier')}
        </Text>
        <Flex w="full" gap="2">
          <Select
            variant="filledDark"
            items={clmmFeeOptions}
            value={currentConfig}
            renderItem={(v, idx) => {
              if (v) {
                const existed = new Set(existingPools.values()).has(v.id)
                const selected = currentConfig?.id === v.id
                const isLastItem = idx === clmmFeeOptions.length - 1
                return (
                  <HStack
                    color={colors.textPrimary}
                    opacity={existed ? 0.5 : 1}
                    cursor={existed ? 'not-allowed' : 'pointer'}
                    justifyContent="space-between"
                    mx={4}
                    py={2.5}
                    fontSize="sm"
                    borderBottom={isLastItem ? 'none' : `1px solid ${colors.buttonBg01}`}
                    _hover={{
                      borderBottom: '1px solid transparent'
                    }}
                  >
                    <Text>{percentFormatter.format(v.tradeFeeRate / 1000000)}</Text>
                    {selected && <SubtractIcon />}
                  </HStack>
                )
              }
              return null
            }}
            renderTriggerItem={(v) => (v ? <Text fontSize="sm">{percentFormatter.format(v.tradeFeeRate / 1000000)}</Text> : null)}
            onChange={(val) => {
              setCurrentConfig(val)
              const existed = new Set(existingPools.values()).has(val.id)
              const selected = currentConfig?.id === val.id
              !existed && !selected && setCurrentConfig(val)
            }}
            sx={{
              w: 'full',
              height: '42px'
            }}
            popoverContentSx={{
              border: `1px solid ${colors.selectInactive}`,
              py: 0
            }}
            popoverItemSx={{
              p: 0,
              lineHeight: '18px',
              _hover: {
                bg: colors.modalContainerBg
              }
            }}
            icons={{
              open: <ChevronUp color={colors.textSecondary} opacity="0.5" />,
              close: <ChevronDown color={colors.textSecondary} opacity="0.5" />
            }}
          />
        </Flex>
      </Flex>
      {/* start time */}
      {/* <Flex direction="column" w="full" gap={3}>
        <Text fontWeight="medium" textAlign="left" fontSize="sm">
          {t('field.start_time')}:
        </Text>
        <Tabs
          w="full"
          tabListSX={{ display: 'flex' }}
          tabItemSX={{ flex: 1, fontWeight: 400, fontSize: '12px', py: '4px' }}
          variant="squarePanelDark"
          value={startDateMode}
          onChange={(val) => {
            setStartDateMode(val)
            if (val === 'now') setStartDate(undefined)
            else setStartDate(dayjs().add(10, 'minutes').toDate())
          }}
          items={[
            {
              value: 'now',
              label: t('create_standard_pool.start_now')
            },
            {
              value: 'custom',
              label: t('create_standard_pool.custom')
            }
          ]}
        />
        {isStartNow ? null : (
          <div ref={popperRef}>
            <DecimalInput
              postFixInField
              readonly
              onClick={onPopperOpen}
              variant="filledDark"
              value={startDate ? dayjs(startDate).format('YYYY/MM/DD') : ''}
              ctrSx={{ bg: colors.backgroundDark, borderRadius: 'xl', pr: '14px', py: '6px' }}
              inputGroupSx={{ w: 'fit-content', bg: colors.backgroundDark, alignItems: 'center', borderRadius: 'xl' }}
              inputSx={{ pl: '4px', fontWeight: 500, fontSize: ['md', 'xl'] }}
              postfix={
                <Text variant="label" size="sm" whiteSpace="nowrap" fontSize="xl" color={colors.textSecondary}>
                  {startDate ? dayjs(startDate).utc().format('HH:mm (UTC)') : ''}
                </Text>
              }
            />
            {isPopperOpen && (
              <FocusTrap
                active
                focusTrapOptions={{
                  initialFocus: false,
                  allowOutsideClick: true,
                  clickOutsideDeactivates: true,
                  onDeactivate: closePopper
                }}
              >
                <Box
                  tabIndex={-1}
                  style={{
                    ...popper.styles.popper,
                    zIndex: 3
                  }}
                  className="dialog-sheet"
                  {...popper.attributes.popper}
                  ref={setPopperElement}
                  role="dialog"
                  aria-label="DayPicker calendar"
                  bg={colors.backgroundDark}
                  rounded={'xl'}
                >
                  <DatePick
                    initialFocus={isPopperOpen}
                    mode="single"
                    selected={startDate || new Date()}
                    onSelect={(val) =>
                      setStartDate((preVal) =>
                        dayjs(val)
                          .set('hour', dayjs(preVal).hour())
                          .set(
                            'minute',
                            dayjs(preVal)
                              .add(preVal ? 0 : 10, 'minutes')
                              .minute()
                          )
                          .toDate()
                      )
                    }
                  />
                  <Flex>
                    <HourPick
                      sx={{ w: '100%', borderRadius: '0', fontSize: 'md', px: '20px' }}
                      value={dayjs(startDate).hour()}
                      onChange={(h) => setStartDate((val) => dayjs(val).set('h', h).toDate())}
                    />
                    <MinutePick
                      sx={{ w: '100%', borderRadius: '0', fontSize: 'md', px: '20px' }}
                      value={dayjs(startDate).minute()}
                      onChange={(m) => setStartDate((val) => dayjs(val).set('m', m).toDate())}
                    />
                  </Flex>
                  <Flex bg={colors.backgroundDark} px="10px" justifyContent="flex-end" borderRadius="0 0 10px 10px">
                    <Button variant="outline" size="sm" onClick={closePopper}>
                      {t('button.confirm')}
                    </Button>
                  </Flex>
                </Box>
              </FocusTrap>
            )}
          </div>
        )}
        <HStack color={colors.semanticWarning}>
          <Text fontWeight="medium" fontSize="sm" my="-2">
            {t('create_standard_pool.pool_creation_fee_note', { subject: '~0.2' })}
          </Text>
          <QuestionToolTip iconType="question" label={t('create_standard_pool.pool_creation_fee_tooltip')} />
        </HStack>
        <Text color="red" my="-2">
          {tokenAmount.base || tokenAmount.quote ? error : ''}
        </Text>
      </Flex> */}
      <HStack w="full" spacing={4} mt={2}>
        <Button w="full" isLoading={isLoading} isDisabled={false} onClick={onInitializeClick}>
          {t('create_standard_pool.button_initialize_liquidity_pool')}
        </Button>
      </HStack>
      {newCreatedPool ? <CreateSuccessModal ammId={newCreatedPool.poolId.toString()} /> : null}
      <TxErrorModal description="Failed to create pool. Please try again later." isOpen={isTxError} onClose={offTxError} />
    </VStack>
  )
}
