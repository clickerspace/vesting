import { toNano, fromNano, Address } from '@ton/core';
import { VestingMaster } from '../../wrappers/VestingMaster';
import { compile, NetworkProvider } from '@ton/blueprint';

const LOGGER_CONTRACT_ADDRESS = "EQBz4a1gZCUZCLlPD_XgLY84PDdfZ6mfE64vHa0RuNXjeEOO";

export async function run(provider: NetworkProvider) {
  try {
    console.log('Compiling Vesting Wallet code...');
    const walletCode = await compile('VestingWallet');
    
    console.log('Creating Vesting Master contract...');
    const vestingMaster = provider.open(
      VestingMaster.createFromConfig({
        owner_address: provider.sender().address!,
        vesting_wallet_code: walletCode,
        logger_address: Address.parse(LOGGER_CONTRACT_ADDRESS),
        total_wallets_created: 0,
        total_royalty_collected: 0n
      },
      await compile('VestingMaster'))
    );
    
    const DEPLOY_AMOUNT = toNano('0.1');

    console.log('Deploying Vesting Master contract...');
    console.log('Contract address:', vestingMaster.address.toString());

    await vestingMaster.sendDeploy(provider.sender(), DEPLOY_AMOUNT);

    console.log('Waiting for deploy transaction...');
    await provider.waitForDeploy(vestingMaster.address);
    console.log('Deploy transaction completed successfully.');
  
    try {
      const stats = await vestingMaster.getVestingStats();
      const royaltyFee = await vestingMaster.getRoyaltyFee();
      const ownerAddress = await vestingMaster.getOwner();
      const loggerAddr = await vestingMaster.getLoggerAddress();
    
      console.log('\nVesting Master deployed successfully!');
      console.log('Contract address:', vestingMaster.address.toString());
      console.log('Owner address:', ownerAddress.toString());
      console.log('Logger address:', loggerAddr.toString());
      console.log('Royalty fee per wallet creation:', fromNano(royaltyFee), 'TON');
      console.log('Current statistics:');
      console.log('- Total wallets created:', stats.totalWalletsCreated);
      console.log('- Total royalty collected:', fromNano(stats.totalRoyaltyCollected), 'TON');
    } catch (e) {
      console.log('\nVesting Master deployed successfully!');
      console.log('Contract address:', vestingMaster.address.toString());
      console.log('Could not verify contract stats after deploy: ', e);
    }

    console.log('\nNext steps:');
    console.log('1. Update master address in your script files to:', vestingMaster.address.toString());
    console.log('2. Create vesting wallets with:');
    console.log('   npx blueprint run masterCreateVesting');
    
    return {
      success: true,
      address: vestingMaster.address.toString(),
    };

  } catch (error) {
    console.error('Error deploying Vesting Master contract:', error);
    throw error;
  }
}