import { Address, toNano, fromNano } from '@ton/core';
import { VestingMaster } from '../../wrappers/VestingMaster';
import { NetworkProvider } from '@ton/blueprint';

const MASTER_CONTRACT_ADDRESS = "EQAtMYo9SeP2PkvrdPAFYbUTNE44O60-rKXPoEG7SdZhnDIn";
const WITHDRAW_AMOUNT = "100";
const MASTER_JETTON_ADDRESS = "EQAeU-4xXNKXY53vnSUFLQV3dkVF5Gf7NSWai2vqfcCrYk-2";

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


