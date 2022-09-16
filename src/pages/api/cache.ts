// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import LRU from 'lru-cache'

const farmCache = new LRU({
  max: 500,
  ttl: 1000 * 60 * 30
})

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    farmCache.set('farm', req.body)
    res.status(200).json({ farms: req.body })
  }
  if (req.method === 'GET') {
    res.status(200).json({ farms: farmCache.get('farm') || [] })
    return
  }
  res.status(200).json({ data: '' })
}
