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

export const VestingMasterOpcodes = {
  create_vesting_wallet: 0x5fe9b8cd,
  update_wallet_code: 0x1234,
  change_owner: 0x2345,
  withdraw_tons: 0x3456,
  set_logger_address: 0x4567,
} as const;

export type VestingMasterConfig = {
  owner_address: Address;
  vesting_wallet_code: Cell;
  logger_address: Address;
  total_wallets_created: number;
  total_royalty_collected: bigint;
};

export function vestingMasterConfigToCell(config: VestingMasterConfig): Cell {
  const extraData = beginCell()
    .storeRef(config.vesting_wallet_code)
    .storeAddress(config.logger_address)
    .storeUint(config.total_wallets_created, 64)
    .storeCoins(config.total_royalty_collected)
    .endCell();
    
  return beginCell()
    .storeAddress(config.owner_address)
    .storeRef(extraData)
    .endCell();
}

export class VestingMaster implements Contract {
  constructor(
    readonly address: Address,
    readonly init?: { code: Cell; data: Cell }
  ) {}

  static createFromAddress(address: Address) {
    return new VestingMaster(address);
  }

  static createFromConfig(config: VestingMasterConfig, code: Cell, workchain = 0) {
    const data = vestingMasterConfigToCell(config);
    const init = { code, data };
    return new VestingMaster(contractAddress(workchain, init), init);
  }

  async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell().endCell(),
    });
  }

  // Create vesting wallet
  async sendCreateVestingWallet(
    provider: ContractProvider,
    via: Sender,
    opts: {
      value: bigint;
      owner: Address;
      recipient: Address;
      jettonMaster: Address;
      vestingTotalAmount: bigint;
      startTime: number;
      totalDuration: number;
      unlockPeriod: number;
      cliffDuration: number;
      isAutoClaim: number;
      cancelContractPermission: number;
      changeRecipientPermission: number;
      forwardRemainingBalance: bigint;
      loggerAddress: Address;
    }
  ) {
    const queryId = 1n;

    const mainCell = beginCell()
      .storeUint(VestingMasterOpcodes.create_vesting_wallet, 32)
      .storeUint(queryId, 64)
      .storeAddress(opts.owner)
      .storeAddress(opts.recipient)
      .storeAddress(opts.jettonMaster)
      .storeCoins(opts.vestingTotalAmount);
    
    const refCell = beginCell()
      .storeUint(opts.startTime, 32)
      .storeUint(opts.totalDuration, 32)
      .storeUint(opts.unlockPeriod, 32)
      .storeUint(opts.cliffDuration, 32)
      .storeUint(opts.isAutoClaim, 1)
      .storeUint(opts.cancelContractPermission, 3)
      .storeUint(opts.changeRecipientPermission, 3)
      .storeCoins(opts.forwardRemainingBalance)
      .storeAddress(opts.loggerAddress)
      .endCell();
    
    const msgBody = mainCell.storeRef(refCell).endCell();
  
    return await provider.internal(via, {
      value: opts.value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: msgBody
    });
  }

  // Set logger address
  async sendSetLoggerAddress(
    provider: ContractProvider,
    via: Sender,
    newLoggerAddress: Address
  ) {
    const queryId = 2n;

    return await provider.internal(via, {
      value: toNano("0.05"),
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(VestingMasterOpcodes.set_logger_address, 32)
        .storeUint(queryId, 64)
        .storeAddress(newLoggerAddress)
        .endCell(),
    });
  }

  // Update wallet code
  async sendUpdateWalletCode(
    provider: ContractProvider,
    via: Sender,
    newCode: Cell
  ) {
    const queryId = 3n;

    return await provider.internal(via, {
      value: toNano("0.05"),
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(VestingMasterOpcodes.update_wallet_code, 32)
        .storeUint(queryId, 64)
        .storeRef(newCode)
        .endCell(),
    });
  }

  // Change owner
  async sendChangeOwner(
    provider: ContractProvider,
    via: Sender,
    newOwner: Address
  ) {
    const queryId = 4n;

    return await provider.internal(via, {
      value: toNano("0.05"),
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(VestingMasterOpcodes.change_owner, 32)
        .storeUint(queryId, 64)
        .storeAddress(newOwner)
        .endCell(),
    });
  }

  // Withdraw TON
  async sendWithdrawTons(
    provider: ContractProvider,
    via: Sender,
    amount: bigint
  ) {
    const queryId = 5n;

    return await provider.internal(via, {
      value: toNano("0.05"),
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(VestingMasterOpcodes.withdraw_tons, 32)
        .storeUint(queryId, 64)
        .storeCoins(amount)
        .endCell(),
    });
  }
  
  // Get royalty fee
  async getRoyaltyFee(provider: ContractProvider) {
    const result = await provider.get("get_royalty_fee", []);
    return result.stack.readBigNumber();
  }

  // Get owner address
  async getOwner(provider: ContractProvider) {
    const result = await provider.get("get_owner", []);
    return result.stack.readAddress();
  }

  // Get wallet code
  async getWalletCode(provider: ContractProvider) {
    const result = await provider.get("get_wallet_code", []);
    return result.stack.readCell();
  }

  // Get stats
  async getVestingStats(provider: ContractProvider) {
    const result = await provider.get("get_vesting_stats", []);
    return {
      totalWalletsCreated: result.stack.readNumber(),
      totalRoyaltyCollected: result.stack.readBigNumber(),
    };
  }

  // Get logger address
  async getLoggerAddress(provider: ContractProvider) {
    const result = await provider.get("get_logger_address", []);
    return result.stack.readAddress();
  }

  // Get wallet address
  async getWalletAddress(
    provider: ContractProvider,
    owner: Address,
    recipient: Address,
    jettonMaster: Address,
    vestingTotalAmount: bigint,
    startTime: number,
    totalDuration: number,
    unlockPeriod: number,
    cliffDuration: number,
    isAutoClaim: number,
    cancelContractPermission: number,
    changeRecipientPermission: number
  ) {
    const result = await provider.get("get_wallet_address", [
      { type: "slice", cell: beginCell().storeAddress(owner).endCell() },
      { type: "slice", cell: beginCell().storeAddress(recipient).endCell() },
      { type: "slice", cell: beginCell().storeAddress(jettonMaster).endCell() },
      { type: "int", value: BigInt(vestingTotalAmount) },
      { type: "int", value: BigInt(startTime) },
      { type: "int", value: BigInt(totalDuration) },
      { type: "int", value: BigInt(unlockPeriod) },
      { type: "int", value: BigInt(cliffDuration) },
      { type: "int", value: BigInt(isAutoClaim) },
      { type: "int", value: BigInt(cancelContractPermission) },
      { type: "int", value: BigInt(changeRecipientPermission) },
    ]);
    return result.stack.readAddress();
  }
}