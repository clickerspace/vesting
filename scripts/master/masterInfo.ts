import { Address, fromNano } from '@ton/core';
import { VestingMaster } from '../../wrappers/VestingMaster';
import { NetworkProvider } from '@ton/blueprint';

const MASTER_CONTRACT_ADDRESS = "EQCmw9L6bWR94fDeqTJsyVp8LWJ5l-zQeSosAeA2Rjp2kAnY";

export async function run(provider: NetworkProvider) {
  try {
    console.log('Fetching Vesting Master information...');
    
    const masterAddress = Address.parse(MASTER_CONTRACT_ADDRESS);
    const vestingMaster = provider.open(VestingMaster.createFromAddress(masterAddress));
    
    const owner = await vestingMaster.getOwner();
    const royaltyFee = await vestingMaster.getRoyaltyFee();
    const stats = await vestingMaster.getVestingStats();
    const loggerAddress = await vestingMaster.getLoggerAddress();
    
    console.log('\n===== VESTING MASTER INFORMATION =====');
    console.log('Contract Address:', masterAddress.toString());
    console.log('Owner Address:', owner.toString());
    console.log('Logger Address:', loggerAddress.toString());
    console.log('Royalty Fee:', fromNano(royaltyFee), 'TON');
    console.log('Total Wallets Created:', stats.totalWalletsCreated);
    console.log('Total Royalty Collected:', fromNano(stats.totalRoyaltyCollected), 'TON');

    const address2 = Address.parse('0:A160039FAE137685D3591B58554D050DE54A0F064CDD66BE18A352F96C8D65D50F57F20073F5C26ED0BA6B236B0AA9A0A1BCA941E0C99BACD7C3146A5F2D91ACBAA1EAFE4_');
    console.log("aaa: ", address2.toString());
    console.log("bbb: ", address2.toRawString());
    
    
    return {
      success: true,
      data: {
        address: masterAddress.toString(),
        owner: owner.toString(),
        logger: loggerAddress.toString(),
        royaltyFee: fromNano(royaltyFee),
        totalWalletsCreated: stats.totalWalletsCreated,
        totalRoyaltyCollected: fromNano(stats.totalRoyaltyCollected)
      }
    };
  } catch (error) {
    console.error('Error fetching master information:', error);
    throw error;
  }
}