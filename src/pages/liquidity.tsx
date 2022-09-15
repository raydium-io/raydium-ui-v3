import { useEffect } from 'react'

import { useAppStore } from '../store'
import { useLiquidityStore } from '../store/useLiquidityStore'
import Liquidity from '../features/Liquidity'

function LiquidityPage() {
  const loadPoolsAct = useLiquidityStore((s) => s.loadPoolsAct)
  const raydium = useAppStore((s) => s.raydium)

  useEffect(() => {
    if (!raydium) return
    loadPoolsAct()
  }, [raydium])

  return <Liquidity />
}

export default LiquidityPage
