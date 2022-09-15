import { useFarmStore } from '@/store/useFarmStore'

export default function Staking() {
  const s = useFarmStore((s) => s.hydratedFarms)
  console.log(123123, s)
  return <>staking</>
}
