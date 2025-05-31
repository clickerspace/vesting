import { Address, toNano } from '@ton/core';
import { VestingWallet } from '../../wrappers/VestingWallet';
import { NetworkProvider } from '@ton/blueprint';

const VESTING_WALLET_CONTRACT_ADDRESS = "EQAvPePAY56rPqNxWb5UcJVBGEt8utakfclW_yuNukJRqui7";

export async function run(provider: NetworkProvider) {
  try {
    const walletAddress = Address.parse(VESTING_WALLET_CONTRACT_ADDRESS);
    const vestingWallet = provider.open(VestingWallet.createFromAddress(walletAddress));
    
    let jettonWalletAddress = Address.parse("EQBdrXrlWC9d8OmySn41pi17kp0QoWTMJQl6YcT1DDuqDyZj");
    
    const forwardTonAmount = toNano('0.1');
    await vestingWallet.sendCancelVesting(
      provider.sender(),
      {
        forwardTonAmount,
        jettonWalletAddress
      }
    );
    
    console.log('Cancel transaction sent successfully!');
    
    return {
      success: true,
    };
  } catch (error) {
    console.error('Error canceling vesting:', error);
    throw error;
  }
}