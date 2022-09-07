import { parseTokenAccountResp, TokenAccount, TokenAccountRaw, parseNumberInfo, Fraction } from '@raydium-io/raydium-sdk'
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
  getTokenBalanceUiAmount: (mint: string, decimals?: number) => string
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
      const tokenInfo = useTokenStore.getState().tokenMap.get(mint)
      const tokenDecimal = decimals || tokenInfo?.decimals || 0
      const tokenAccount = get().tokenAccountMap.get(mint)?.[0]
      if (!tokenAccount) return ''
      if (!tokenInfo && !decimals) return '0'
      const numberDetails = parseNumberInfo(tokenAccount.amount)
      return new Fraction(numberDetails.numerator, numberDetails.denominator).div(new BN(10 ** tokenDecimal)).toSignificant(tokenDecimal)
    }
  }),
  'useTokenAccountStore'
)
