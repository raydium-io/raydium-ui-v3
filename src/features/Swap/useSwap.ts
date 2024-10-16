import { TxVersion, solToWSol } from '@raydium-io/raydium-sdk-v2'
import axios from '@/api/axios'
import { useAppStore } from '@/store'
import { useSwapStore } from './useSwapStore'
import useSWR from 'swr'
import shallow from 'zustand/shallow'
import { useCallback, useEffect, useState, useMemo } from 'react'
import { debounce } from '@/utils/functionMethods'
import Decimal from 'decimal.js'
import { ApiSwapV1OutSuccess, ApiSwapV1OutError } from './type'
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { Program, AnchorProvider, BN, utils } from '@project-serum/anchor';
import { IDL } from '@/idl/raydium_cp_swap'
import { getAmmConfigAddress, getAuthAddress, getPoolAddress, getPoolLpMintAddress, getPoolVaultAddress, getOrcleAccountAddress } from '@/utils/pda'

const fetcher = async (url: string): Promise<ApiSwapV1OutSuccess | ApiSwapV1OutError> =>
  axios.get(url, {
    skipError: true
  })

export default function useSwap(props: {
  shouldFetch?: boolean
  inputMint?: string
  outputMint?: string
  amount?: string
  refreshInterval?: number
  slippageBps?: number
  swapType: 'BaseIn' | 'BaseOut'
}) {
  const wallet = useWallet();
  const {
    inputMint: propInputMint = '',
    outputMint: propOutputMint = '',
    amount: propsAmount,
    slippageBps: propsSlippage,
    swapType,
    refreshInterval = 30 * 1000
  } = props || {}

  const [amount, setAmount] = useState('')
  const [inputMint, outputMint] = [
    propInputMint ? solToWSol(propInputMint).toBase58() : propInputMint,
    propOutputMint ? solToWSol(propOutputMint).toBase58() : propOutputMint
  ]

  const [txVersion, urlConfigs] = useAppStore((s) => [s.txVersion, s.urlConfigs], shallow)
  const slippage = useSwapStore((s) => s.slippage)
  const slippageBps = new Decimal(propsSlippage || slippage * 10000).toFixed(0)

  const apiTrail = swapType === 'BaseOut' ? 'swap-base-out' : 'swap-base-in'
  const url =
    inputMint && outputMint && !new Decimal(amount.trim() || 0).isZero()
      ? `${urlConfigs.SWAP_HOST}${urlConfigs.SWAP_COMPUTE
      }${apiTrail}?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippageBps}&txVersion=${txVersion === TxVersion.V0 ? 'V0' : 'LEGACY'
      }`
      : null

  const updateAmount = useCallback(
    debounce((val: string) => {
      setAmount(val)
    }, 200),
    []
  )

  useEffect(() => {
    updateAmount(propsAmount)
  }, [propsAmount, updateAmount])

  const { data, error, ...swrProps } = useSWR(() => url, fetcher, {
    refreshInterval,
    focusThrottleInterval: refreshInterval,
    dedupingInterval: 30 * 1000
  })

  const anchorWallet = useMemo(() => {
    if (!wallet.publicKey || !wallet.signTransaction || !wallet.signAllTransactions) return null;
    return {
      publicKey: wallet.publicKey,
      signTransaction: wallet.signTransaction.bind(wallet),
      signAllTransactions: wallet.signAllTransactions.bind(wallet),
    };
  }, [wallet]);


  const getPoolInfo = async () => {

    // const connection = new Connection("https://testnet.dev2.eclipsenetwork.xyz", 'confirmed');
    // const provider = new AnchorProvider(connection, anchorWallet, AnchorProvider.defaultOptions());
    // const programId = new PublicKey('8PzREVMxRooeR2wbihZdp2DDTQMZkX9MVzfa8ZV615KW');
    // const program = new Program(IDL, programId, provider);

    // // 
    // const inputToken = new PublicKey(inputMint);
    // const outputToken = new PublicKey(outputMint);
    // const inputTokenProgram = TOKEN_PROGRAM_ID;
    // const outputTokenProgram = TOKEN_PROGRAM_ID;
    // const inputTokenAccountAddr = getAssociatedTokenAddressSync(
    //   inputToken,
    //   anchorWallet.publicKey,
    //   false,
    //   inputTokenProgram
    // );
    // const inputTokenAccountBefore = await getAccount(
    //   connection,
    //   inputTokenAccountAddr,
    //   "processed",
    //   inputTokenProgram
    // );

    // //
    // let amount_in = isSwapBaseIn ? new BN(parseFloat(amountIn) * 100_000_000) : new BN(parseFloat(inputAmount) * 100_000_000);
    // let amount_out = isSwapBaseIn ? new BN(parseFloat(outputAmount) * 100_000_000) : new BN(parseFloat(amountIn) * 100_000_000);

    // console.log(amountIn)
    // console.log(inputAmount)
    // console.log(amount_in)

    // console.log(outputAmount)
    // console.log(amountIn)
    // console.log(amount_out)

    // let config_index = 0;

    // const [address, _] = await getAmmConfigAddress(
    //   config_index,
    //   program.programId
    // );
    // const configAddress = address;

    // const [auth] = await getAuthAddress(program.programId);
    // const [poolAddress] = await getPoolAddress(
    //   configAddress,
    //   inputToken,
    //   outputToken,
    //   program.programId
    // );

  }

  return {
    response: data,
    data: data?.data,
    error: error?.message || data?.msg,
    openTime: data?.openTime,
    ...swrProps
  }
}
