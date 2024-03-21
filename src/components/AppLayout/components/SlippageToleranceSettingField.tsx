import Button from '@/components/Button'
import DecimalInput from '@/components/DecimalInput'
import { useEvent } from '@/hooks/useEvent'
import { useAppStore } from '@/store'
import { colors } from '@/theme/cssVariables'
import toPercentString from '@/utils/numberish/toPercentString'
import { Flex, Text } from '@chakra-ui/react'
import { useTranslation } from 'react-i18next'
import { SettingField } from './SettingField'
import { SettingFieldToggleButton } from './SettingFieldToggleButton'
import { KeyboardEvent, useCallback, useState } from 'react'
import Decimal from 'decimal.js'

export function SlippageToleranceSettingField() {
  const { t } = useTranslation()
  const slippage = useAppStore((s) => s.slippage)
  const isMobile = useAppStore((s) => s.isMobile)
  const [currentSlippage, setCurrentSlippage] = useState(String(slippage * 100))
  const handleChange = useEvent((val: string | number) => {
    setCurrentSlippage(String(val))
  })
  const handleBlur = useEvent(() => {
    useAppStore.setState({ slippage: Number(currentSlippage ?? 0) / 100 }, false, { type: 'SlippageToleranceSettingField' })
  })
  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault()
    }
  }, [])

  return (
    <SettingField
      fieldName={t('setting_board.slippage_tolerance')}
      isCollapseDefaultOpen
      tooltip={t('setting_board.slippage_tolerance_tooltip')}
      renderToggleButton={
        isMobile ? (isOpen) => <SettingFieldToggleButton isOpen={isOpen} renderContent={(slippage * 100).toString() + '%'} /> : null
      }
      renderWidgetContent={
        <>
          <Flex rowGap={2} flexWrap={['wrap', 'unset']} justifyContent="space-between">
            <Flex gap="2">
              {[0.1, 0.5, 1].map((v) => (
                <Button
                  key={v}
                  size={'sm'}
                  isActive={slippage * 100 == v}
                  variant="capsule-radio"
                  onClick={() => {
                    handleChange(v)
                    useAppStore.setState({ slippage: Number(v ?? 0) / 100 }, false, { type: 'SlippageToleranceSettingField' })
                  }}
                >
                  {toPercentString(v)}
                </Button>
              ))}
            </Flex>
            <Flex alignItems="center" rounded="full">
              <Text fontSize="xs" whiteSpace={'nowrap'} color={colors.textSecondary}>
                {t('setting_board.custom')}
              </Text>
              <DecimalInput
                variant="filledDark"
                value={currentSlippage}
                max={50}
                decimals={2}
                onBlur={handleBlur}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                inputSx={{ textAlign: 'right', rounded: '40px', h: '36px', w: '70px', py: 0, px: '3' }}
              />
              <Text fontSize="xs" color={colors.textSecondary}>
                %
              </Text>
            </Flex>
          </Flex>
          {new Decimal(currentSlippage || 0).gt('0.5') ? (
            <Text mt="2" fontSize="sm" color={colors.textPink}>
              {t('setting_board.slippage_tolerance_forerun')}
            </Text>
          ) : null}
        </>
      }
    />
  )
}