import { useCallback, useState } from 'react'
import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter, Button, Link } from '@chakra-ui/react'
import { HydratedFarmInfo } from 'test-raydium-sdk-v2'
import { FarmStore, TokenAccountStore } from '@/store'
import DecimalInput from '@/component/DecimalInput'

interface Props {
  isStake: boolean
  farmInfo: HydratedFarmInfo
  onClose: () => void
  confirmAct: FarmStore['depositFarmAct'] | FarmStore['withdrawFarmAct']
  getTokenBalanceUiAmount: TokenAccountStore['getTokenBalanceUiAmount']
}

function StakeDialog({ isStake, farmInfo, getTokenBalanceUiAmount, confirmAct, onClose }: Props) {
  const [loading, setLoading] = useState(false)
  const [value, setValue] = useState('')
  const depositedBalance = getTokenBalanceUiAmount({ mint: farmInfo.lpMint.toBase58() })
  const balance = isStake ? depositedBalance.text : farmInfo.userStakedLpAmount?.toExact()
  const handleChange = useCallback((val: string) => {
    setValue(val)
  }, [])

  const handleClickMax = useCallback(() => {
    setValue((val) => balance || val)
  }, [balance])

  const handleConfirm = () => {
    setLoading(true)
    confirmAct({
      farmId: farmInfo.id,
      lpMint: farmInfo.lpMint,
      amount: value,
      isStaking: true
    })
      .then(() => {
        onClose()
      })
      .finally(() => {
        setLoading(false)
      })
  }

  return (
    <Modal isOpen={true} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          {isStake ? 'Stake' : 'UnStake'} {farmInfo.name}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {isStake ? 'Balance' : 'Deposited'}:{' '}
          <Link onClick={handleClickMax} variant="outline">
            {balance}
          </Link>
          <br />
          <DecimalInput
            value={value}
            title={farmInfo.name}
            decimals={isStake ? depositedBalance.decimals : farmInfo.userStakedLpAmount?.token.decimals}
            onChange={handleChange}
          />
        </ModalBody>

        <ModalFooter>
          <Button colorScheme="blue" mr={3} isLoading={loading} onClick={handleConfirm}>
            {isStake ? 'Stake' : 'UnStake'}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

export default StakeDialog
