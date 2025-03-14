import { Address } from '@ton/core';
import { VestingWallet } from '../../wrappers/VestingWallet';
import { NetworkProvider } from '@ton/blueprint';

const WALLET_CONTRACT_ADDRESS = "EQC15NPd2rLyvk7hBoQKOVecqcCh3DUg2dtJf-BhxC8EiY7W";

export async function run(provider: NetworkProvider) {
  try {
    const walletAddress = Address.parse(WALLET_CONTRACT_ADDRESS);
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