import { Address } from '@ton/core';
import { VestingMaster } from '../../wrappers/VestingMaster';
import { NetworkProvider } from '@ton/blueprint';

const MASTER_CONTRACT_ADDRESS = "EQDNaPah2F9iPJAPLMIcBusdpPfEvHhutNSFNQzPfH9YKBpP";
const NEW_OWNER_ADDRESS = "0QARfBT9PMJ_TjX8bUqFvI-ZMqixM7kY68_-7tmVm-khfOyj";

export async function run(provider: NetworkProvider) {
  try {
    console.log('Changing owner of the Vesting Master contract...');
  
    const masterAddress = Address.parse(MASTER_CONTRACT_ADDRESS);
    const vestingMaster = provider.open(VestingMaster.createFromAddress(masterAddress));
    
    const currentOwner = await vestingMaster.getOwner();
    if (!currentOwner.equals(provider.sender().address!)) {
      throw new Error('Only the current owner can change ownership');
    }
    
    const newOwner = Address.parse(NEW_OWNER_ADDRESS);
    
    console.log(`Changing owner from ${currentOwner.toString()} to ${newOwner.toString()}...`);
    const result = await vestingMaster.sendChangeOwner(
      provider.sender(),
      newOwner
    );
    
    console.log('Owner change transaction sent successfully!');
    console.log('\nImportant: After this operation, only the new owner will be able to:');
    console.log('- Update wallet code');
    console.log('- Change ownership again');
    console.log('- Withdraw collected royalty fees');
    
    return {
      success: true,
      newOwner: newOwner.toString()
    };
  } catch (error) {
    console.error('Error changing owner:', error);
    throw error;
  }
}