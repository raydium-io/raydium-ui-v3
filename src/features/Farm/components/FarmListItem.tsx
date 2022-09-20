import { useCallback, useRef, MouseEvent } from 'react'
import { Flex, Box, Avatar, useDisclosure, Button, Hide } from '@chakra-ui/react'
import { HydratedFarmInfo, Rounding, SplToken } from 'test-raydium-sdk-v2'
import ConnectedOnly from '@/component/ConnectedOnly'
import DWFarmDialog from './DWFarmDialog'
import { transformWSolName, col1Style, colStyle } from '../util'
import { useTokenAccountStore } from '@/store/useTokenAccountStore'
import { useFarmStore } from '@/store/useFarmStore'

interface Props {
  farmPool: HydratedFarmInfo
  tokenMap: Map<string, SplToken>
}
export default function FarmListItem({ farmPool, tokenMap }: Props) {
  const { isOpen, onClose, onOpen } = useDisclosure()
  const isDepositRef = useRef(true)
  const [withdrawFarmAct, depositFarmAct] = useFarmStore((s) => [s.withdrawFarmAct, s.depositFarmAct])
  const getTokenBalanceUiAmount = useTokenAccountStore((s) => s.getTokenBalanceUiAmount)
  const [baseToken, quoteToken] = [tokenMap.get(farmPool.baseMint.toString()), tokenMap.get(farmPool.quoteMint.toString())]

  const handleClick = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      isDepositRef.current = e.currentTarget.dataset['type'] === 'deposit'
      onOpen()
    },
    [onOpen]
  )

  const handleHarvest = () => {
    withdrawFarmAct({
      farmId: farmPool.id,
      lpMint: farmPool.lpMint,
      amount: '0'
    })
  }

  return (
    <>
      <Flex alignItems="center">
        <Box sx={col1Style}>
          <Avatar size="sm" name={baseToken?.symbol} src={baseToken?.icon} />
          <Avatar size="sm" ml="-12px" mr="6px" name={quoteToken?.symbol} src={quoteToken?.icon} />
          {transformWSolName(farmPool.name)}
        </Box>
        <Hide below="md">
          <Box sx={colStyle}>
            <ConnectedOnly>
              {farmPool.rewards.map((reward) => (
                <div key={reward.rewardVault.toBase58()}>
                  {reward.userPendingReward && !reward.userPendingReward.isZero() ? (
                    <>
                      <Flex alignItems="center">
                        <Avatar
                          size="sm"
                          mr="6px"
                          name={reward.token?.symbol}
                          src={tokenMap.get(reward.token?.mint.toString() || '')?.icon}
                        />
                        {reward.userPendingReward?.toFixed(6, undefined, Rounding.ROUND_HALF_UP)} {reward.token?.symbol}
                      </Flex>
                      <Button mt="4px" onClick={handleHarvest}>
                        Harvest
                      </Button>
                    </>
                  ) : null}
                </div>
              ))}
            </ConnectedOnly>
          </Box>
        </Hide>
        <Box sx={colStyle}>{farmPool.totalApr30d?.mul(100).toFixed(2)}%</Box>
        <Box sx={colStyle}>
          ~${farmPool.tvl ? farmPool.tvl?.toFixed(0, { groupSeparator: ',' }) : '0'}
          <br />
          {farmPool.stakedLpAmount?.toFixed(0, { groupSeparator: ',' })} LP
        </Box>
        <Hide below="md">
          <ConnectedOnly>
            <Box sx={colStyle}>
              {!getTokenBalanceUiAmount({ mint: farmPool.lpMint.toBase58(), decimals: 0, isLpToken: true }).isZero && (
                <Button data-type="deposit" onClick={handleClick}>
                  Deposit
                </Button>
              )}
              {farmPool.userStakedLpAmount && !farmPool.userStakedLpAmount.isZero() && (
                <Button data-type="withdraw" onClick={handleClick}>
                  Withdraw
                </Button>
              )}
            </Box>
          </ConnectedOnly>
        </Hide>
      </Flex>
      {isOpen && (
        <DWFarmDialog
          farmInfo={farmPool}
          onClose={onClose}
          getTokenBalanceUiAmount={getTokenBalanceUiAmount}
          confirmAct={isDepositRef.current ? depositFarmAct : withdrawFarmAct}
          isDeposit={isDepositRef.current}
        />
      )}
    </>
  )
}
