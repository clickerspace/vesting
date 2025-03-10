import { Address, toNano, fromNano } from '@ton/core';
import { VestingMaster } from '../../wrappers/VestingMaster';
import { NetworkProvider } from '@ton/blueprint';

const MASTER_CONTRACT_ADDRESS = "EQDNaPah2F9iPJAPLMIcBusdpPfEvHhutNSFNQzPfH9YKBpP";
const WITHDRAW_AMOUNT = "100";
const MASTER_JETTON_ADDRESS = "EQB8Wct-FB4J8v3dJvBPuvMQkXXa6mGXYIdmoB2gAVwP9EN2";

export async function run(provider: NetworkProvider) {
  try {
    console.log('Withdrawing jettons from Vesting Master contract...');
    
    const masterAddress = Address.parse(MASTER_CONTRACT_ADDRESS);
    const vestingMaster = provider.open(VestingMaster.createFromAddress(masterAddress));
    
    const owner = await vestingMaster.getOwner();
    if (!owner.equals(provider.sender().address!)) {
      throw new Error('Only the owner can withdraw jettons');
    }
    
    const forwardRemainingBalance = toNano("0.1");

    await vestingMaster.sendWithdrawJettons(
      provider.sender(),
      toNano(WITHDRAW_AMOUNT),
      forwardRemainingBalance,
      Address.parse(MASTER_JETTON_ADDRESS)
    );
    
    return {
      success: true,
      amount: fromNano(toNano(WITHDRAW_AMOUNT))
    };
  } catch (error) {
    console.error('Error withdrawing jettons:', error);
    throw error;
  }
}


