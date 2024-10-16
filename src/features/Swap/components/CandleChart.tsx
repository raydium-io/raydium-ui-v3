import { colors } from '@/theme/cssVariables/colors'
import { AbsoluteCenter, Box, GridItem, Spinner, Text, useColorMode } from '@chakra-ui/react'
import { ApiV3Token } from '@raydium-io/raydium-sdk-v2'
import dayjs from 'dayjs'
import { ColorType, CrosshairMode, IChartApi, ISeriesApi, TickMarkType, createChart } from 'lightweight-charts'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { formatCurrency } from '@/utils/numberish/formatter'
import staticChartData from './ChartData' // Import your static chart data

// Define the type for timeType
type TimeType = '15m' | '1H' | '4H' | '1D' | '1W'

interface Props {
  onPriceChange?: (val: { current: number; change: number } | undefined) => void
  baseMint?: ApiV3Token
  quoteMint?: ApiV3Token
  timeType: TimeType // Use the defined TimeType
  untilDate?: number
}

export default function CandleChart({ onPriceChange, baseMint, quoteMint, timeType, untilDate }: Props) {
  const { colorMode } = useColorMode()
  const { t } = useTranslation()
  const chartCtrRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<{ chart?: IChartApi; candle?: ISeriesApi<'Candlestick'>; volume?: ISeriesApi<'Histogram'> }>({})

  // Use static data based on the selected time type
  const data = staticChartData[timeType] || []
  const currentPrice = data[data.length - 1]?.close
  const change24H = data.length > 1 ? ((currentPrice - data[data.length - 2].close) / data[data.length - 2].close) * 100 : 0
  const isLoading = false // No loading state needed
  const isEmptyResult = data.length === 0

  useEffect(() => {
    if (!chartCtrRef.current) return

    const chartTextColor = colorMode === 'light' ? '#474ABB' : '#ABC4FF'
    const axisColor = '#ecf5ff1a'
    const volumeColor = colorMode === 'light' ? '#7191FF4d' : '#7081943e'
    const upColor = '#22D1F8'
    const downColor = '#ff4ea3'
    const crosshairColor = colorMode === 'light' ? '#474ABB' : '#ABC4FF'

    const chart = createChart(chartCtrRef.current!, {
      layout: { textColor: chartTextColor, background: { type: ColorType.Solid, color: 'transparent' }, fontFamily: 'Space Grotesk' },
      grid: { vertLines: { color: 'transparent' }, horzLines: { color: 'transparent' } },
      crosshair: { mode: CrosshairMode.Normal, vertLine: { color: crosshairColor }, horzLine: { color: crosshairColor } },
      autoSize: true,
      rightPriceScale: { borderColor: axisColor },
      timeScale: {
        borderColor: axisColor,
        tickMarkFormatter: (time: number, tickMarkType: TickMarkType) => {
          if (tickMarkType === 0)
            return dayjs(time * 1000)
              .utc()
              .format('YYYY/M')
          if (tickMarkType < 3)
            return dayjs(time * 1000)
              .utc()
              .format('M/D')
          return dayjs(time * 1000)
            .utc()
            .format('H:mm')
        }
      }
    })

    const candlestickSeries = chart.addCandlestickSeries({
      upColor,
      downColor,
      borderVisible: false,
      wickUpColor: upColor,
      wickDownColor: downColor,
      priceLineVisible: true,
      priceFormat: {
        type: 'custom',
        formatter: (val: number) => {
          return val ? formatCurrency(val, { maximumDecimalTrailingZeroes: 5 }) : val
        },
        minMove: 10 / 10 ** (baseMint?.decimals ?? 2)
      }
    })

    candlestickSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.1,
        bottom: 0.1
      }
    })

    const volumeSeries = chart.addHistogramSeries({
      color: volumeColor,
      priceFormat: {
        type: 'volume'
      },
      priceScaleId: '',
      lastValueVisible: false,
      priceLineVisible: false
    })

    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.7,
        bottom: 0
      }
    })

    // Load static data into the chart
    // candlestickSeries.setData(data)
    candlestickSeries.setData([])
    volumeSeries.setData(
      data.map((item: any) => ({
        time: item.time,
        value: item.volume
      }))
    )

    chartRef.current.chart = chart
    chartRef.current.candle = candlestickSeries
    chartRef.current.volume = volumeSeries

    return () => {
      chart.remove()
      chartRef.current = {}
    }
  }, [data, colorMode])

  useEffect(() => {
    onPriceChange?.(
      currentPrice != null
        ? {
          current: currentPrice,
          change: change24H || 0
        }
        : undefined
    )
  }, [onPriceChange, currentPrice, change24H])

  return (
    <GridItem gridArea="chart" position="relative" alignSelf="stretch">
      {isLoading && (
        <AbsoluteCenter>
          <Spinner color={colors.textSecondary} />
        </AbsoluteCenter>
      )}
      {isEmptyResult ? (
        <AbsoluteCenter>
          <Box fontSize="sm" color={colors.textTertiary} whiteSpace="nowrap" textAlign="center">
            <Text mb={2}>{t('error.no_chart_data')}</Text>
            <Text>{t('error.no_chart_data_hint')}</Text>
          </Box>
        </AbsoluteCenter>
      ) : null}
      <div
        ref={chartCtrRef}
        style={{ opacity: isEmptyResult ? 0 : 1, width: '100%', height: '100%', contain: 'size', paddingTop: '20px' }}
      ></div>
    </GridItem>
  )
}
