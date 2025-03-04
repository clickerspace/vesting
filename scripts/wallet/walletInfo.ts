import { Address, fromNano } from '@ton/core';
import { VestingWallet } from '../../wrappers/VestingWallet';
import { NetworkProvider } from '@ton/blueprint';

const WALLET_CONTRACT_ADDRESS = "EQBJ7lGxxA2Usi1yEv3t_0ZbDQA1nuWmOpyT_K0S8WVJzrYi";

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

// Permission açıklaması
function getPermissionDescription(permissionType: number): string {
  switch(permissionType) {
    case 1: return "Only Recipient";
    case 2: return "Only Owner";
    case 3: return "Both Owner and Recipient";
    case 4: return "Neither (Disabled)";
    default: return "Unknown";
  }
}

export async function run(provider: NetworkProvider) {
  try {
    console.log('Fetching Vesting Wallet information...');
    
    const walletAddress = Address.parse(WALLET_CONTRACT_ADDRESS);
    const vestingWallet = provider.open(VestingWallet.createFromAddress(walletAddress));
    
    const vestingData = await vestingWallet.getVestingData();
    console.log("Vesting data fetched successfully!");

    const owner = await vestingWallet.getOwner();
    const recipient = await vestingWallet.getRecipient();

    const cancelContractPermission = await vestingWallet.getCancelContractPermission();
    const changeRecipientPermission = await vestingWallet.getChangeRecipientPermission();
    const isAutoClaim = await vestingWallet.getIsAutoClaim();

    const currentUnlocked = await vestingWallet.getCurrentUnlockedAmount();
    const currentLocked = await vestingWallet.getCurrentLockedAmount();
    const claimedAmount = await vestingWallet.getClaimedAmount();
    const claimableAmount = await vestingWallet.getClaimableAmount();
    const seqno = await vestingWallet.getSeqno();
    const loggerAddress = await vestingWallet.getLoggerAddress();
    
    console.log('\n===== VESTING WALLET INFORMATION =====');
    console.log('Wallet Address:', walletAddress.toString());
    console.log('Owner Address:', owner.toString());
    console.log('Recipient Address:', recipient.toString());
    console.log('Jetton Master:', vestingData.jettonMasterAddress.toString());
    console.log('Current Seqno:', seqno);
    console.log('Logger Address:', loggerAddress.toString());
    
    console.log('\n--- Vesting Schedule ---');
    console.log('Start Time:', formatDate(vestingData.vestingStartTime));
    console.log('Total Duration:', formatDuration(vestingData.vestingTotalDuration));
    console.log('Unlock Period:', formatDuration(vestingData.unlockPeriod));
    console.log('Cliff Duration:', formatDuration(vestingData.cliffDuration));
    console.log('End Time:', formatDate(vestingData.vestingStartTime + vestingData.vestingTotalDuration));
    
    console.log('\n--- Token Amounts ---');
    console.log('Total Amount:', fromNano(vestingData.vestingTotalAmount), 'tokens');
    console.log('Currently Locked:', fromNano(currentLocked), 'tokens');
    console.log('Currently Unlocked:', fromNano(currentUnlocked), 'tokens');
    console.log('Claimed Amount:', fromNano(claimedAmount), 'tokens');
    console.log('Claimable Amount:', fromNano(claimableAmount), 'tokens');
    
    console.log('\n--- Permissions ---');
    console.log('Auto Claim:', isAutoClaim ? 'Yes' : 'No');
    console.log('Cancel Contract Permission:', cancelContractPermission, 
                `(${getPermissionDescription(cancelContractPermission)})`);
    console.log('Change Recipient Permission:', changeRecipientPermission, 
                `(${getPermissionDescription(changeRecipientPermission)})`);
    
    const now = Math.floor(Date.now() / 1000);
    const progress = Math.min(
      100,
      Math.max(0, (now - vestingData.vestingStartTime) / vestingData.vestingTotalDuration * 100)
    );
    
    console.log('\nVesting Progress: ~', progress.toFixed(2), '%');
    
    return {
      success: true,
      data: {
        address: walletAddress.toString(),
        owner: owner.toString(),
        recipient: recipient.toString(),
        jettonMaster: vestingData.jettonMasterAddress.toString(),
        totalAmount: fromNano(vestingData.vestingTotalAmount),
        startTime: vestingData.vestingStartTime,
        totalDuration: vestingData.vestingTotalDuration,
        unlockPeriod: vestingData.unlockPeriod,
        cliffDuration: vestingData.cliffDuration,
        isAutoClaim: isAutoClaim,
        cancelContractPermission: cancelContractPermission,
        changeRecipientPermission: changeRecipientPermission,
        locked: fromNano(currentLocked),
        unlocked: fromNano(currentUnlocked),
        claimed: fromNano(claimedAmount),
        claimable: fromNano(claimableAmount),
        seqno: seqno
      }
    };
  } catch (error) {
    console.error('Error fetching wallet information:', error);
    throw error;
  }
}