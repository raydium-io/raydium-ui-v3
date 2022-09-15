import { ReactNode } from 'react'
import { Flex, Box, Text, InputGroup, NumberInput, NumberInputField } from '@chakra-ui/react'
import { useCallback, useEffect, useRef } from 'react'

interface Props {
  id?: string
  name?: string
  title?: ReactNode
  readonly?: boolean
  loading?: boolean
  value: string
  side?: string
  balance?: string
  decimals?: number
  onChange?: (val: string, valNumber: number, side?: string) => void
  onFocus?: (side?: string) => void
}

function DecimalInput(props: Props) {
  const { id, name, title, onChange, onFocus, decimals, side, readonly, value } = props
  const valRef = useRef(value)
  valRef.current = value

  const handleChange = useCallback(
    (val: string, valNumber: number) => {
      onChange?.(val, valNumber, side)
    },
    [onChange, side]
  )

  const handleParseVal = useCallback(
    (val: string) => {
      const splitArr = val.split('.')
      if (splitArr.length > 2) return [splitArr[0], splitArr[1]].join('.')
      if (typeof decimals === 'number' && decimals > -1 && splitArr[1] && splitArr[1].length > decimals) {
        //.replace(/([1-9]+(\.[0-9]+[1-9])?)(\.?0+$)/, '$1')
        return [splitArr[0], splitArr[1].substring(0, decimals)].join('.')
      }
      return val
    },
    [decimals]
  )

  const handleFocus = useCallback(() => {
    onFocus?.(side)
  }, [onFocus, side])

  useEffect(() => {
    const val = handleParseVal(valRef.current)
    handleChange(val, Number(val))
  }, [handleParseVal, handleChange])

  return (
    <Box width="fit-content">
      <Flex alignItems="center" mb="10px">
        <Text mr="8px" mt="6px" minW="40px">
          {title}
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
        </InputGroup>
      </Flex>
    </Box>
  )
}

export default DecimalInput
