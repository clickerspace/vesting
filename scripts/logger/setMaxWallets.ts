import { Address } from '@ton/core';
import { NetworkProvider } from '@ton/blueprint';
import { VestingLogger } from '../../wrappers/VestingLogger';

const LOGGER_CONTRACT_ADDRESS = "EQC0NhTjPYog8tLqC87t33IAyWz82eX0wv1lfd4R5joQ8kH0";

export async function run(provider: NetworkProvider) {
  try {
    console.log('Setting Max Wallets...');
    
    const loggerAddress = Address.parse(LOGGER_CONTRACT_ADDRESS);
    const vestingLogger = provider.open(VestingLogger.createFromAddress(loggerAddress));
    
    const maxWallets = 3000;
    await vestingLogger.sendSetMaxWallets(provider.sender(), { maxWallets });
    
  } catch (error) {
    console.error('Error setting max wallets:', error);
    throw error;
  }
}