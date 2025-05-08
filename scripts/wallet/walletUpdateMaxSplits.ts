import { Address } from '@ton/core';
import { VestingWallet } from '../../wrappers/VestingWallet';
import { NetworkProvider } from '@ton/blueprint';

const VESTING_WALLET_CONTRACT_ADDRESS = "EQDAybZbwQcnUsiYjd2Y5uWH_UxcU5XbEPee0lEm2KyhCD6I";

export async function run(provider: NetworkProvider) {
  try {
    const walletAddress = Address.parse(VESTING_WALLET_CONTRACT_ADDRESS);
    const vestingWallet = provider.open(VestingWallet.createFromAddress(walletAddress));
    
    let newMaxSplits = 10;
    
    await vestingWallet.sendUpdateMaxSplits(
      provider.sender(),
      {
        newMaxSplits: newMaxSplits
      }
    );
    
    console.log('Update max splits transaction sent successfully!');
    
  } catch (error) {
    console.error('Error updating max splits:', error);
    throw error;
  }
}