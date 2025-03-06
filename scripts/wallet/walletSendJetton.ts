import { Address, toNano } from '@ton/core';
import { VestingWallet } from '../../wrappers/VestingWallet';
import { NetworkProvider } from '@ton/blueprint';

const WALLET_CONTRACT_ADDRESS = "EQDsQgwQSIgfq1ekifYmv_0EaWBtgzKmd18TtpfvyaO1UDP0";
const RECIPIENT_ADDRESS = "0QARfBT9PMJ_TjX8bUqFvI-ZMqixM7kY68_-7tmVm-khfOyj";
const WALLET_JETTON_ADDRESS = "EQAKTxgtOaizaI_QNammT20sb2v0j8-wvbJULduGoKUqNiuc";

const TOKEN_AMOUNT = 50;

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