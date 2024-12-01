import dexConfig from "@/config/config"
import axios from "axios"

export interface TokenPrice {
  price: number
}
export interface TokenInfo {
  [key: string]: TokenPrice
}

export const tokensPrices: TokenInfo = {
  USDC: { price: 1 },
  BTC: { price: 64572.0 },
  ETH: { price: 2601.35 },
  USDT: { price: 0.927121 },
  RAY: { price: 0.01 },
  BULLS: {
    price: 0
  },
  Turbo: {
    price: 0
  }
}

export const getTokenPrice = async (token_Id: string) => {
  try {
    axios.defaults.headers.common["x-cg-api-key"] = dexConfig.apiKeyForCoingecko;

    const token_info = await axios.get(`${dexConfig.tokenPriceUrl}?ids=${token_Id}&vs_currencies=usd`);

    // return token_info;

  } catch (error) {
    console.log(error);
  }
}
