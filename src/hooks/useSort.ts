import { useState, useCallback } from 'react'

interface Prop {
  defaultKey?: string
  defaultOrder?: 0 | 1
}

export default function useSort({ defaultKey, defaultOrder }: Prop) {
  const [sortKey, setSortKey] = useState<string>(defaultKey || '')
  const [order, setOrder] = useState<number>(defaultOrder || 1) // 0 for ascending, 1 for descending

  const sortFn = useCallback(
    (list: any[]) =>
      list?.sort((a: any, b: any) => {
        if (typeof a[sortKey] !== 'number' || typeof b[sortKey] !== 'number') return -1
        return (a[sortKey] - b[sortKey]) * Math.pow(-1, order)
      }),
    [sortKey, order]
  )

  const onChangeSortData = useCallback(
    (key: string) => {
      if (key === sortKey) {
        setOrder((order) => (order ? 0 : 1))
        return
      }
      setSortKey(key)
      setOrder(1)
    },
    [sortKey]
  )

  return {
    order,
    sortKey,
    onChangeSortData,
    sortFn
  }
}
