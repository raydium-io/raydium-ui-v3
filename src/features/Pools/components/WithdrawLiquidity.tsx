import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Button,
  NumberInput
} from '@chakra-ui/react'
import { ApiJsonPairInfo } from '@raydium-io/raydium-sdk'
import { useAppStore, useLiquidityStore } from '@/store'

interface Props {
  pairInfo: ApiJsonPairInfo
  balance: string
  onClose: () => void
}

function WithdrawLiquidity({ pairInfo, balance, onClose }: Props) {
  const raydium = useAppStore((s) => s.raydium)
  const removeLiquidityAct = useLiquidityStore((s) => s.removeLiquidityAct)
  const handleConfirm = () => {
    removeLiquidityAct({
      poolId: pairInfo.ammId,
      amount: raydium!.liquidity.lpMintToTokenAmount({ poolId: pairInfo.ammId, amount: balance })
    })
    onClose()
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
          Balance: {balance}
          <br />
          <NumberInput />
        </ModalBody>

        <ModalFooter>
          <Button colorScheme="blue" mr={3} onClick={handleConfirm}>
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
