import { Address, fromNano, toNano } from '@ton/core';
import { VestingWallet } from '../../wrappers/VestingWallet';
import { NetworkProvider } from '@ton/blueprint';

const VESTING_WALLET_CONTRACT_ADDRESS = "EQAvPePAY56rPqNxWb5UcJVBGEt8utakfclW_yuNukJRqui7";

export async function run(provider: NetworkProvider) {
  try {
    console.log('Relocking tokens...');
    
    const walletAddress = Address.parse(VESTING_WALLET_CONTRACT_ADDRESS);
    const vestingWallet = provider.open(VestingWallet.createFromAddress(walletAddress));

    await vestingWallet.sendRelock(
      provider.sender(),
      {
        newDuration: 3600 // 1 HOUR
      }
    );
    
    console.log('Relock transaction sent successfully!');

    
 
  } catch (error) {
    console.error('Error relocking tokens:', error);
    throw error;
  }
}