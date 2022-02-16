import {Contract, ethers, Wallet} from "ethers";
import {PredictionsAbi} from "../utils/abi/predictions";
import axios from "axios";

const privateKey: string = process.env.NODE_ENV === 'production' ? process.env.TREASURY_PRIVATE_KEY! : process.env.GANACHE_PRIVATE_KEY!;
const rpc: string = process.env.NODE_ENV === 'production' ? process.env.JSON_RPC_PROVIDER! : process.env.GANACHE_JSON_RPC_PROVIDER!;
export const provider = new ethers.providers.JsonRpcProvider(rpc);

const wallet = new Wallet(privateKey).connect(provider);

const predictionsContractAddress: string = process.env.NODE_ENV === 'production' ? process.env.PREDICTIONS_CONTRACT_ADDRESS! : process.env.GANACHE_PREDICTIONS_CONTRACT_ADDRESS!;

enum PredictionsEvents {
    StartRound = 'StartRound'
}

export const StartBlockchainListener = async (token: Token) => {
    const PredictionsContract = new ethers.Contract(predictionsContractAddress, PredictionsAbi, provider);
    const roundNumber = await getRoundNumber(PredictionsContract);
    const roundInfo = await getRoundInfo(roundNumber, PredictionsContract);

    await determineNextRound(PredictionsContract, token, roundInfo.lockTimestamp);

    PredictionsContract.on(PredictionsEvents.StartRound, async (round: BigInt, price: BigInt, lockTimestamp: BigInt, closeTimestamp: BigInt) => {
        const now = Math.round((new Date()).getTime() / 1000);
        const timestamp = new Date(Number(lockTimestamp)).getTime();

        setTimeout(async () => {
            await lockRound(PredictionsContract, token);
        }, ((timestamp - now) * 1000) + 2000);
    });
    console.log('Listening')
}

const determineNextRound = async (contract: Contract, token: Token, lockTimestamp: BigInt) => {
    const now = Math.round((new Date()).getTime() / 1000);
    const timestamp = new Date(Number(lockTimestamp)).getTime();

    if (Number(now) > Number(timestamp)) {
        await lockRound(contract, token);
        return;
    }

    setTimeout(async () => {
        await lockRound(contract, token);
    }, ((timestamp - now) * 1000) + 2000);
}

const lockRound = async (contract: Contract, token: Token) => {
    const {price} = await getPairPrice(token);
    const bigPrice = price.split('.')[0] + price.split('.')[1];
    try {
        const tx = await contract.connect(wallet).lockRound(bigPrice.toString());
        await tx.wait();
    } catch (e) {
        console.log(e.reason);
    }
}

const getPairPrice = async (token: Token): Promise<TokenPrice> => {
    const priceRequest = await axios.get<TokenPrice>(`https://api.binance.com/api/v3/ticker/price?symbol=${token}USDT`);
    const {data} = priceRequest;
    return data as TokenPrice;
}

const getRoundInfo = async (roundNumber: BigInt, contract: Contract): Promise<RoundInfo> => {
    const info = await contract.round(roundNumber.toString());
    return info;
}

const getRoundNumber = async (contract: Contract): Promise<BigInt> => {
    const round: BigInt = await contract.currentRound();
    return round;
}