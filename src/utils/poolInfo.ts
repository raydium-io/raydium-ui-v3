import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { Connection, PublicKey } from '@solana/web3.js';
import axios from 'axios'
import { tokensPrices } from './tokenInfo'
import dexConfig from '@/config/config'
import { getAmmConfigAddress, getPoolAddress, getPoolVaultAddress, } from "./pda";
import { eclipseTokenList } from "./eclipseTokenList";

// const getTVL = async (poolInfo: { poolId: string, minta: string, mintb: string }) => {
//   const connection = new Connection(dexConfig.network, 'confirmed');

//   const tokenAccount1 = getAssociatedTokenAddressSync(new PublicKey(poolInfo.minta.split(",")[1]), new PublicKey(poolInfo.poolId), false, new PublicKey(poolInfo.minta.split(",")[2]))
//   const tokenAccount2 = getAssociatedTokenAddressSync(new PublicKey(poolInfo.mintb.split(",")[1]), new PublicKey(poolInfo.poolId), false, new PublicKey(poolInfo.mintb.split(",")[2]))

//   let tokenAmount1 = await connection.getTokenAccountBalance(tokenAccount1);
//   let tokenAmount2 = await connection.getTokenAccountBalance(tokenAccount2);

//   let tvl = tokensPrices[poolInfo.minta.split(",")[4]].price * (tokenAmount1.value.uiAmount !== null ? tokenAmount1.value.uiAmount : 0) +
//     tokensPrices[poolInfo.mintb.split(",")[4]].price * (tokenAmount2.value.uiAmount !== null ? tokenAmount2.value.uiAmount : 0)

//   return tvl;
// }

const getTVL = async (inputMint: string, outputMint: string) => {
  try {
    const connection = new Connection(dexConfig.network, 'confirmed');
    const programId = new PublicKey(dexConfig.programId);

    const inputToken = new PublicKey(inputMint);
    const outputToken = new PublicKey(outputMint);

    let config_index = 2;

    const [address, _] = await getAmmConfigAddress(
      config_index,
      programId
    );
    const configAddress = address;

    const [poolAddress] = await getPoolAddress(
      configAddress,
      inputToken,
      outputToken,
      programId
    );

    const [inputVault] = await getPoolVaultAddress(
      poolAddress,
      inputToken,
      programId
    );
    const [outputVault] = await getPoolVaultAddress(
      poolAddress,
      outputToken,
      programId
    );

    let balance1 = await connection.getTokenAccountBalance(inputVault)
    let balance2 = await connection.getTokenAccountBalance(outputVault)

    console.log(balance1, balance2)

    let val = 0;

    if (balance1.value.uiAmount && balance2.value.uiAmount) {
      val = tokensPrices[eclipseTokenList.filter(item => item.key === inputMint)[0].value.symbol].price * balance1.value.uiAmount +
        tokensPrices[eclipseTokenList.filter(item => item.key === outputMint)[0].value.symbol].price * balance2.value.uiAmount
    }

    return val;

  } catch (error) {
    console.log(error)
    return 0;
  }

}


export const epsGetPoolInfo = async () => {

  try {
    const serverData = await axios.get(`${dexConfig.serverUrl}/getPoolInfo`);
    const poolInfo = serverData.data.poolInfo

    const poolData = [];

    for (let i in poolInfo) {
      const tvl = await getTVL(poolInfo[i].minta.split(",")[1], poolInfo[i].mintb.split(",")[1])
      poolData.push({
        "type": "Standard",
        "programId": dexConfig.programId,
        "id": poolInfo[i].poolId,
        "mintA": {
          "chainId": parseInt(poolInfo[i].minta.split(",")[0]),
          "address": poolInfo[i].minta.split(",")[1],
          "programId": poolInfo[i].minta.split(",")[2],
          "logoURI": poolInfo[i].minta.split(",")[3],
          "symbol": poolInfo[i].minta.split(",")[4],
          "name": poolInfo[i].minta.split(",")[5],
          "decimals": parseInt(poolInfo[i].minta.split(",")[6]),
          "tags": [],
          "extensions": {}
        },
        "mintB": {
          "chainId": parseInt(poolInfo[i].mintb.split(",")[0]),
          "address": poolInfo[i].mintb.split(",")[1],
          "programId": poolInfo[i].mintb.split(",")[2],
          "logoURI": poolInfo[i].mintb.split(",")[3],
          "symbol": poolInfo[i].mintb.split(",")[4],
          "name": poolInfo[i].mintb.split(",")[5],
          "decimals": parseInt(poolInfo[i].mintb.split(",")[6]),
          "tags": [],
          "extensions": {}
        },
        "price": 21467.500178514427,
        "mintAmountA": 1318.73611189,
        "mintAmountB": 28309967.717412,
        "feeRate": 0.0025,
        "openTime": "0",
        "tvl": tvl,
        "day": {
          "volume": parseFloat(poolInfo[i].vol),
          "volumeQuote": 7003025684.0527525,
          "volumeFee": parseFloat(poolInfo[i].fee),
          "apr": parseFloat(poolInfo[i].apr),
          "feeApr": 0,
          "priceMin": 10756.752204545455,
          "priceMax": 38603507.47044753,
          "rewardApr": []
        },
        "week": {
          "volume": 31841158.76864387,
          "volumeQuote": 24198561909.19259,
          "volumeFee": 79602.89692160966,
          "apr": 655.9,
          "feeApr": 655.9,
          "priceMin": 10756.752204545455,
          "priceMax": 38603507.47044753,
          "rewardApr": []
        },
        "month": {
          "volume": 31841158.76864387,
          "volumeQuote": 24198561909.19259,
          "volumeFee": 79602.89692160966,
          "apr": 262.36,
          "feeApr": 262.36,
          "priceMin": 10756.752204545455,
          "priceMax": 38603507.47044753,
          "rewardApr": []
        },
        "pooltype": [
          "OpenBookMarket"
        ],
        "rewardDefaultInfos": [],
        "farmUpcomingCount": 0,
        "farmOngoingCount": 0,
        "farmFinishedCount": 0,
        "marketId": "AeA48gMU1H2D1c1uRwa9yS2TrCsPYvgmUEPF4fR3L8tk",
        "lpMint": {
          "chainId": 101,
          "address": "3q9Pt2RRFTc8wU8QBBn3Ymg69J51hUPsDEuJtMzBvVGk",
          "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
          "logoURI": "",
          "symbol": "",
          "name": "",
          "decimals": 9,
          "tags": [],
          "extensions": {}
        },
        "lpPrice": 88.51377889682935,
        "lpAmount": 4113.381070308,
        "burnPercent": 98.29,
        "poolName": `${poolInfo[i].minta.split(",")[4]} - ${poolInfo[i].mintb.split(",")[4]}`,
        "poolDecimals": 9,
        "isOpenBook": true,
        "weeklyRewards": [],
        "allApr": {
          "day": [
            {
              "apr": 4010.81,
              "percent": 100,
              "isTradingFee": true
            }
          ],
          "week": [
            {
              "apr": 655.9,
              "percent": 100,
              "isTradingFee": true
            }
          ],
          "month": [
            {
              "apr": 262.36,
              "percent": 100,
              "isTradingFee": true
            }
          ]
        },
        "totalApr": {
          "day": 4010.81,
          "week": 655.9,
          "month": 262.36
        },
        "formattedRewardInfos": [],
        "isRewardEnded": true
      })
    }

    return poolData;

  } catch (error) {
    console.log(error)
  }


  // const epsWallet = useWallet();
  // const epsPoolAddress = ["A6fVkHYNEtfBcMdUo9rVg92SAA5AhePwvNe1sqLsc7pQ"];

}

// export const poolinfo = {
//   "type": "Standard",
//   "programId": "8PzREVMxRooeR2wbihZdp2DDTQMZkX9MVzfa8ZV615KW",
//   "id": "A6fVkHYNEtfBcMdUo9rVg92SAA5AhePwvNe1sqLsc7pQ",
//   "mintA": {
//     "chainId": 101,
//     "address": "5gFSyxjNsuQsZKn9g5L9Ky3cSUvJ6YXqWVuPzmSi8Trx",
//     "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
//     "logoURI": "https://img-v1.raydium.io/icon/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v.png",
//     "symbol": "USDC",
//     "name": "Wrapped SOL",
//     "decimals": 9,
//     "tags": [],
//     "extensions": {}
//   },
//   "mintB": {
//     "chainId": 102,
//     "address": "FjtvYfdfxjBdgtFdHX6AZEPbtowsMhiUF5D53jYxWUba",
//     "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
//     "logoURI": "https://img-v1.raydium.io/icon/2FPyTwcZLUg1MDrwsyoP4D6s1tM7hAkHYRjkNb5w6Pxk.png",
//     "symbol": "ETH",
//     "name": "eth",
//     "decimals": 9,
//     "tags": [],
//     "extensions": {}
//   },
//   "price": 21467.500178514427,
//   "mintAmountA": 1318.73611189,
//   "mintAmountB": 28309967.717412,
//   "feeRate": 0.0025,
//   "openTime": "0",
//   "tvl": 364090.9,
//   "day": {
//     "volume": 16003268.799198171,
//     "volumeQuote": 7003025684.0527525,
//     "volumeFee": 40008.17199799543,
//     "apr": 4010.81,
//     "feeApr": 4010.81,
//     "priceMin": 10756.752204545455,
//     "priceMax": 38603507.47044753,
//     "rewardApr": []
//   },
//   "week": {
//     "volume": 31841158.76864387,
//     "volumeQuote": 24198561909.19259,
//     "volumeFee": 79602.89692160966,
//     "apr": 655.9,
//     "feeApr": 655.9,
//     "priceMin": 10756.752204545455,
//     "priceMax": 38603507.47044753,
//     "rewardApr": []
//   },
//   "month": {
//     "volume": 31841158.76864387,
//     "volumeQuote": 24198561909.19259,
//     "volumeFee": 79602.89692160966,
//     "apr": 262.36,
//     "feeApr": 262.36,
//     "priceMin": 10756.752204545455,
//     "priceMax": 38603507.47044753,
//     "rewardApr": []
//   },
//   "pooltype": [
//     "OpenBookMarket"
//   ],
//   "rewardDefaultInfos": [],
//   "farmUpcomingCount": 0,
//   "farmOngoingCount": 0,
//   "farmFinishedCount": 0,
//   "marketId": "AeA48gMU1H2D1c1uRwa9yS2TrCsPYvgmUEPF4fR3L8tk",
//   "lpMint": {
//     "chainId": 101,
//     "address": "3q9Pt2RRFTc8wU8QBBn3Ymg69J51hUPsDEuJtMzBvVGk",
//     "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
//     "logoURI": "",
//     "symbol": "",
//     "name": "",
//     "decimals": 9,
//     "tags": [],
//     "extensions": {}
//   },
//   "lpPrice": 88.51377889682935,
//   "lpAmount": 4113.381070308,
//   "burnPercent": 98.29,
//   "poolName": "USDC - ETH",
//   "poolDecimals": 9,
//   "isOpenBook": true,
//   "weeklyRewards": [],
//   "allApr": {
//     "day": [
//       {
//         "apr": 4010.81,
//         "percent": 100,
//         "isTradingFee": true
//       }
//     ],
//     "week": [
//       {
//         "apr": 655.9,
//         "percent": 100,
//         "isTradingFee": true
//       }
//     ],
//     "month": [
//       {
//         "apr": 262.36,
//         "percent": 100,
//         "isTradingFee": true
//       }
//     ]
//   },
//   "totalApr": {
//     "day": 4010.81,
//     "week": 655.9,
//     "month": 262.36
//   },
//   "formattedRewardInfos": [],
//   "isRewardEnded": true
// }
