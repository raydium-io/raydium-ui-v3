import { useEffect } from 'react'
import { useToast, ToastPosition, UseToastOptions } from '@chakra-ui/react'
import { Subject } from 'rxjs'

export const toastSubject = new Subject<UseToastOptions & { txError?: Error }>()

const toastConfig = {
  duration: 5000,
  isClosable: true,
  position: 'bottom-right' as ToastPosition,
  containerStyle: {
    maxWidth: '300px',
    '& .chakra-alert__desc': {
      wordBreak: 'break-word'
    }
  }
}

function useGlobalToast() {
  const toast = useToast()

  useEffect(() => {
    const sub = toastSubject.asObservable().subscribe(({ txError, ...data }) => {
      if (txError) {
        toast({ ...toastConfig, title: 'Transaction error', description: txError.message, status: 'error' })
        return
      }
      toast({ ...toastConfig, ...data })
    })

    return () => sub.unsubscribe()
  }, [toast])
}

export default useGlobalToast
