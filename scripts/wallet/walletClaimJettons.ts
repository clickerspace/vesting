import { Address, fromNano, toNano } from '@ton/core';
import { VestingWallet } from '../../wrappers/VestingWallet';
import { NetworkProvider } from '@ton/blueprint';

const VESTING_WALLET_CONTRACT_ADDRESS = "EQDqELzrZrYZYw-12Y0oUW2PKkXab1AL-TlEaj9z505vD6WX";
const WALLET_JETTON_ADDRESS = "EQA65HBcnJoIS_k3vxzmfFHgw2bWjVjCZv6mBoB7-4lIUPiA";

export async function run(provider: NetworkProvider) {
  try {
    console.log('Checking claimable tokens...');
    
    const walletAddress = Address.parse(VESTING_WALLET_CONTRACT_ADDRESS);
    const vestingWallet = provider.open(VestingWallet.createFromAddress(walletAddress));
    
    const claimableAmount = await vestingWallet.getClaimableAmount();
    
    if (claimableAmount <= 0n) {
      console.log('No tokens available to claim at this time.');
      return { success: false, reason: 'No claimable tokens' };
    }
    
    console.log(`\nClaiming ${fromNano(claimableAmount)} unlocked tokens...`);
    
    let jettonWalletAddress = Address.parse(WALLET_JETTON_ADDRESS);
    
    const forwardTonAmount = toNano('0.3');
    await vestingWallet.sendClaimUnlocked(
      provider.sender(),
      {
        forwardTonAmount,
        jettonWalletAddress
      }
    );
    
    console.log('Claim transaction sent successfully!');
    console.log(`Claimed amount: ${fromNano(claimableAmount)} tokens`);

    
    return {
      success: true,
      amount: fromNano(claimableAmount),
    };
  } catch (error) {
    console.error('Error claiming tokens:', error);
    throw error;
  }
}