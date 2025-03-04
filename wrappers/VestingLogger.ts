import {
  Address,
  beginCell,
  Cell,
  Contract,
  contractAddress,
  ContractProvider,
  Sender,
  SendMode,
  toNano,
} from "@ton/core";

export const VestingLoggerOpcodes = {
  register_wallet: 0xd1d1d1d1,
  update_recipient: 0xd2d2d2d2,
} as const;

export type VestingLoggerConfig = {
  owner_address: Address;
};

export function vestingLoggerConfigToCell(config: VestingLoggerConfig): Cell {
  return beginCell().storeAddress(config.owner_address).endCell();
}

export class VestingLogger implements Contract {
  constructor(
    readonly address: Address,
    readonly init?: { code: Cell; data: Cell }
  ) {}

  static createFromAddress(address: Address) {
    return new VestingLogger(address);
  }

  static createFromConfig(
    config: VestingLoggerConfig,
    code: Cell,
    workchain = 0
  ) {
    const data = vestingLoggerConfigToCell(config);
    const init = { code, data };
    return new VestingLogger(contractAddress(workchain, init), init);
  }

  async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell().endCell(),
    });
  }

  // Register a new wallet
  async sendRegisterWallet(
    provider: ContractProvider,
    via: Sender,
    opts: {
      value: bigint;
      queryId?: bigint;
      walletAddress: Address;
      tokenAddress: Address;
      walletOwnerAddress: Address;
      receiverAddress: Address;
      isAutoClaim: number;
    }
  ) {
    await provider.internal(via, {
      value: opts.value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(VestingLoggerOpcodes.register_wallet, 32)
        .storeUint(opts.queryId || 0, 64)
        .storeAddress(opts.walletAddress)
        .storeAddress(opts.tokenAddress)
        .storeAddress(opts.walletOwnerAddress)
        .storeAddress(opts.receiverAddress)
        .storeUint(opts.isAutoClaim, 32)
        .endCell(),
    });
  }

  // Update recipient for an existing wallet
  async sendUpdateRecipient(
    provider: ContractProvider,
    via: Sender,
    opts: {
      value: bigint;
      queryId?: bigint;
      walletAddress: Address;
      oldReceiverAddress: Address;
      newReceiverAddress: Address;
    }
  ) {
    await provider.internal(via, {
      value: opts.value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(VestingLoggerOpcodes.update_recipient, 32)
        .storeUint(opts.queryId || 0, 64)
        .storeAddress(opts.walletAddress)
        .storeAddress(opts.oldReceiverAddress)
        .storeAddress(opts.newReceiverAddress)
        .endCell(),
    });
  }

  // Get all wallets for a token
  async getTokenWallets(provider: ContractProvider, tokenAddress: Address) {
    try {
      const result = await provider.get("get_token_wallets", [
        { type: "slice", cell: beginCell().storeAddress(tokenAddress).endCell() },
      ]);
      return result.stack.readCell();
    } catch (error) {
      console.error("Error in getTokenWallets:", error);
      return beginCell().endCell(); // Return empty cell on error
    }
  }

  // Get all wallets for an owner
  async getOwnerWallets(provider: ContractProvider, ownerAddress: Address) {
    try {
      const result = await provider.get("get_owner_wallets", [
        { type: "slice", cell: beginCell().storeAddress(ownerAddress).endCell() },
      ]);
      return result.stack.readCell();
    } catch (error) {
      console.error("Error in getOwnerWallets:", error);
      return beginCell().endCell();
    }
  }

  // Get all wallets for a receiver
  async getReceiverWallets(
    provider: ContractProvider,
    receiverAddress: Address
  ) {
    try {
      const result = await provider.get("get_receiver_wallets", [
        {
          type: "slice",
          cell: beginCell().storeAddress(receiverAddress).endCell(),
        },
      ]);
      return result.stack.readCell();
    } catch (error) {
      console.error("Error in getReceiverWallets:", error);
      return beginCell().endCell();
    }
  }

  // Get all wallets with auto claim enabled
  async getAutoClaimWallets(provider: ContractProvider) {
    try {
      const result = await provider.get("get_auto_claim_wallets", []);
      return result.stack.readCell();
    } catch (error) {
      console.error("Error in getAutoClaimWallets:", error);
      return beginCell().endCell();
    }
  }

  // Get logger owner
  async getOwner(provider: ContractProvider) {
    try {
      const result = await provider.get("get_owner", []);
      return result.stack.readAddress();
    } catch (error) {
      console.error("Error in getOwner:", error);
      throw error;
    }
  }
}