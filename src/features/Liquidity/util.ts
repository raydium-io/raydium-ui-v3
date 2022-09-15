export const SIDE = {
  BASE: 'base',
  QUOTE: 'quote'
}

const CACHE_KEY = '_ray_liq_'

export interface PairData {
  baseMint: string
  quoteMint: string
}
export const getPairCache = (): PairData => {
  if (typeof window === 'undefined') return { baseMint: '', quoteMint: '' }
  const cache = localStorage.getItem(CACHE_KEY)
  return cache ? JSON.parse(cache) : { baseMint: '', quoteMint: '' }
}

export const setPairCache = (params: Partial<PairData>) => {
  if (typeof window === 'undefined') return
  const currentCache = getPairCache()
  localStorage.setItem(
    CACHE_KEY,
    JSON.stringify({
      ...currentCache,
      ...params
    })
  )
}
