import { Address, fromNano } from '@ton/core';
import { VestingMaster } from '../../wrappers/VestingMaster';
import { NetworkProvider } from '@ton/blueprint';

const MASTER_CONTRACT_ADDRESS = "EQDpmZ3Eao57wQzD7U7PeU9VQq-APUUNmohJ8XK5J-w_noFK";
const NEW_ROYALTY_FEE = 200000000; // 0.2 TON

export async function run(provider: NetworkProvider) {
  try {
    console.log('Changing royalty fee of the Vesting Master contract...');
  
    const masterAddress = Address.parse(MASTER_CONTRACT_ADDRESS);
    const vestingMaster = provider.open(VestingMaster.createFromAddress(masterAddress));
    
    const currentRoyaltyFee = await vestingMaster.getRoyaltyFee();
    console.log('Current royalty fee:', fromNano(currentRoyaltyFee), 'TON');
    console.log('New royalty fee:', fromNano(BigInt(NEW_ROYALTY_FEE)), 'TON');
    if (currentRoyaltyFee === BigInt(NEW_ROYALTY_FEE)) {
      throw new Error('Royalty fee is already set to the desired value');
    }
    
    const newRoyaltyFee = BigInt(NEW_ROYALTY_FEE);
    
    console.log(`Changing royalty fee from ${currentRoyaltyFee} to ${newRoyaltyFee}...`);
    await vestingMaster.sendSetRoyaltyFee(
      provider.sender(),
      newRoyaltyFee
    );
    
    console.log('Royalty fee change transaction sent successfully!');
    
    return {
      success: true,
      newRoyaltyFee: newRoyaltyFee.toString()
    };
  } catch (error) {
    console.error('Error changing royalty fee:', error);
    throw error;
  }
}