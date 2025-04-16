import { Address, fromNano, toNano } from '@ton/core';
import { VestingWallet } from '../../wrappers/VestingWallet';
import { NetworkProvider } from '@ton/blueprint';

const VESTING_WALLET_CONTRACT_ADDRESS = "EQDOSJucHM8GVcDCN5oOl2GNpKw9CGEQLw8SR08hZzTMdNmI";
const NEW_OWNER_ADDRESS = "0QARfBT9PMJ_TjX8bUqFvI-ZMqixM7kY68_-7tmVm-khfOyj";
const NEW_RECIPIENT_ADDRESS = "0QARfBT9PMJ_TjX8bUqFvI-ZMqixM7kY68_-7tmVm-khfOyj";
const JETTON_WALLET_ADDRESS = "EQCXXLm88n3BbSVhwU7gAvmulXUnqHaOTD-CWx_uSzrbna_f";

export async function run(provider: NetworkProvider) {
  try {
    console.log('Split vesting..');
    
    const walletAddress = Address.parse(VESTING_WALLET_CONTRACT_ADDRESS);
    const vestingWallet = provider.open(VestingWallet.createFromAddress(walletAddress));

    await vestingWallet.sendSplitVesting(
      provider.sender(),
      {
        splitAmount: toNano(5),
        newOwnerAddress: Address.parse(NEW_OWNER_ADDRESS),
        newRecipientAddress: Address.parse(NEW_RECIPIENT_ADDRESS),
        forwardTonAmount: toNano(0.2),
        jettonWalletAddress: Address.parse(JETTON_WALLET_ADDRESS)
      }
    );
    
    console.log('Split vesting transaction sent successfully!');
 
  } catch (error) {
    console.error('Error splitting vesting:', error);
    throw error;
  }
}