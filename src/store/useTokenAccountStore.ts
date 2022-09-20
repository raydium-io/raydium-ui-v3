import { parseTokenAccountResp, TokenAccount, TokenAccountRaw, parseNumberInfo, BN_ZERO, WSOLMint } from 'test-raydium-sdk-v2'
import { Connection, PublicKey } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import createStore from './createStore'
import { useTokenStore } from './useTokenStore'
import { useLiquidityStore } from './useLiquidityStore'
import Big from 'big.js'

export interface TokenAccountStore {
  tokenAccounts: TokenAccount[]
  tokenAccountRawInfos: TokenAccountRaw[]
  tokenAccountMap: Map<string, TokenAccount[]>

  fetchTokenAccountAct: (params: { connection: Connection; owner: PublicKey }) => Promise<void>
  getTokenBalanceUiAmount: (params: { mint: string; decimals?: number; isLpToken?: boolean }) => {
    amount: Big
    decimals: number
    text: string
    isZero: boolean
    gt: (val: string) => boolean
  }
}

const initTokenAccountSate = {
  tokenAccounts: [],
  tokenAccountRawInfos: [],
  tokenAccountMap: new Map()
}

export const useTokenAccountStore = createStore<TokenAccountStore>(
  (set, get) => ({
    ...initTokenAccountSate,
    fetchTokenAccountAct: async ({ connection, owner }) => {
      const solAccountResp = await connection.getAccountInfo(owner)
      const tokenAccountResp = await connection.getTokenAccountsByOwner(owner, { programId: TOKEN_PROGRAM_ID })
      const tokenAccountData = parseTokenAccountResp({
        solAccountResp,
        tokenAccountResp
      })

      const tokenAccountMap: Map<string, TokenAccount[]> = new Map()
      tokenAccountData.tokenAccounts.forEach((tokenAccount) => {
        const mintStr = tokenAccount.mint?.toBase58()
        if (!tokenAccountMap.has(mintStr)) {
          tokenAccountMap.set(mintStr, [tokenAccount])
          return
        }
        tokenAccountMap.get(mintStr)!.push(tokenAccount)
      })

      tokenAccountMap.forEach((tokenAccount) => {
        tokenAccount.sort((a, b) => (a.amount.lt(b.amount) ? 1 : -1))
      })
      set({ ...tokenAccountData, tokenAccountMap }, false, { type: 'fetchTokenAccountAct' })

      const tokenList = useTokenStore.getState().tokenList.sort((tokenA, tokenB) => {
        const accountA = tokenAccountMap.get(tokenA.mint)
        const accountB = tokenAccountMap.get(tokenB.mint)
        return (accountB?.[0].amount.toNumber() || Number.MIN_VALUE) - (accountA?.[0].amount.toNumber() || Number.MIN_VALUE)
      })
      useTokenStore.setState({ tokenList: JSON.parse(JSON.stringify(tokenList)) }, false, { type: 'fetchTokenAccountAct' })
    },
    getTokenBalanceUiAmount: ({ mint, decimals, isLpToken }) => {
      const defaultVal = { amount: new Big(0), text: '0', decimals: 0, isZero: true, gt: () => false }
      const tokenInfo = isLpToken ? useLiquidityStore.getState().lpTokenMap.get(mint) : useTokenStore.getState().tokenMap.get(mint)
      const tokenDecimal = decimals || tokenInfo?.decimals || 0
      const tokenAccount = get().tokenAccountMap.get(mint)?.[0]
      if (!tokenAccount) return defaultVal
      if (!tokenInfo && !decimals) return defaultVal

      let amount = tokenAccount.amount
      // wsol might have lots of ata, so sum them up
      if (mint === WSOLMint.toBase58()) {
        amount = BN_ZERO.clone()
        get()
          .tokenAccountMap.get(mint)!
          .forEach((acc) => {
            amount = amount.add(acc.amount)
          })
      }

      const numberDetails = parseNumberInfo(amount)
      Big.DP = tokenDecimal
      const balanceBig = new Big(numberDetails.numerator).div(new Big(numberDetails.denominator)).div(10 ** tokenDecimal)
      return {
        amount: balanceBig,
        decimals: tokenDecimal,
        text: balanceBig.toString(),
        isZero: balanceBig.eq(0),
        gt: (val: string) => !!val && balanceBig.gt(val)
      }
    }
  }),
  'useTokenAccountStore'
)
