import { Address, toNano, fromNano } from "@ton/core";
import { VestingMaster } from "../../wrappers/VestingMaster";
import { NetworkProvider } from "@ton/blueprint";

const MASTER_CONTRACT_ADDRESS = "EQA6j1bC_3rs8NZ8s4bBeHYhuJNqJwqnlmUtreIEfszsd0kB";
const JETTON_MASTER_ADDRESS = "kQBQCVW3qnGKeBcumkLVD6x_K2nehE6xC5VsCyJZ02wvUBJy";
const LOGGER_CONTRACT_ADDRESS = "EQDwtJ3ddneadY69XbHSz02DWAsbB7Hyziiyegn1arlEEuOu";

const CUSTOM_PARAMS = {
  START_DELAY: 60, // 1 minute
  TOTAL_DURATION: 3600, // 1 hour
  UNLOCK_PERIOD: 360, // 6 minutes
  CLIFF_DURATION: 0, // 0
};

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString();
}

function formatDuration(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  return days > 0 ? `${days} days` : `${seconds} seconds`;
}

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
    console.log("Creating new Vesting Wallet with custom parameters...");

    const masterAddress = Address.parse(MASTER_CONTRACT_ADDRESS);
    const vestingMaster = provider.open(
      VestingMaster.createFromAddress(masterAddress)
    );

    const jettonMaster = Address.parse(JETTON_MASTER_ADDRESS);
    const royaltyFee = await vestingMaster.getRoyaltyFee();

    const now = Math.floor(Date.now() / 1000);
    const vestingTotalAmount = toNano("100");
    const startTime = now + CUSTOM_PARAMS.START_DELAY;
    const totalDuration = CUSTOM_PARAMS.TOTAL_DURATION;
    const unlockPeriod = CUSTOM_PARAMS.UNLOCK_PERIOD;
    const cliffDuration = CUSTOM_PARAMS.CLIFF_DURATION;
    const isAutoClaim = 1; // 0 = no auto claim, 1 = auto claim
    const cancelContractPermission = 2; // 1 = only_recipient, 2 = only_owner, 3 = both, 4 = neither
    const changeRecipientPermission = 2; // 1 = only_recipient, 2 = only_owner, 3 = both, 4 = neither
    const ownerAddress = provider.sender().address!;
    const recipientAddress = provider.sender().address!;

    const walletAddress = await vestingMaster.getWalletAddress(
      ownerAddress,
      recipientAddress,
      jettonMaster,
      vestingTotalAmount,
      startTime,
      totalDuration,
      unlockPeriod,
      cliffDuration,
      isAutoClaim,
      cancelContractPermission,
      changeRecipientPermission
    );

    console.log(
      "\nVesting Wallet will be created with these CUSTOM parameters:"
    );
    console.log("- Owner:", ownerAddress.toString());
    console.log("- Recipient:", recipientAddress.toString());
    console.log("- Jetton Master:", jettonMaster.toString());
    console.log("- Vesting Total Amount:", fromNano(vestingTotalAmount), "tokens");
    console.log("- Start Time:", formatDate(startTime));
    console.log("- Total Duration:", formatDuration(totalDuration));
    console.log("- Unlock Period:", formatDuration(unlockPeriod));
    console.log("- Cliff Duration:", formatDuration(cliffDuration));
    console.log("- Auto Claim:", isAutoClaim ? "Yes" : "No");
    console.log("- Cancel Contract Permission:", `${cancelContractPermission} (${getPermissionDescription(cancelContractPermission)})`);
    console.log("- Change Recipient Permission:", `${changeRecipientPermission} (${getPermissionDescription(changeRecipientPermission)})`);
    console.log("- Wallet Address:", walletAddress.toString());

    console.log(
      `\nThis operation will cost ${fromNano(royaltyFee)} TON as royalty fee.`
    );
    console.log("Sending transaction...");
    
    await vestingMaster.sendCreateVestingWallet(
      provider.sender(),
      {
        value: royaltyFee + toNano("0.1"),
        owner: ownerAddress,
        recipient: recipientAddress,
        jettonMaster: jettonMaster,
        vestingTotalAmount: vestingTotalAmount,
        startTime: startTime,
        totalDuration: totalDuration,
        unlockPeriod: unlockPeriod,
        cliffDuration: cliffDuration,
        isAutoClaim: isAutoClaim,
        cancelContractPermission: cancelContractPermission,
        changeRecipientPermission: changeRecipientPermission,
        forwardRemainingBalance: toNano("0.1"),
        loggerAddress: Address.parse(LOGGER_CONTRACT_ADDRESS)
      }
    );

    console.log("Transaction sent successfully!");
    console.log("Vesting Wallet address:", walletAddress.toString());
    console.log("\nNext steps:");
    console.log("1. Send jettons to this vesting wallet");
    console.log("2. Check wallet status with:");
    console.log(
      `   npx blueprint run wallet-info (after updating WALLET_ADDRESS to your new address)`
    );

    return {
      success: true,
      address: walletAddress.toString(),
    };
  } catch (error) {
    console.error("Error creating vesting wallet:", error);
    throw error;
  }
}