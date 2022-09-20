import {
  Avatar,
  CircularProgress,
  Flex,
  Box,
  Text,
  InputGroup,
  InputRightElement,
  NumberInput,
  NumberInputField,
  useDisclosure,
  Link
} from '@chakra-ui/react'
import { SplToken, TokenJson } from '@raydium-io/raydium-sdk'
import { useCallback, useEffect, useRef } from 'react'

import TokenSelectDialog from './TokenSelectDialog'

interface Props {
  id?: string
  name?: string
  token?: SplToken | TokenJson
  readonly?: boolean
  loading?: boolean
  value: string
  side?: string
  balance?: string
  disableClickBalance?: boolean
  onChange?: (val: string, valNumber: number, side?: string) => void
  onTokenChange?: (token: TokenJson, side?: string) => void
  onFocus?: (side?: string) => void
}

function TokenInput(props: Props) {
  const { id, name, token, balance, disableClickBalance, onChange, onTokenChange, onFocus, side, readonly, value, loading } = props
  const { isOpen, onOpen, onClose } = useDisclosure()
  const valRef = useRef(value)
  valRef.current = value

  const handleChange = useCallback(
    (val: string, valNumber: number) => {
      onChange?.(val, valNumber, side)
    },
    [onChange, side]
  )

  const handleFocus = useCallback(() => {
    onFocus?.(side)
  }, [onFocus, side])

  const handleClickBalance = useCallback(() => {
    if (!balance) return
    handleFocus()
    handleChange(balance, Number(balance))
  }, [handleFocus, handleChange, balance])

  const handleSelectToken = useCallback(
    (token: TokenJson) => {
      onTokenChange?.(token, side)
      onClose()
    },
    [onTokenChange, side, onClose]
  )

  const handleParseVal = useCallback(
    (val: string) => {
      const splitArr = val.split('.')
      if (splitArr.length > 2) return [splitArr[0], splitArr[1]].join('.')
      if (token && splitArr[1] && splitArr[1].length > token.decimals) {
        //.replace(/([1-9]+(\.[0-9]+[1-9])?)(\.?0+$)/, '$1')
        return [splitArr[0], splitArr[1].substring(0, token.decimals)].join('.')
      }
      return val
    },
    [token]
  )

  useEffect(() => {
    const val = handleParseVal(valRef.current)
    handleChange(val, Number(val))
  }, [handleParseVal, handleChange])

  return (
    <Box width="fit-content">
      {balance && (
        <Flex justifyContent="flex-end">
          {disableClickBalance ? (
            balance
          ) : (
            <Link variant="outline" onClick={handleClickBalance}>
              {balance}
            </Link>
          )}
          <Text as="span" ml="4px">
            {token?.symbol}
          </Text>
        </Flex>
      )}
      <Flex alignItems="center" mb="10px">
        <Avatar name={token?.name || '-'} src={token?.icon} bg="transparent" cursor="pointer" color="blackAlpha.100" onClick={onOpen} />
        <Text mx="6px" minW="40px">
          {token?.symbol}
        </Text>
        <InputGroup sx={{ width: 'fit-content', mr: '6px' }}>
          <NumberInput
            id={id}
            name={name}
            onChange={handleChange}
            onFocus={handleFocus}
            parse={handleParseVal}
            isDisabled={readonly || false}
            value={value}
          >
            <NumberInputField />
          </NumberInput>
          {loading && <InputRightElement pointerEvents="none" children={<CircularProgress size="20px" isIndeterminate />} />}
        </InputGroup>
      </Flex>
      {<TokenSelectDialog isOpen={isOpen} onClose={onClose} onSelectValue={handleSelectToken} />}
    </Box>
  )
}

export default TokenInput
