import { Address, fromNano, toNano } from '@ton/core';
import { VestingWallet } from '../../wrappers/VestingWallet';
import { NetworkProvider } from '@ton/blueprint';

const WALLET_CONTRACT_ADDRESS = "EQC7j71S6G8OixtM-ipvKP3OO3IiXVkLiRQ5VEuJhFE-SGaU";
const WALLET_JETTON_ADDRESS = "EQCt901gdymDKo0ThDs2VSYnz93FobQ3h4tCu1xdNNZhgW11";

export async function run(provider: NetworkProvider) {
  try {
    console.log('Checking claimable tokens...');
    
    const walletAddress = Address.parse(WALLET_CONTRACT_ADDRESS);
    const vestingWallet = provider.open(VestingWallet.createFromAddress(walletAddress));
    
    const claimableAmount = await vestingWallet.getClaimableAmount();
    
    if (claimableAmount <= 0n) {
      console.log('No tokens available to claim at this time.');
      return { success: false, reason: 'No claimable tokens' };
    }
    
    console.log(`\nClaiming ${fromNano(claimableAmount)} unlocked tokens...`);
    
    let jettonWalletAddress = Address.parse(WALLET_JETTON_ADDRESS);
    
    const forwardTonAmount = toNano('0.3');
    await vestingWallet.claimUnlocked(
      provider.provider(walletAddress),
      provider.sender(),
      {
        forwardTonAmount,
        jettonWalletAddress
      }
    );
    
    console.log('Claim transaction sent successfully!');
    console.log(`Claimed amount: ${fromNano(claimableAmount)} tokens`);
    
    try {
      const remainingClaimable = await vestingWallet.getClaimableAmount();
      if (remainingClaimable > 0n) {
        console.log(`\nNote: There are still ${fromNano(remainingClaimable)} tokens available to claim.`);
      }
    } catch (e) {}
    
    return {
      success: true,
      amount: fromNano(claimableAmount),
    };
  } catch (error) {
    console.error('Error claiming tokens:', error);
    throw error;
  }
}