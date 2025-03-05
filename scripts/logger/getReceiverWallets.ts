import { Address } from '@ton/core';
import { NetworkProvider } from '@ton/blueprint';
import { VestingLogger } from '../../wrappers/VestingLogger';

const LOGGER_CONTRACT_ADDRESS = "EQBz4a1gZCUZCLlPD_XgLY84PDdfZ6mfE64vHa0RuNXjeEOO";

export async function run(provider: NetworkProvider) {
  try {
    console.log('Fetching Vesting Receiver Wallets...');
    
    const loggerAddress = Address.parse(LOGGER_CONTRACT_ADDRESS);
    const vestingLogger = provider.open(VestingLogger.createFromAddress(loggerAddress));
    
    const receiverWalletsOld = await vestingLogger.getReceiverWallets(provider.sender().address!);
    const receiverWalletsNew = await vestingLogger.getReceiverWallets(Address.parse("0QA_aYew2jqj8gNdkeg-KDw8YB8ovTkKNNj02aMwpAZxNwP5"));
    
    console.log('\n===== VESTING RECEIVER WALLETS =====');
    console.log('Contract Address:', loggerAddress.toString());
    console.log('Receiver Wallets Old:', receiverWalletsOld);
    console.log('Receiver Wallets New:', receiverWalletsNew);

  } catch (error) {
    console.error('Error fetching receiver wallets:', error);
    throw error;
  }
}