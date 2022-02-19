import {Contract, ethers, Wallet} from "ethers";
import {PredictionsAbi} from "../utils/abi/predictions";
import axios from "axios";
import Web3 from "web3";

const privateKey: string = process.env.NODE_ENV === 'production' ? process.env.TREASURY_PRIVATE_KEY! : process.env.GANACHE_PRIVATE_KEY!;
const rpc: string = process.env.NODE_ENV === 'production' ? process.env.JSON_RPC_PROVIDER! : process.env.GANACHE_JSON_RPC_PROVIDER!;
export const provider = new ethers.providers.JsonRpcProvider(rpc);

const wallet = new Wallet(privateKey, provider);

const predictionsContractAddress: string = process.env.NODE_ENV === 'production' ? process.env.PREDICTIONS_CONTRACT_ADDRESS! : process.env.GANACHE_PREDICTIONS_CONTRACT_ADDRESS!;

enum PredictionsEvents {
    StartRound = 'StartRound'
}

const web3: Web3 = new Web3(new Web3.providers.HttpProvider(rpc));

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
        }, ((timestamp - now) * 1000) + 5000);
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

    const timeDifference = ((timestamp - now) * 1000) + 5000;

    setTimeout(async () => {
        await lockRound(contract, token);
    }, timeDifference);
}

const lockRound = async (contract: Contract, token: Token) => {
    const {price} = await getPairPrice(token);
    const bigPrice = price.split('.')[0] + price.split('.')[1];
    try {
        const PredictionsContractWeb3 = new web3.eth.Contract(PredictionsAbi as any, predictionsContractAddress);
        const tx = PredictionsContractWeb3.methods.lockRound(bigPrice.toString());
        const gasPrice: string = await web3.eth.getGasPrice();
        const nonce = await web3.eth.getTransactionCount(wallet.address);
        let gas: BigInt;

        try {
            gas = await tx.estimateGas({from: wallet.address});
        } catch (e) {
            console.log(e);
            return;
        }

        const data = tx.encodeABI();

        const transactionConfig = {
            chainId: 137,
            to: predictionsContractAddress,
            gasPrice,
            nonce,
            gas: (BigInt(gas.toString()) * BigInt(3)).toString(),
            data
        };

        try {
            const signedTx = await web3.eth.accounts.signTransaction(transactionConfig, privateKey);

            const result = await web3.eth.sendSignedTransaction(signedTx.rawTransaction!);

            console.log(`${new Date().getDate()} ${new Date().getTime()}`,result.transactionHash)
        } catch(e) {
            console.log("Failed to send transaction.");
            throw e;
        }
        return;
    } catch (e) {
        console.log('error')
        console.log(e);
        throw e;
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