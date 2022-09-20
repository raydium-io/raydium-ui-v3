import { useEffect, useState, useRef } from 'react'
import { Flex, Box, useDisclosure, Button } from '@chakra-ui/react'
import { HydratedFarmInfo } from 'test-raydium-sdk-v2'
import shallow from 'zustand/shallow'
import { useFarmStore, useTokenAccountStore } from '@/store'
import ConnectedButton from '@/component/ConnectedButton'
import ConnectedOnly from '@/component/ConnectedOnly'
import StakeDialog from './components/StakeDialog'

export default function Staking() {
  const [hydratedFarms, depositFarmAct, withdrawFarmAct] = useFarmStore(
    (s) => [s.hydratedFarms, s.depositFarmAct, s.withdrawFarmAct],
    shallow
  )
  const getTokenBalanceUiAmount = useTokenAccountStore((s) => s.getTokenBalanceUiAmount)
  const { isOpen, onClose, onOpen } = useDisclosure()
  const [stakingPools, setStakingPools] = useState<HydratedFarmInfo[]>([])
  const stakeRef = useRef<boolean>(true)
  const dialogPoolRef = useRef<HydratedFarmInfo>()

  const handleClickOpen = (info: HydratedFarmInfo, isStake: boolean) => {
    stakeRef.current = isStake
    dialogPoolRef.current = info
    onOpen()
  }

  useEffect(() => {
    setStakingPools(hydratedFarms.filter((farm) => farm.isStakePool))
  }, [hydratedFarms])
  return (
    <>
      <Flex my="10px">
        <Box w="18%">Pool</Box>
        <Box w="18%">Pending Reward</Box>
        <Box w="18%">Staked</Box>
        <Box w="18%">APR</Box>
        <Box w="18%">Total Staked</Box>
      </Flex>
      {stakingPools.map((pool) => (
        <Flex key={pool.id.toBase58()} alignItems="center">
          <Box w="18%">{pool.name}</Box>
          <Box w="18%">
            {pool.rewards.map((reward) => (
              <div key={reward.rewardVault.toBase58()}>
                {reward.userPendingReward?.toExact() || '0'} {pool.name}
              </div>
            ))}
          </Box>
          <Box w="18%">
            {pool.userStakedLpAmount?.toExact() || '0'} {pool.name}
          </Box>
          <Box w="18%">{pool.totalApr7d?.mul(100).toFixed(2)}%</Box>
          <Box w="18%">
            ~${pool.tvl ? pool.tvl?.toFixed(0, { groupSeparator: ',' }) : '0'}
            <br />
            {pool.stakedLpAmount?.toFixed(0, { groupSeparator: ',' })}
          </Box>
          <div>
            <ConnectedButton size="sm" onClick={() => handleClickOpen(pool, true)}>
              Stake
            </ConnectedButton>
            <br />
            <ConnectedOnly>
              {pool.userStakedLpAmount && !pool.userStakedLpAmount?.isZero() && (
                <Button size="sm" mt="8px" onClick={() => handleClickOpen(pool, false)}>
                  UnStake
                </Button>
              )}
            </ConnectedOnly>
          </div>
        </Flex>
      ))}
      {isOpen && (
        <StakeDialog
          farmInfo={dialogPoolRef.current!}
          isStake={stakeRef.current}
          getTokenBalanceUiAmount={getTokenBalanceUiAmount}
          confirmAct={stakeRef.current ? depositFarmAct : withdrawFarmAct}
          onClose={onClose}
        />
      )}
    </>
  )
}
