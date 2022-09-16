import LRU from 'lru-cache'

export const apiSsrCache = new LRU({
  max: 500,
  ttl: 1000 * 60 * 10 // 5 mins
})
