import { WSOLMint, SOLMint } from '@raydium-io/raydium-sdk'

export const wSolToSol = (key?: string) => (key === WSOLMint.toBase58() ? SOLMint.toBase58() : key)
