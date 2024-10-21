import { colors } from '@/theme/cssVariables/colors'
import { AbsoluteCenter, Box, GridItem, Spinner, Text, useColorMode } from '@chakra-ui/react'
import { ApiV3Token } from '@raydium-io/raydium-sdk-v2'
import dayjs from 'dayjs'
import { ColorType, CrosshairMode, IChartApi, ISeriesApi, TickMarkType, createChart } from 'lightweight-charts'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatCurrency } from '@/utils/numberish/formatter'
import staticChartData from './ChartData' // Import your static chart data
import axios from 'axios'
import dexConfig from '@/config/config'

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
  // const data = staticChartData[timeType] || []
  const [chartData, setChartData] = useState<any>(null)
  const data = staticChartData[timeType] || []
  // const currentPrice = data[data.length - 1]?.close
  const [currentPrice, setCurrentPrice] = useState<number | null>(null)
  // const change24H = data.length > 1 ? ((currentPrice - data[data.length - 2].close) / data[data.length - 2].close) * 100 : 0
  const [change24H, setChange24H] = useState<number | null>(null)
  const isLoading = false // No loading state needed
  const isEmptyResult = data.length === 0

  // get near 15TM
  const getNear15Tm = (timestamp: number) => {
    let dateFromtimestamp = new Date(timestamp);
    let minutes = dateFromtimestamp.getMinutes();
    let seconds = dateFromtimestamp.getSeconds();

    let addTime = 0;

    if (minutes < 15) {
      addTime = 900 - (minutes * 60) - seconds;
    }
    else if (minutes >= 15 && minutes < 30) {
      addTime = 1800 - (minutes * 60) - seconds;
    }
    else if (minutes >= 30 && minutes < 45) {
      addTime = (45 * 60) - (minutes * 60) - seconds;
    }
    else if (minutes >= 45) {
      addTime = (60 * 60) - (minutes * 60) - seconds;
    }

    return timestamp + addTime;
  }
  // get near 1HTM
  const getNear1HTm = (timestamp: number) => {
    let dateFromtimestamp = new Date(timestamp);
    let minutes = dateFromtimestamp.getMinutes();
    let seconds = dateFromtimestamp.getSeconds();

    let addTime = 0;

    addTime = (60 * 60) - (minutes * 60) - seconds;

    return timestamp + addTime;
  }
  // get near 4HTm
  const getNear4HTm = (timestamp: number) => {
    let dateFromtimestamp = new Date(timestamp);
    let minutes = dateFromtimestamp.getMinutes();
    let seconds = dateFromtimestamp.getSeconds();
    let hours = dateFromtimestamp.getHours();

    let addTime = 0;

    let hrsArr = [4, 8, 12, 16, 20, 24];
    for (let i = 0; i < hrsArr.length; i++) {
      if (hours < hrsArr[i]) {
        addTime = (60 * 60 * hrsArr[i]) - (minutes * 60) - seconds;
        break;
      }
    }
    return timestamp + addTime;
  }
  // get near 1D
  const getNear1D = (timestamp: number) => {
    let dateFromtimestamp = new Date(timestamp);
    let minutes = dateFromtimestamp.getMinutes();
    let seconds = dateFromtimestamp.getSeconds();
    let hours = dateFromtimestamp.getHours();

    let addTime = 0;

    addTime = (60 * 60 * 24) - (minutes * 60) - seconds;
    return timestamp + addTime;
  }
  // get near 1W
  const getNear1W = (timestamp: number) => {
    let dateFromtimestamp = new Date(timestamp);
    let minutes = dateFromtimestamp.getMinutes();
    let seconds = dateFromtimestamp.getSeconds();
    let hours = dateFromtimestamp.getHours();

    let addTime = 0;

    addTime = (60 * 60 * 24 * 7) - (minutes * 60) - seconds;
    return timestamp + addTime;
  }

  const fecthPoolPrice = async () => {
    try {
      if (baseMint && quoteMint) {

        const serverData = await axios.get(`${dexConfig.serverUrl}/getPoolPrice?basemint=${baseMint?.address}&quotemint=${quoteMint.address}`);

        const poolPrice = serverData.data.poolPrice;
        let chatDataTemp: any = {
          '15m': [],
          '1H': [],
          '4H': [],
          '1D': [],
          '1W': []
        };
        if (poolPrice.length > 0) {
          let firstItem = poolPrice[0];
          let len = poolPrice.length;
          // 15m
          let firstTime = getNear15Tm(firstItem.timestamp);
          while (firstTime < poolPrice[len - 1].timestamp) {
            let endTime = firstTime + 900;
            let filteredPrice = poolPrice.filter((price: any) => price.timestamp >= firstTime && price.timestamp <= endTime);
            if (filteredPrice.length !== 0) {
              // Using reduce to find the maximum rate
              const maxRate = filteredPrice.reduce((max: number, item: any) => {
                return item.rate > max ? item.rate : max;
              }, -Infinity);
              const minRate = filteredPrice.reduce((max: number, item: any) => {
                return item.rate > max ? item.rate : max;
              }, Infinity);

              chatDataTemp['15m'].push({
                time: firstTime,
                open: filteredPrice[0].rate,
                high: maxRate,
                low: minRate,
                close: filteredPrice[filteredPrice.length - 1].rate,
                // volume: 0
              })
            }
            firstTime = endTime;
          }
          // 1H
          firstTime = getNear1HTm(firstItem.timestamp);
          while (firstTime < poolPrice[len - 1].timestamp) {
            let endTime = firstTime + (60 * 60);
            let filteredPrice = poolPrice.filter((price: any) => price.timestamp >= firstTime && price.timestamp <= endTime);
            if (filteredPrice.length !== 0) {
              // Using reduce to find the maximum rate
              const maxRate = filteredPrice.reduce((max: number, item: any) => {
                return item.rate > max ? item.rate : max;
              }, -Infinity);
              const minRate = filteredPrice.reduce((max: number, item: any) => {
                return item.rate > max ? item.rate : max;
              }, Infinity);

              chatDataTemp['1H'].push({
                time: firstTime,
                open: filteredPrice[0].rate,
                high: maxRate,
                low: minRate,
                close: filteredPrice[filteredPrice.length - 1].rate,
                // volume: 0
              })
            }
            firstTime = endTime;
          }
          // 4H
          firstTime = getNear4HTm(firstItem.timestamp);
          while (firstTime < poolPrice[len - 1].timestamp) {
            let endTime = firstTime + (60 * 60 * 4);
            let filteredPrice = poolPrice.filter((price: any) => price.timestamp >= firstTime && price.timestamp <= endTime);
            if (filteredPrice.length !== 0) {
              // Using reduce to find the maximum rate
              const maxRate = filteredPrice.reduce((max: number, item: any) => {
                return item.rate > max ? item.rate : max;
              }, -Infinity);
              const minRate = filteredPrice.reduce((max: number, item: any) => {
                return item.rate > max ? item.rate : max;
              }, Infinity);
              chatDataTemp['4H'].push({
                time: firstTime,
                open: filteredPrice[0].rate,
                high: maxRate,
                low: minRate,
                close: filteredPrice[filteredPrice.length - 1].rate,
                // volume: 0
              })
            }
            firstTime = endTime;
          }
          // 1D
          firstTime = getNear1D(firstItem.timestamp);
          while (firstTime < poolPrice[len - 1].timestamp) {
            let endTime = firstTime + (60 * 60 * 24);
            let filteredPrice = poolPrice.filter((price: any) => price.timestamp >= firstTime && price.timestamp <= endTime);
            if (filteredPrice.length !== 0) {
              // Using reduce to find the maximum rate
              const maxRate = filteredPrice.reduce((max: number, item: any) => {
                return item.rate > max ? item.rate : max;
              }, -Infinity);
              const minRate = filteredPrice.reduce((max: number, item: any) => {
                return item.rate > max ? item.rate : max;
              }, Infinity);
              chatDataTemp['1D'].push({
                time: firstTime,
                open: filteredPrice[0].rate,
                high: maxRate,
                low: minRate,
                close: filteredPrice[filteredPrice.length - 1].rate,
                // volume: 0
              })
            }
            firstTime = endTime;
          }
          // 1W
          firstTime = getNear1W(firstItem.timestamp);
          while (firstTime < poolPrice[len - 1].timestamp) {
            let endTime = firstTime + (60 * 60 * 24 * 7);
            let filteredPrice = poolPrice.filter((price: any) => price.timestamp >= firstTime && price.timestamp <= endTime);
            if (filteredPrice.length !== 0) {
              // Using reduce to find the maximum rate
              const maxRate = filteredPrice.reduce((max: number, item: any) => {
                return item.rate > max ? item.rate : max;
              }, -Infinity);
              const minRate = filteredPrice.reduce((max: number, item: any) => {
                return item.rate > max ? item.rate : max;
              }, Infinity);
              chatDataTemp['1W'].push({
                time: firstTime,
                open: filteredPrice[0].rate,
                high: maxRate,
                low: minRate,
                close: filteredPrice[filteredPrice.length - 1].rate,
                // volume: 0
              })
            }
            firstTime = endTime;
          }
        }
        else {
          const serverData = await axios.get(`${dexConfig.serverUrl}/getPoolPrice?basemint=${quoteMint?.address}&quotemint=${baseMint.address}`);

          const poolPrice = serverData.data.poolPrice;
          if (poolPrice.length > 0) {
            let firstItem = poolPrice[0];
            let len = poolPrice.length;
            // 15m
            let firstTime = getNear15Tm(firstItem.timestamp);
            while (firstTime < poolPrice[len - 1].timestamp) {
              let endTime = firstTime + 900;
              let filteredPrice = poolPrice.filter((price: any) => price.timestamp >= firstTime && price.timestamp <= endTime);
              if (filteredPrice.length !== 0) {
                // Using reduce to find the maximum rate
                const maxRate = filteredPrice.reduce((max: number, item: any) => {
                  return (1 / item.rate) > max ? (1 / item.rate) : max;
                }, -Infinity);
                const minRate = filteredPrice.reduce((max: number, item: any) => {
                  return (1 / item.rate) > max ? (1 / item.rate) : max;
                }, Infinity);

                chatDataTemp['15m'].push({
                  time: firstTime,
                  open: (1 / filteredPrice[0].rate),
                  high: maxRate,
                  low: minRate,
                  close: (1 / filteredPrice[filteredPrice.length - 1].rate),
                  // volume: 0
                })
              }
              firstTime = endTime;
            }
            // 1H
            firstTime = getNear1HTm(firstItem.timestamp);
            while (firstTime < poolPrice[len - 1].timestamp) {
              let endTime = firstTime + (60 * 60);
              let filteredPrice = poolPrice.filter((price: any) => price.timestamp >= firstTime && price.timestamp <= endTime);
              if (filteredPrice.length !== 0) {
                // Using reduce to find the maximum rate
                const maxRate = filteredPrice.reduce((max: number, item: any) => {
                  return (1 / item.rate) > max ? (1 / item.rate) : max;
                }, -Infinity);
                const minRate = filteredPrice.reduce((max: number, item: any) => {
                  return (1 / item.rate) > max ? (1 / item.rate) : max;
                }, Infinity);

                chatDataTemp['1H'].push({
                  time: firstTime,
                  open: (1 / filteredPrice[0].rate),
                  high: maxRate,
                  low: minRate,
                  close: (1 / filteredPrice[filteredPrice.length - 1].rate),
                  // volume: 0
                })
              }
              firstTime = endTime;
            }
            // 4H
            firstTime = getNear4HTm(firstItem.timestamp);
            while (firstTime < poolPrice[len - 1].timestamp) {
              let endTime = firstTime + (60 * 60 * 4);
              let filteredPrice = poolPrice.filter((price: any) => price.timestamp >= firstTime && price.timestamp <= endTime);
              if (filteredPrice.length !== 0) {
                // Using reduce to find the maximum rate
                const maxRate = filteredPrice.reduce((max: number, item: any) => {
                  return (1 / item.rate) > max ? (1 / item.rate) : max;
                }, -Infinity);
                const minRate = filteredPrice.reduce((max: number, item: any) => {
                  return (1 / item.rate) > max ? (1 / item.rate) : max;
                }, Infinity);
                chatDataTemp['4H'].push({
                  time: firstTime,
                  open: (1 / filteredPrice[0].rate),
                  high: maxRate,
                  low: minRate,
                  close: (1 / filteredPrice[filteredPrice.length - 1].rate),
                  // volume: 0
                })
              }
              firstTime = endTime;
            }
            // 1D
            firstTime = getNear1D(firstItem.timestamp);
            while (firstTime < poolPrice[len - 1].timestamp) {
              let endTime = firstTime + (60 * 60 * 24);
              let filteredPrice = poolPrice.filter((price: any) => price.timestamp >= firstTime && price.timestamp <= endTime);
              if (filteredPrice.length !== 0) {
                // Using reduce to find the maximum rate
                const maxRate = filteredPrice.reduce((max: number, item: any) => {
                  return (1 / item.rate) > max ? (1 / item.rate) : max;
                }, -Infinity);
                const minRate = filteredPrice.reduce((max: number, item: any) => {
                  return (1 / item.rate) > max ? (1 / item.rate) : max;
                }, Infinity);
                chatDataTemp['1D'].push({
                  time: firstTime,
                  open: (1 / filteredPrice[0].rate),
                  high: maxRate,
                  low: minRate,
                  close: (1 / filteredPrice[filteredPrice.length - 1].rate),
                  // volume: 0
                })
              }
              firstTime = endTime;
            }
            // 1W
            firstTime = getNear1W(firstItem.timestamp);
            while (firstTime < poolPrice[len - 1].timestamp) {
              let endTime = firstTime + (60 * 60 * 24 * 7);
              let filteredPrice = poolPrice.filter((price: any) => price.timestamp >= firstTime && price.timestamp <= endTime);
              if (filteredPrice.length !== 0) {
                // Using reduce to find the maximum rate
                const maxRate = filteredPrice.reduce((max: number, item: any) => {
                  return (1 / item.rate) > max ? (1 / item.rate) : max;
                }, -Infinity);
                const minRate = filteredPrice.reduce((max: number, item: any) => {
                  return (1 / item.rate) > max ? (1 / item.rate) : max;
                }, Infinity);
                chatDataTemp['1W'].push({
                  time: firstTime,
                  open: (1 / filteredPrice[0].rate),
                  high: maxRate,
                  low: minRate,
                  close: (1 / filteredPrice[filteredPrice.length - 1].rate),
                  // volume: 0
                })
              }
              firstTime = endTime;
            }
          }
        }

        setChartData(chatDataTemp)
      }
    } catch (error) {
      console.log(error)
    }
  }

  useEffect(() => {
    fecthPoolPrice();
  }, [baseMint, quoteMint])

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

    chart.timeScale().applyOptions({
      timeVisible: true
    })

    // candlestickSeries.setData(data)

    // Load static data into the chart
    if (JSON.stringify(chartData) !== '{}' && chartData !== null) {
      candlestickSeries.setData(chartData[timeType])
      setCurrentPrice(chartData[timeType][chartData[timeType].length - 1]?.close)
    }
    else {
      candlestickSeries.setData([])
    }
    // volumeSeries.setData(
    //   data.map((item: any) => ({
    //     time: item.time,
    //     value: item.volume
    //   }))
    // )

    chartRef.current.chart = chart
    chartRef.current.candle = candlestickSeries
    chartRef.current.volume = volumeSeries

    return () => {
      chart.remove()
      chartRef.current = {}
    }
  }, [chartData, colorMode, timeType])

  useEffect(() => {
    if (currentPrice) {
      let data = chartData[timeType];
      const change24H = data.length > 1 ? ((currentPrice - data[data.length - 2].close) / data[data.length - 2].close) * 100 : 0
      setChange24H(change24H)
    }
  }, [currentPrice])

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
