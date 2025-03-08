import { Address, fromNano, toNano } from '@ton/core';
import { VestingWallet } from '../../wrappers/VestingWallet';
import { NetworkProvider } from '@ton/blueprint';

const WALLET_CONTRACT_ADDRESS = "EQC7j71S6G8OixtM-ipvKP3OO3IiXVkLiRQ5VEuJhFE-SGaU";
const WALLET_JETTON_ADDRESS = "EQDxYhhB0LQ4-MhDtXOY1I_mbR1AzxJghEw5YQbzo4A4lKbg";

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
    
    // Get the current seqno
    const seqno = await vestingWallet.getSeqno();
    console.log(`Current seqno: ${seqno}`);
    
    // Set expiration time to 5 minutes from now
    const validUntil = Math.floor(Date.now() / 1000) + 2 * 60;
    console.log(`Message valid until: ${new Date(validUntil * 1000).toISOString()}`);
    
    const forwardTonAmount = toNano('0.2');
    await vestingWallet.sendClaimUnlockedExternal(
        seqno,
        validUntil,
        {
          forwardTonAmount,
          jettonWalletAddress
        }
    );
    
    console.log('Claim transaction sent successfully!');
    
    return {
      success: true,
      amount: fromNano(claimableAmount),
    };
  } catch (error) {
    console.error('Error claiming tokens:', error);
    throw error;
  }
}