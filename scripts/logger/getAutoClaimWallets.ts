import { Address } from '@ton/core';
import { NetworkProvider } from '@ton/blueprint';
import { VestingLogger } from '../../wrappers/VestingLogger';

const LOGGER_CONTRACT_ADDRESS = "EQDwtJ3ddneadY69XbHSz02DWAsbB7Hyziiyegn1arlEEuOu";

export async function run(provider: NetworkProvider) {
  try {
    console.log('Fetching Vesting Auto Claims Wallets...');
    
    const loggerAddress = Address.parse(LOGGER_CONTRACT_ADDRESS);
    const vestingLogger = provider.open(VestingLogger.createFromAddress(loggerAddress));
    
    const autoClaimWallets = await vestingLogger.getAutoClaimWallets();
    
    console.log('\n===== VESTING AUTO CLAIMS WALLETS =====');
    console.log('Contract Address:', loggerAddress.toString());
    console.log('Auto Claims Wallets:', autoClaimWallets.toString());
    
    return {
      success: true,
      data: {
        address: loggerAddress.toString(),
        autoClaimWallets: autoClaimWallets.toString(),
      }
    };
  } catch (error) {
    console.error('Error fetching auto claims wallets:', error);
    throw error;
  }
}