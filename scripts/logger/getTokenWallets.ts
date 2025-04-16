import { Address } from '@ton/core';
import { NetworkProvider } from '@ton/blueprint';
import { VestingLogger } from '../../wrappers/VestingLogger';

const LOGGER_CONTRACT_ADDRESS = "EQAfX02OTBZbatuDEMnOIzwzkyUjpMh_Bp5duUanOK2xkw4-";

export async function run(provider: NetworkProvider) {
  try {
    console.log('Fetching Vesting Token Wallets...');
    
    const loggerAddress = Address.parse(LOGGER_CONTRACT_ADDRESS);
    const vestingLogger = provider.open(VestingLogger.createFromAddress(loggerAddress));
    
    const tokenWalletsOld = await vestingLogger.getTokenWallets(provider.sender().address!);
    const tokenWalletsNew = await vestingLogger.getTokenWallets(Address.parse("0QA_aYew2jqj8gNdkeg-KDw8YB8ovTkKNNj02aMwpAZxNwP5"));
    
    console.log('\n===== VESTING TOKEN WALLETS =====');
    console.log('Contract Address:', loggerAddress.toString());
    console.log('Token Wallets Old:', tokenWalletsOld);
    console.log('Token Wallets New:', tokenWalletsNew);
    
  } catch (error) {
    console.error('Error fetching token wallets:', error);
    throw error;
  }
}