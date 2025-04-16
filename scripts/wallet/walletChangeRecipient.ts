import { Address } from '@ton/core';
import { VestingWallet } from '../../wrappers/VestingWallet';
import { NetworkProvider } from '@ton/blueprint';

const VESTING_WALLET_CONTRACT_ADDRESS = "EQAvPePAY56rPqNxWb5UcJVBGEt8utakfclW_yuNukJRqui7";

export async function run(provider: NetworkProvider) {
  try {
    const walletAddress = Address.parse(VESTING_WALLET_CONTRACT_ADDRESS);
    const vestingWallet = provider.open(VestingWallet.createFromAddress(walletAddress));
    
    let newRecipientAddress = Address.parse("UQBsQBAHy5FOWkOHrLDGDwlpEOhDerGg73Hb0RNTiJDpmiBM");
    
    await vestingWallet.changeRecipient(
      provider.provider(walletAddress),
      provider.sender(),
      {
        newRecipientAddress: newRecipientAddress
      }
    );
    
    console.log('Change recipient transaction sent successfully!');
    
    return {
      success: true,
    };
  } catch (error) {
    console.error('Error canceling vesting:', error);
    throw error;
  }
}