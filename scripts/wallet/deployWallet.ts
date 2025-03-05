import { toNano, Address, fromNano } from '@ton/core';
import { VestingWallet } from '../../wrappers/VestingWallet';
import { NetworkProvider } from '@ton/blueprint';
import { compile } from '@ton/blueprint';

const JETTON_MASTER_ADDRESS = "EQA-EpakmTO_KBPX_NrSY88qS7vqdWKChc-VMtFK0CnSPUwr";
const LOGGER_CONTRACT_ADDRESS = "EQBz4a1gZCUZCLlPD_XgLY84PDdfZ6mfE64vHa0RuNXjeEOO";

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString();
}

function formatDuration(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
  if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
  
  return parts.join(', ');
}

export async function run(provider: NetworkProvider) {
    try {
        const ownerAddress = provider.sender().address!;
        const recipientAddress = ownerAddress;
        
        const VESTING_AMOUNT = toNano("100"); // 100 tokens initial vesting amount
        const START_DELAY = 0; // 0
        const TOTAL_DURATION = 3600; // 1 hour
        const UNLOCK_PERIOD = 360; // 6 minutes
        const CLIFF_DURATION = 0; // 0
        const IS_AUTO_CLAIM = 0; // No auto claim
        const CANCEL_CONTRACT_PERMISSION = 2; // Only owner
        const CHANGE_RECIPIENT_PERMISSION = 2; // Only owner
        
        console.log('Deploying Vesting Wallet with pre-defined parameters...');
        
        const walletCode = await compile('VestingWallet');
        const now = Math.floor(Date.now() / 1000);
        const startTime = now + START_DELAY;
        
        const config = {
            owner_address: ownerAddress,
            recipient_address: recipientAddress,
            jetton_master_address: Address.parse(JETTON_MASTER_ADDRESS),
            vesting_total_amount: VESTING_AMOUNT,
            vesting_start_time: startTime,
            vesting_total_duration: TOTAL_DURATION,
            unlock_period: UNLOCK_PERIOD,
            cliff_duration: CLIFF_DURATION,
            is_auto_claim: IS_AUTO_CLAIM,
            cancel_contract_permission: CANCEL_CONTRACT_PERMISSION,
            change_recipient_permission: CHANGE_RECIPIENT_PERMISSION,
            claimed_amount: 0n,
            seqno: 0,
            logger_address: Address.parse(LOGGER_CONTRACT_ADDRESS)
        };
        
        const vestingWallet = provider.open(
            VestingWallet.createFromConfig(config, walletCode)
        );
        
        const DEPLOY_AMOUNT = toNano('0.05');
        
        console.log('Contract address:', vestingWallet.address.toString());
        console.log('\nDeploying with these pre-defined parameters:');
        console.log('- Owner:', ownerAddress.toString());
        console.log('- Recipient:', recipientAddress.toString());
        console.log('- Jetton Master:', JETTON_MASTER_ADDRESS);
        console.log('- Vesting Total Amount:', fromNano(VESTING_AMOUNT), 'tokens');
        console.log('- Start Time:', formatDate(startTime));
        console.log('- Total Duration:', formatDuration(TOTAL_DURATION));
        console.log('- Unlock Period:', formatDuration(UNLOCK_PERIOD));
        console.log('- Cliff Duration:', formatDuration(CLIFF_DURATION));
        console.log('- Auto Claim:', IS_AUTO_CLAIM ? 'Yes' : 'No');
        console.log('- Cancel Permission:', CANCEL_CONTRACT_PERMISSION);
        console.log('- Change Recipient Permission:', CHANGE_RECIPIENT_PERMISSION);
        
        await vestingWallet.sendDeploy(provider.sender(), DEPLOY_AMOUNT);
        
        console.log('Waiting for deploy transaction...');
        await provider.waitForDeploy(vestingWallet.address);
        
        try {
            const vestingData = await vestingWallet.getVestingData();
            const owner = await vestingWallet.getOwner();
            const recipient = await vestingWallet.getRecipient();
            
            console.log('\nVesting Wallet deployed successfully!');
            console.log('Owner address:', owner.toString());
            console.log('Recipient address:', recipient.toString());
            console.log('Jetton Master:', vestingData.jettonMasterAddress.toString());
            console.log('Vesting Total Amount:', fromNano(vestingData.vestingTotalAmount), 'tokens');
            console.log('Claimed Amount:', fromNano(vestingData.claimedAmount), 'tokens');

            console.log('\n--- Vesting Schedule ---');
            console.log('Start Time:', formatDate(vestingData.vestingStartTime));
            console.log('Total Duration:', formatDuration(vestingData.vestingTotalDuration));
            console.log('Unlock Period:', formatDuration(vestingData.unlockPeriod));
            console.log('Cliff Duration:', formatDuration(vestingData.cliffDuration));
            console.log('End Time:', formatDate(vestingData.vestingStartTime + vestingData.vestingTotalDuration));

            console.log('\n--- Permissions ---');
            console.log('Auto Claim:', vestingData.isAutoClaim ? 'Yes' : 'No');
            console.log('Cancel Contract Permission:', vestingData.cancelContractPermission);
            console.log('Change Recipient Permission:', vestingData.changeRecipientPermission);
            
        } catch (error) {
            console.log('\nVesting Wallet deployed successfully!');
            console.log('Could not fetch additional details. The contract is deployed at:');
            console.log(vestingWallet.address.toString());
        }
        
        return {
            success: true,
            address: vestingWallet.address.toString(),
        };
        
    } catch (error) {
        console.error('Error deploying Vesting Wallet:', error);
        throw error;
    }
}