import { Address } from '@ton/core';
import { NetworkProvider } from '@ton/blueprint';
import { VestingLogger } from '../../wrappers/VestingLogger';

const LOGGER_CONTRACT_ADDRESS = "EQAfX02OTBZbatuDEMnOIzwzkyUjpMh_Bp5duUanOK2xkw4-";

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