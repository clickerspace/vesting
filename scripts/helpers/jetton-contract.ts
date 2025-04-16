import { Address, beginCell, TonClient } from '@ton/ton';
import { NetworkProvider } from '@ton/blueprint';

const API_KEY = 'b5982aadb3cf1211ff804df20704e55ec92439365b39858a4c3990794f080126';
const JETTON_MASTER_ADDRESS = "kQBQCVW3qnGKeBcumkLVD6x_K2nehE6xC5VsCyJZ02wvUBJy";
const VESTING_WALLET_CONTRACT_ADDRESS = "EQDqELzrZrYZYw-12Y0oUW2PKkXab1AL-TlEaj9z505vD6WX";

export async function run(provider: NetworkProvider) {
    const client = new TonClient({ endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC', apiKey: API_KEY });

    try {
        const contractAddressCell = beginCell().storeAddress(Address.parse(VESTING_WALLET_CONTRACT_ADDRESS)).endCell();

        const response = await client.runMethod(Address.parse(JETTON_MASTER_ADDRESS), 'get_wallet_address', [
            { type: 'slice', cell: contractAddressCell },
        ]);

        const newJettonWalletAddress = response.stack.readAddress();
        console.log('newJettonWalletAddress: ', newJettonWalletAddress);
    } catch (error) {
        console.error('Error during get_wallet_address:', error);
        throw error;
    }
}
