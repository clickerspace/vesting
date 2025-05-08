import { Address } from '@ton/core';
import { NetworkProvider } from '@ton/blueprint';
import { VestingLogger } from '../../wrappers/VestingLogger';

const LOGGER_CONTRACT_ADDRESS = "EQC0NhTjPYog8tLqC87t33IAyWz82eX0wv1lfd4R5joQ8kH0";

export async function run(provider: NetworkProvider) {
  try {
    console.log('Fetching Vesting Owner Wallets...');
    
    const loggerAddress = Address.parse(LOGGER_CONTRACT_ADDRESS);
    const vestingLogger = provider.open(VestingLogger.createFromAddress(loggerAddress));
    
    const ownerWalletsOld = await vestingLogger.getOwnerWallets(provider.sender().address!);
    const ownerWalletsNew = await vestingLogger.getOwnerWallets(Address.parse("0QA_aYew2jqj8gNdkeg-KDw8YB8ovTkKNNj02aMwpAZxNwP5"));
    
    console.log('\n===== VESTING OWNER WALLETS =====');
    console.log('Contract Address:', loggerAddress.toString());
    console.log('Owner Wallets Old:', ownerWalletsOld);
    console.log('Owner Wallets New:', ownerWalletsNew);
  
  } catch (error) {
    console.error('Error fetching owner wallets:', error);
    throw error;
  }
}