import { Address } from '@ton/core';
import { NetworkProvider } from '@ton/blueprint';
import { VestingLogger } from '../../wrappers/VestingLogger';

const LOGGER_CONTRACT_ADDRESS = "EQDwtJ3ddneadY69XbHSz02DWAsbB7Hyziiyegn1arlEEuOu";
const JETTON_MASTER_ADDRESS = "kQBQCVW3qnGKeBcumkLVD6x_K2nehE6xC5VsCyJZ02wvUBJy";

export async function run(provider: NetworkProvider) {
  try {
    console.log('Fetching Vesting Logger information...');
    
    const loggerAddress = Address.parse(LOGGER_CONTRACT_ADDRESS);
    const vestingLogger = provider.open(VestingLogger.createFromAddress(loggerAddress));
    
    const owner = await vestingLogger.getOwner();
    const tokenWallets = await vestingLogger.getTokenWallets(Address.parse(JETTON_MASTER_ADDRESS));
    const ownerWallets = await vestingLogger.getOwnerWallets(provider.sender().address!);
    const receiverWallets = await vestingLogger.getReceiverWallets(provider.sender().address!);
    const autoClaimWallets = await vestingLogger.getAutoClaimWallets();
    
    console.log('\n===== VESTING LOGGER INFORMATION =====');
    console.log('Contract Address:', loggerAddress.toString());
    console.log('Owner Address:', owner.toString());
    console.log('Token Wallets:', tokenWallets);
    console.log('Owner Wallets:', ownerWallets);
    console.log('Receiver Wallets:', receiverWallets);
    console.log('Auto Claim Wallets:', autoClaimWallets);
    
    return {
      success: true,
      data: {
        address: loggerAddress.toString(),
        owner: owner.toString(),
        tokenWallets: tokenWallets,
        ownerWallets: ownerWallets,
        receiverWallets: receiverWallets,
        autoClaimWallets: autoClaimWallets
      }
    };
  } catch (error) {
    console.error('Error fetching logger information:', error);
    throw error;
  }
}