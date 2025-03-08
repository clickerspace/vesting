import { Address } from '@ton/core';
import { VestingWallet } from '../../wrappers/VestingWallet';
import { NetworkProvider } from '@ton/blueprint';

const WALLET_CONTRACT_ADDRESS = "EQC7j71S6G8OixtM-ipvKP3OO3IiXVkLiRQ5VEuJhFE-SGaU";

export async function run(provider: NetworkProvider) {
  try {
    const walletAddress = Address.parse(WALLET_CONTRACT_ADDRESS);
    const vestingWallet = provider.open(VestingWallet.createFromAddress(walletAddress));
    
    let newOwnerAddress = Address.parse("0QA_aYew2jqj8gNdkeg-KDw8YB8ovTkKNNj02aMwpAZxNwP5");
    
    await vestingWallet.updateOwner(
      provider.provider(walletAddress),
      provider.sender(),
      {
        newOwnerAddress: newOwnerAddress
      }
    );
    
    console.log('Change owner transaction sent successfully!');
    
    return {
      success: true,
    };
  } catch (error) {
    console.error('Error changing owner:', error);
    throw error;
  }
}