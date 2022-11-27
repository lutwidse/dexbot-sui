import { JsonRpcProvider, Ed25519Keypair, RawSigner, getObjectId, getNewlyCreatedCoinRefsAfterSplit} from '@mysten/sui.js';
import { generateMnemonic } from 'bip39';
import { writeFileSync } from 'fs';

const URI = 'devnet.sui.io/'
const RPC = 'https://fullnode.' + URI
const FAUCET = 'https://faucet.' + URI + 'gas'
const TRANSFER_GAS_AMOUNT = 2000
const GAS_BUDGET = 10

async function airdrop() {
    const provider = new JsonRpcProvider((RPC), {
        faucetURL: (FAUCET)
    });
    
    console.log('[Generating Genesis Address]')
    const genesis_mnemonic = generateMnemonic()
    const genesis_keypair = Ed25519Keypair.deriveKeypair(genesis_mnemonic);
    const genesis_signer = new RawSigner(genesis_keypair, provider);
    await genesis_signer.getAddress().then((value) => {
        console.log('0x' + value)
    })
    console.log('[Requesting Genesis Gas]')
    await provider.requestSuiFromFaucet(
        await genesis_signer.getAddress()
    );
    console.log('[Success]')

    while (true) {
        console.log('[Generating Address]')
        const mnemonic = generateMnemonic()
        const keypair = Ed25519Keypair.deriveKeypair(mnemonic);
        const signer = new RawSigner(keypair, provider);
        await signer.getAddress().then((value) => {
            console.log('0x' + value)
        })

        console.log('[Transfer Gas]')
        const coins = await provider.selectCoinsWithBalanceGreaterThanOrEqual(
            await genesis_signer.getAddress().then((value) => {
                return ('0x' + value)
            }),
            BigInt(TRANSFER_GAS_AMOUNT)
        );

        const splitTxn = await genesis_signer.splitCoin({
            coinObjectId: getObjectId(coins[0]),
            splitAmounts: [TRANSFER_GAS_AMOUNT],
            gasBudget: GAS_BUDGET**3,
            gasPayment: getObjectId(coins[1]),
        });

        const splitCoins = getNewlyCreatedCoinRefsAfterSplit(splitTxn)!.map((c) =>
        getObjectId(c)
      );

        await genesis_signer.pay({
            inputCoins: splitCoins,
            gasBudget: GAS_BUDGET**2,
            recipients: [await signer.getAddress().then((value) => {
                return ('0x' + value)
            })],
            amounts: [TRANSFER_GAS_AMOUNT],
            gasPayment: getObjectId(coins[2]),
        });
        console.log('[Success]')

        console.log('[Minting NFT]')
        signer.executeMoveCall({
            packageObjectId: '0x2',
            module: 'devnet_nft',
            function: 'mint',
            typeArguments: [],
            arguments: [
                'Example NFT',
                'An NFT created by Sui Wallet',
                'ipfs://QmZPWWy5Si54R3d26toaqRiqvCH7HkGdXkxwUgCm2oKKM2?filename=img-sq-01.png',
            ],
            gasBudget: GAS_BUDGET**3 * 1.5,
        });
        console.log('[Success]')

        console.log('[Save Mnemonic]')
        writeFileSync('./airdrop-mnemonic-devnet.txt', mnemonic + '\n', {
            flag: 'a+',
        })
        console.log('[Success] \n')
    }
}

airdrop();