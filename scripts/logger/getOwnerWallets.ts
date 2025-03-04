import { Address } from '@ton/core';
import { NetworkProvider } from '@ton/blueprint';
import { VestingLogger } from '../../wrappers/VestingLogger';

const LOGGER_CONTRACT_ADDRESS = "EQDwtJ3ddneadY69XbHSz02DWAsbB7Hyziiyegn1arlEEuOu";

export async function run(provider: NetworkProvider) {
  try {
    console.log('Fetching Vesting Owner Wallets...');
    
    const loggerAddress = Address.parse(LOGGER_CONTRACT_ADDRESS);
    const vestingLogger = provider.open(VestingLogger.createFromAddress(loggerAddress));
    
    const ownerWallets = await vestingLogger.getOwnerWallets(provider.sender().address!);
    
    console.log('\n===== VESTING OWNER WALLETS =====');
    console.log('Contract Address:', loggerAddress.toString());
    console.log("Owner Address:", provider.sender().address!.toString());
    console.log('Owner Wallets:', ownerWallets.toString());
    
    return {
      success: true,
      data: {
        address: loggerAddress.toString(),
        ownerWallets: ownerWallets.toString(),
      }
    };
  } catch (error) {
    console.error('Error fetching owner wallets:', error);
    throw error;
  }
}