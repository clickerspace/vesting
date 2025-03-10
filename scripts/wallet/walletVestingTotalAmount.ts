import { Address } from "@ton/core";
import { VestingWallet } from "../../wrappers/VestingWallet";
import { NetworkProvider } from "@ton/blueprint";

const WALLET_CONTRACT_ADDRESS = "EQC15NPd2rLyvk7hBoQKOVecqcCh3DUg2dtJf-BhxC8EiY7W";

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
