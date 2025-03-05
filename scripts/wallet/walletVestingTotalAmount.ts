import { Address } from "@ton/core";
import { VestingWallet } from "../../wrappers/VestingWallet";
import { NetworkProvider } from "@ton/blueprint";

const WALLET_CONTRACT_ADDRESS = "EQBl_6VCdlc5riYJvI6gddQCJtwyioTJiQLDSmhJDD5vGEXz";

export async function run(provider: NetworkProvider) {
  const walletAddress = Address.parse(WALLET_CONTRACT_ADDRESS);
  const vestingWallet = provider.open(
    VestingWallet.createFromAddress(walletAddress)
  );

  const vestingTotalAmount = await vestingWallet.getVestingTotalAmount();
  console.log("vestingTotalAmount", vestingTotalAmount);

  return {
    success: true,
    data: {
      vestingTotalAmount: vestingTotalAmount.toString(),
    },
  };
}
