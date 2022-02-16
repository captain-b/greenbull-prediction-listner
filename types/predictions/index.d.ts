interface TokenPrice {
    symbol: string;
    price: string;
}

interface RoundInfo {
    startTimestamp: BigInt;
    lockTimestamp: BigInt;
    closeTimestamp: BigInt;
    lockPrice: BigInt;
    closePrice: BigInt;
    bullAmount: BigInt;
    bearAmount: BigInt;
}

type Token = 'BNB' | 'BTC';