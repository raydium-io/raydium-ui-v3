import turboTokenList from '@/api/tokenlist.json'
interface tokenInfoType {
  key: string,
  value: {
    chainId: number,
    address: string,
    programId: string,
    decimals: number,
    symbol: string,
    name: string,
    logoURI: string,
    tags: Array<any>,
    priority: number,
    type: string,
    Metadata?: string,
    extensions: {
      coingeckoId: string
    }
  }
}

const tokenList: any = turboTokenList;
let tokenList1: Array<tokenInfoType> = [];

for (let i in tokenList) {
  tokenList1.push(tokenList[i])
}

export const eclipseTokenList: Array<tokenInfoType> = tokenList1;
