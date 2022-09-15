import { useCallback, useState } from 'react'
import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter, Button, Link } from '@chakra-ui/react'
import { HydratedFarmInfo } from '@raydium-io/raydium-sdk'
import { FarmStore, TokenAccountStore } from '@/store'
import DecimalInput from '@/component/DecimalInput'
import { transformWSolName } from '../util'

interface Props {
  isDeposit: boolean
  farmInfo: HydratedFarmInfo
  onClose: () => void
  confirmAct: FarmStore['withdrawFarmAct']
  getTokenBalanceUiAmount: TokenAccountStore['getTokenBalanceUiAmount']
}

function DWFarmDialog({ isDeposit, farmInfo, getTokenBalanceUiAmount, confirmAct, onClose }: Props) {
  const [loading, setLoading] = useState(false)
  const [value, setValue] = useState('')
  const depositedBalance = getTokenBalanceUiAmount({ mint: farmInfo.lpMint.toBase58(), isLpToken: true })
  const balance = isDeposit ? depositedBalance.text : farmInfo.userStakedLpAmount?.toFixed()

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
      amount: value
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
        <ModalHeader>{isDeposit ? 'Stake' : 'UnStake'} LP</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {isDeposit ? 'Balance' : 'Deposited'}:{' '}
          <Link onClick={handleClickMax} sx={{ '&:hover': { textDecoration: 'none' } }}>
            {Number(balance)}
          </Link>
          <br />
          <DecimalInput
            value={value}
            title={transformWSolName(farmInfo.name)}
            decimals={isDeposit ? depositedBalance.decimals : farmInfo.userStakedLpAmount?.token.decimals}
            onChange={handleChange}
          />
        </ModalBody>

        <ModalFooter>
          <Button colorScheme="blue" mr={3} isLoading={loading} onClick={handleConfirm}>
            {isDeposit ? 'Stake' : 'UnStake'} LP
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

export default DWFarmDialog
