import { Address } from '@ton/core';
import { NetworkProvider } from '@ton/blueprint';
import { VestingLogger } from '../../wrappers/VestingLogger';

const LOGGER_CONTRACT_ADDRESS = "EQC0NhTjPYog8tLqC87t33IAyWz82eX0wv1lfd4R5joQ8kH0";
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

   
    const ownerWalletsNew = await vestingLogger.getOwnerWallets(Address.parse("UQBsQBAHy5FOWkOHrLDGDwlpEOhDerGg73Hb0RNTiJDpmiBM"));
    const receiverWalletsNew = await vestingLogger.getReceiverWallets(Address.parse("UQBsQBAHy5FOWkOHrLDGDwlpEOhDerGg73Hb0RNTiJDpmiBM"));
    
    const totalWalletCount = await vestingLogger.getTotalWalletCount();
    const maxWalletCount = await vestingLogger.getMaxWalletCount();

    console.log('\n===== VESTING LOGGER INFORMATION =====');
    console.log('Contract Address:', loggerAddress.toString());
    console.log('Owner Address:', owner.toString());
    console.log("----")
    console.log('Token Wallets:', tokenWallets);
    console.log('Owner Wallets:', ownerWallets);
    console.log('Receiver Wallets:', receiverWallets);
    console.log('Auto Claim Wallets:', autoClaimWallets);
    console.log("----")
    console.log('Owner Wallets New:', ownerWalletsNew);
    console.log('Receiver Wallets New:', receiverWalletsNew);
    console.log("----")
    console.log('Total Wallet Count:', totalWalletCount);
    console.log('Max Wallet Count:', maxWalletCount);
    
  } catch (error) {
    console.error('Error fetching logger information:', error);
    throw error;
  }
}