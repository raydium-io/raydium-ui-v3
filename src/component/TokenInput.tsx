import {
  Avatar,
  CircularProgress,
  Flex,
  InputGroup,
  InputRightElement,
  NumberInput,
  NumberInputField,
  useDisclosure
} from '@chakra-ui/react'
import { SplToken, TokenJson } from '@raydium-io/raydium-sdk'
import { useCallback, useEffect, useRef } from 'react'

import TokenSelectDialog from './TokenSelectDialog'

interface Props {
  token?: SplToken | TokenJson
  readonly?: boolean
  loading?: boolean
  value: string
  side?: string
  onChange?: (val: string, valNumber: number, side?: string) => void
  onTokenChange?: (token: TokenJson, side?: string) => void
}

function TokenInput(props: Props) {
  const { token, onChange, onTokenChange, side, readonly, value, loading } = props
  const { isOpen, onOpen, onClose } = useDisclosure()
  const valRef = useRef(value)
  valRef.current = value

  const handleChange = useCallback(
    (val: string, valNumber: number) => {
      onChange?.(val, valNumber, side)
    },
    [onChange, side]
  )

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
    <>
      <Flex alignItems="center" mb="10px">
        <Avatar
          name={token?.name || '-'}
          src={token?.icon}
          bg="transparent"
          cursor="pointer"
          mr="10px"
          color="blackAlpha.100"
          onClick={onOpen}
        />
        <InputGroup sx={{ width: 'fit-content' }}>
          <NumberInput onChange={handleChange} parse={handleParseVal} isDisabled={readonly || false} value={value}>
            <NumberInputField />
          </NumberInput>
          {loading && <InputRightElement pointerEvents="none" children={<CircularProgress size="20px" isIndeterminate />} />}
        </InputGroup>
      </Flex>
      {<TokenSelectDialog isOpen={isOpen} onClose={onClose} onSelectValue={handleSelectToken} />}
    </>
  )
}

export default TokenInput
