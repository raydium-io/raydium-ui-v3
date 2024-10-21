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

  return {
    response: data,
    data: data?.data,
    error: error?.message || data?.msg,
    openTime: data?.openTime,
    ...swrProps
  }
}
