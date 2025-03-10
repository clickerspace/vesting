import { Address, fromNano } from "@ton/core";
import { VestingWallet } from "../../wrappers/VestingWallet";
import { NetworkProvider } from "@ton/blueprint";

const WALLET_CONTRACT_ADDRESS = "EQC15NPd2rLyvk7hBoQKOVecqcCh3DUg2dtJf-BhxC8EiY7W";

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString();
}

function createProgressBar(percent: number, length: number = 30): string {
  const filledLength = Math.round(length * (percent / 100));
  const emptyLength = length - filledLength;

  const filled = "█".repeat(filledLength);
  const empty = "░".repeat(emptyLength);

  return `${filled}${empty} ${percent.toFixed(2)}%`;
}

export async function run(provider: NetworkProvider) {
  try {
    console.log("Checking unlocked tokens status...");

    const walletAddress = Address.parse(WALLET_CONTRACT_ADDRESS);
    const vestingWallet = provider.open(
      VestingWallet.createFromAddress(walletAddress)
    );

    const vestingData = await vestingWallet.getVestingData();
    const currentUnlocked = await vestingWallet.getCurrentUnlockedAmount();
    const currentLocked = await vestingWallet.getCurrentLockedAmount();
    const claimedAmount = await vestingWallet.getClaimedAmount();
    const claimableAmount = await vestingWallet.getClaimableAmount();

    const now = Math.floor(Date.now() / 1000);
    const startTime = vestingData.vestingStartTime;
    const endTime = startTime + vestingData.vestingTotalDuration;
    const totalAmount = vestingData.vestingTotalAmount;

    const timeElapsed = Math.max(0, now - startTime);
    const timeRemaining = Math.max(0, endTime - now);
    const progress = Math.min(
      100,
      (timeElapsed / vestingData.vestingTotalDuration) * 100
    );

    const unlockedPercent =
      totalAmount > 0n
        ? (Number(fromNano(currentUnlocked)) * 100) /
          Number(fromNano(totalAmount))
        : 0;
    const lockedPercent =
      totalAmount > 0n
        ? (Number(fromNano(currentLocked)) * 100) /
          Number(fromNano(totalAmount))
        : 0;
    const claimedPercent =
      totalAmount > 0n
        ? (Number(fromNano(claimedAmount)) * 100) /
          Number(fromNano(totalAmount))
        : 0;

    console.log("\n===== VESTING PROGRESS =====");
    console.log("Start Time:", formatDate(startTime));
    console.log("End Time:", formatDate(endTime));
    console.log("Current Time:", formatDate(now));

    console.log("\nTime Progress:");
    console.log(createProgressBar(progress));
    console.log(
      `Elapsed: ${Math.floor(timeElapsed / 86400)} days, Remaining: ${Math.floor(timeRemaining / 86400)} days`
    );

    console.log("\n===== TOKEN STATUS =====");
    console.log(`Total Amount: ${fromNano(totalAmount)} tokens`);
    console.log(
      `Unlocked: ${fromNano(currentUnlocked)} tokens (${Number(unlockedPercent)}%)`
    );
    console.log(
      `Locked: ${fromNano(currentLocked)} tokens (${Number(lockedPercent)}%)`
    );
    console.log(
      `Claimed: ${fromNano(claimedAmount)} tokens (${Number(claimedPercent)}%)`
    );
    console.log(`Available to claim: ${fromNano(claimableAmount)} tokens`);

    console.log("\nUnlocked Token Progress:");
    console.log(createProgressBar(Number(unlockedPercent)));

    if (claimableAmount > 0n) {
      console.log("\n✅ You have tokens available to claim!");
      console.log(
        `Run 'npx blueprint run claim-tokens' to claim ${fromNano(claimableAmount)} tokens.`
      );
    } else {
      console.log("\n⏳ No tokens available to claim at this time.");

      if (endTime > now && currentLocked > 0n) {
        const nextUnlockTime =
          startTime +
          vestingData.cliffDuration +
          Math.ceil(
            (timeElapsed - vestingData.cliffDuration) / vestingData.unlockPeriod
          ) *
            vestingData.unlockPeriod;

        if (nextUnlockTime > now) {
          console.log(
            `Next unlock expected around: ${formatDate(nextUnlockTime)}`
          );
          console.log(
            `(in approximately ${Math.ceil((nextUnlockTime - now) / 86400)} days)`
          );
        }
      }
    }

    return {
      success: true,
      data: {
        total: fromNano(totalAmount),
        unlocked: fromNano(currentUnlocked),
        locked: fromNano(currentLocked),
        claimed: fromNano(claimedAmount),
        claimable: fromNano(claimableAmount),
        progress: progress,
      },
    };
  } catch (error) {
    console.error("Error checking unlocked tokens:", error);
    throw error;
  }
}
