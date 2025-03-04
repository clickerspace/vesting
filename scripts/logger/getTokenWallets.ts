import { Address } from '@ton/core';
import { NetworkProvider } from '@ton/blueprint';
import { VestingLogger } from '../../wrappers/VestingLogger';

const LOGGER_CONTRACT_ADDRESS = "EQDwtJ3ddneadY69XbHSz02DWAsbB7Hyziiyegn1arlEEuOu";
const JETTON_MASTER_ADDRESS = "kQBQCVW3qnGKeBcumkLVD6x_K2nehE6xC5VsCyJZ02wvUBJy";

export async function run(provider: NetworkProvider) {
  try {
    console.log('Fetching Vesting Token Wallets...');
    
    const loggerAddress = Address.parse(LOGGER_CONTRACT_ADDRESS);
    const vestingLogger = provider.open(VestingLogger.createFromAddress(loggerAddress));
    
    const tokenWallets = await vestingLogger.getTokenWallets(Address.parse(JETTON_MASTER_ADDRESS));
    
    console.log('\n===== VESTING TOKEN WALLETS =====');
    console.log('Contract Address:', loggerAddress.toString());
    console.log("Token Master Address:", JETTON_MASTER_ADDRESS);
    console.log('Token Wallets:', tokenWallets.toString());
    
    return {
      success: true,
      data: {
        address: loggerAddress.toString(),
        tokenWallets: tokenWallets.toString(),
      }
    };
  } catch (error) {
    console.error('Error fetching token wallets:', error);
    throw error;
  }
}