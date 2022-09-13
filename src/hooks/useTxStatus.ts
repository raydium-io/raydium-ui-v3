import { useEffect } from 'react'
import { SignatureResult, Context } from '@solana/web3.js'
import { useAppStore } from '@/store/useAppStore'
import { Subject } from 'rxjs'
import { toastSubject } from './useGlobalToast'

export const txStatusSubject = new Subject<{
  txId: string
  onError?: (signatureResult: SignatureResult, context: Context) => void
  onSuccess?: (signatureResult: SignatureResult, context: Context) => void
}>()

function useTxStatus() {
  const connection = useAppStore((s) => s.connection)

  useEffect(() => {
    if (!connection) return
    const sub = txStatusSubject.asObservable().subscribe(({ txId, onError, onSuccess }) => {
      toastSubject.next({
        title: 'Transaction sent!',
        description: `https://solscan.io/tx/${txId}`,
        status: 'success'
      })
      connection.onSignature(
        txId,
        (signatureResult, context) => {
          if (signatureResult.err) {
            toastSubject.next({
              title: 'Transaction Failed',
              status: 'error'
            })
            onError?.(signatureResult, context)
          } else {
            toastSubject.next({
              title: 'Transaction Processed',
              status: 'success'
            })
            onSuccess?.(signatureResult, context)
          }
        },
        'processed'
      )
      connection.getSignatureStatus(txId)
    })

    return () => {
      sub?.unsubscribe()
    }
  }, [connection])
}

export default useTxStatus
