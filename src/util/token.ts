import { WSOLMint, SOLMint } from 'test-raydium-sdk-v2'

export const wSolToSol = (key?: string) => (key === WSOLMint.toBase58() ? SOLMint.toBase58() : key)
