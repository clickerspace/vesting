import { Address } from '@ton/core';
import { NetworkProvider } from '@ton/blueprint';
import { VestingLogger } from '../../wrappers/VestingLogger';

const LOGGER_CONTRACT_ADDRESS = "EQC0NhTjPYog8tLqC87t33IAyWz82eX0wv1lfd4R5joQ8kH0";

export async function run(provider: NetworkProvider) {
  try {
    console.log('Fetching Vesting Owner information...');
    
    const loggerAddress = Address.parse(LOGGER_CONTRACT_ADDRESS);
    const vestingLogger = provider.open(VestingLogger.createFromAddress(loggerAddress));
    
    const owner = await vestingLogger.getOwner();
    
    console.log('\n===== VESTING OWNER INFORMATION =====');
    console.log('Contract Address:', loggerAddress.toString());
    console.log('Owner Address:', owner.toString());
    
    return {
      success: true,
      data: {
        address: loggerAddress.toString(),
        owner: owner.toString(),
      }
    };
  } catch (error) {
    console.error('Error fetching owner information:', error);
    throw error;
  }
}