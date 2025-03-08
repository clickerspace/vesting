import { Address, toNano } from '@ton/core';
import { VestingWallet } from '../../wrappers/VestingWallet';
import { NetworkProvider } from '@ton/blueprint';

const WALLET_CONTRACT_ADDRESS = "EQC7j71S6G8OixtM-ipvKP3OO3IiXVkLiRQ5VEuJhFE-SGaU";
const RECIPIENT_ADDRESS = "0QA_aYew2jqj8gNdkeg-KDw8YB8ovTkKNNj02aMwpAZxNwP5";
const WALLET_JETTON_ADDRESS = "EQDJgMFoNAo9Rhc4NnmPeUo2gLFJkPbMKnvoZ23rGH3FgX96";

const TOKEN_AMOUNT = 100;

export async function run(provider: NetworkProvider) {
  try {
    const walletAddress = Address.parse(WALLET_CONTRACT_ADDRESS);
    const recipientAddress = Address.parse(RECIPIENT_ADDRESS);
    const amount = toNano(TOKEN_AMOUNT);
    
    console.log(`Sending ${TOKEN_AMOUNT} tokens from ${walletAddress.toString()} to ${recipientAddress.toString()}...`);
    
    const vestingWallet = provider.open(VestingWallet.createFromAddress(walletAddress));
    
    
    const forwardAmount = toNano('0.1');
    await vestingWallet.sendJettons(provider.sender(), {
      toAddress: provider.sender().address!,
      jettonAmount: amount,
      forwardTonAmount: forwardAmount,
      jettonWalletAddress: Address.parse(WALLET_JETTON_ADDRESS)
    });
    
    console.log('Token transfer transaction sent successfully!');
    
    return {
      success: true,
      from: walletAddress.toString(),
      to: recipientAddress.toString(),
      amount: TOKEN_AMOUNT,
    };
  } catch (error) {
    console.error('Error sending tokens:', error);
    throw error;
  }
}