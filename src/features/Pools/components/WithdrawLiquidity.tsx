import { useCallback, useState } from 'react'
import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter, Button, Link } from '@chakra-ui/react'
import { ApiJsonPairInfo } from '@raydium-io/raydium-sdk'
import { useLiquidityStore } from '@/store'
import DecimalInput from '@/component/DecimalInput'

interface Props {
  pairInfo: ApiJsonPairInfo
  balance: string
  onClose: () => void
}

function WithdrawLiquidity({ pairInfo, balance, onClose }: Props) {
  const [removeLiquidityAct, lpTokenMap] = useLiquidityStore((s) => [s.removeLiquidityAct, s.lpTokenMap])
  const [loading, setLoading] = useState(false)
  const [value, setValue] = useState('')

  const handleChange = useCallback((val: string) => {
    setValue(val)
  }, [])

  const handleClickMax = useCallback(() => {
    setValue((val) => balance || val)
  }, [balance])

  const handleConfirm = () => {
    setLoading(true)
    removeLiquidityAct({
      poolId: pairInfo.ammId,
      amount: value
    })
      .then(() => {
        onClose()
      })
      .finally(() => setLoading(false))
  }

  return (
    <Modal isOpen={true} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Stake LP</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          Pool: {pairInfo.name}
          <br />
          Balance:{' '}
          <Link onClick={handleClickMax} sx={{ '&:hover': { textDecoration: 'none' } }}>
            {balance}
          </Link>
          <DecimalInput value={value} title={pairInfo.name} decimals={lpTokenMap.get(pairInfo.lpMint)?.decimals} onChange={handleChange} />
        </ModalBody>

        <ModalFooter>
          <Button isLoading={loading} colorScheme="blue" mr={3} onClick={handleConfirm}>
            Remove Liquidity
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

export default WithdrawLiquidity
