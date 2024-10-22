import { colors } from '@/theme/cssVariables'
import { Text, Flex, Img } from '@chakra-ui/react'
import { eclipseTokenList } from '@/utils/eclipseTokenList'

// export interface TokenSelectDialogProps {
//   onSelectValue: (token: TokenInfo) => void
//   isOpen: boolean
//   filterFn?: (token: TokenInfo) => boolean
//   onClose: () => void
// }

export default function TokenItem(props: { chooseToken: any }) {
  return (
    <Flex direction="column" className="iteams">
      {eclipseTokenList.map((item: any, index) => (
        <Flex
          alignItems="center"
          justifyContent="space-around"
          gap="10px"
          padding="6px 0"
          rounded="4px"
          cursor="pointer"
          key={index}
          onClick={() => { props.chooseToken(item.value) }} // Pass the item correctly
        >
          <Img src={item.value.logoURI} width={"32px"} height={"32px"} className='c-m-radius-50' />
          <Flex direction="column" width="200px">
            <Text fontSize="sm">{item.value.symbol}</Text>
            <Text fontSize="xs" color={colors.textSecondary}>
              {item.value.name}
            </Text>
          </Flex>
        </Flex>
      ))}
    </Flex>
  )
}
