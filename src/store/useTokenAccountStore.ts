import { parseTokenAccountResp, TokenAccount, TokenAccountRaw, parseNumberInfo, Fraction, WSOLMint } from '@raydium-io/raydium-sdk'
import { Connection, PublicKey } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import createStore from './createStore'
import { useTokenStore } from './useTokenStore'
import BN from 'bn.js'

interface TokenAccountStore {
  tokenAccounts: TokenAccount[]
  tokenAccountRawInfos: TokenAccountRaw[]
  tokenAccountMap: Map<string, TokenAccount[]>

  fetchTokenAccountAct: (params: { connection: Connection; owner: PublicKey }) => Promise<void>
  getTokenBalanceUiAmount: (mint: string, decimals?: number) => { amount: Fraction; text: string; gte: (val: string) => boolean }
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
    getTokenBalanceUiAmount: (mint, decimals) => {
      const defaultVal = { amount: new Fraction(0, 1), text: '0', gte: () => false }
      const tokenInfo = useTokenStore.getState().tokenMap.get(mint)
      const tokenDecimal = decimals || tokenInfo?.decimals || 0
      const tokenAccount = get().tokenAccountMap.get(mint)?.[0]
      if (!tokenAccount) return defaultVal
      if (!tokenInfo && !decimals) return defaultVal

      let amount = tokenAccount.amount
      // wsol might have lots of ata, so sum them up
      if (mint === WSOLMint.toBase58()) {
        amount = new BN(0)
        get()
          .tokenAccountMap.get(mint)!
          .forEach((acc) => {
            amount = amount.add(acc.amount)
          })
      }

      const numberDetails = parseNumberInfo(amount)
      const f = new Fraction(numberDetails.numerator, numberDetails.denominator).div(new BN(10 ** tokenDecimal))
      return {
        amount: f,
        text: f.toSignificant(tokenDecimal),
        gte: (val: string) => {
          return !!val && Number(f.toSignificant(tokenDecimal)) > Number(val)
        }
      }
    }
  }),
  'useTokenAccountStore'
)
