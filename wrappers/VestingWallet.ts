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

const LOGGER_CONTRACT_ADDRESS = "EQDWQP-8NkhyAvsu6opiulNxuLqX3hKHWMxGyNiQEwi35-ak";

// Default parameters for vesting
export const DEFAULT_VESTING_PARAMS = {
  // Default values in seconds
  VESTING_TOTAL_AMOUNT: 0n,
  START_TIME_DELAY: 3600, // 1 hour from now
  TOTAL_DURATION: 30 * 86400, // 30 days
  UNLOCK_PERIOD: 86400, // 1 day
  CLIFF_DURATION: 7 * 86400, // 7 days
};

// Default jetton master address (test network jetton - should be replaced for production)
export const DEFAULT_JETTON_MASTER =
  "kQBQCVW3qnGKeBcumkLVD6x_K2nehE6xC5VsCyJZ02wvUBJy";

export const VestingWalletOpcodes = {
  send_jettons: 0x7777,
  claim_unlocked: 0x8888,
  cancel_vesting: 0x9999,
  change_recipient: 0xaaaa,
  update_owner: 0xd3d3d3d3,
} as const;

export type VestingWalletConfig = {
  owner_address: Address;
  recipient_address: Address;
  jetton_master_address: Address;
  vesting_total_amount: bigint;
  vesting_start_time: number;
  vesting_total_duration: number;
  unlock_period: number;
  cliff_duration: number;
  is_auto_claim: number;
  cancel_contract_permission: number;
  change_recipient_permission: number;
  claimed_amount: bigint;
  seqno: number;
  logger_address: Address;
};

export function packVestingParams(
  startTime: number,
  totalDuration: number,
  unlockPeriod: number,
  cliffDuration: number
): bigint {
  return (
    (BigInt(startTime) << 96n) |
    (BigInt(totalDuration) << 64n) |
    (BigInt(unlockPeriod) << 32n) |
    BigInt(cliffDuration)
  );
}

export function vestingWalletConfigToCell(config: VestingWalletConfig): Cell {
  // Pack vesting parameters
  const packedParams = packVestingParams(
    config.vesting_start_time,
    config.vesting_total_duration,
    config.unlock_period,
    config.cliff_duration
  );

  // Yeni hücre yapısı: 4 ayrı referans hücresinde veri
  
  // Cell 1 - owner address
  const cell1 = beginCell()
    .storeAddress(config.owner_address)
    .endCell();
  
  // Cell 2 - recipient and jetton master addresses
  const cell2 = beginCell()
    .storeAddress(config.recipient_address)
    .storeAddress(config.jetton_master_address)
    .endCell();
  
  // Cell 3 - vesting parameters
  const cell3 = beginCell()
    .storeCoins(config.vesting_total_amount)
    .storeUint(packedParams, 128)
    .storeUint(config.is_auto_claim, 1)
    .storeUint(config.cancel_contract_permission, 3)
    .storeUint(config.change_recipient_permission, 3)
    .endCell();
  
  // Cell 4 - claimed amount and seqno
  const cell4 = beginCell()
    .storeCoins(config.claimed_amount)
    .storeUint(config.seqno, 32)
    .storeAddress(config.logger_address)
    .endCell();
  
  // Ana hücre, dört referansı içeriyor
  return beginCell()
    .storeRef(cell1)
    .storeRef(cell2)
    .storeRef(cell3)
    .storeRef(cell4)
    .endCell();
}

export class VestingWallet implements Contract {
  constructor(
    readonly address: Address,
    readonly init?: { code: Cell; data: Cell }
  ) {}

  static createFromAddress(address: Address) {
    return new VestingWallet(address);
  }

  static createFromConfig(
    config: VestingWalletConfig,
    code: Cell,
    workchain = 0
  ) {
    const data = vestingWalletConfigToCell(config);
    const init = { code, data };
    return new VestingWallet(contractAddress(workchain, init), init);
  }

  // Create with default parameters
  static createWithDefaults(
    ownerAddress: Address,
    recipientAddress: Address, // Recipient address eklendi
    code: Cell,
    options: {
      jettonMasterAddress?: Address | string;
      vestingTotalAmount?: bigint;
      startTime?: number;
      totalDuration?: number;
      unlockPeriod?: number;
      cliffDuration?: number;
      isAutoClaim?: number;
      cancelContractPermission?: number;
      changeRecipientPermission?: number;
    } = {}
  ) {
    // Use current time + delay for start time if not provided
    const now = Math.floor(Date.now() / 1000);
    const startTime =
      options.startTime || now + DEFAULT_VESTING_PARAMS.START_TIME_DELAY;

    // Use address or parse string for jetton master
    let jettonMaster: Address;
    if (!options.jettonMasterAddress) {
      jettonMaster = Address.parse(DEFAULT_JETTON_MASTER);
    } else if (typeof options.jettonMasterAddress === "string") {
      jettonMaster = Address.parse(options.jettonMasterAddress);
    } else {
      jettonMaster = options.jettonMasterAddress;
    }

    const vestingTotalAmount = options.vestingTotalAmount || DEFAULT_VESTING_PARAMS.VESTING_TOTAL_AMOUNT;
    const isAutoClaim = options.isAutoClaim !== undefined ? options.isAutoClaim : 0;
    const cancelContractPermission = options.cancelContractPermission || 2; // Default: only_owner
    const changeRecipientPermission = options.changeRecipientPermission || 2; // Default: only_owner

    const config: VestingWalletConfig = {
      owner_address: ownerAddress,
      recipient_address: recipientAddress,
      jetton_master_address: jettonMaster,
      vesting_total_amount: vestingTotalAmount,
      vesting_start_time: startTime,
      vesting_total_duration:
        options.totalDuration || DEFAULT_VESTING_PARAMS.TOTAL_DURATION,
      unlock_period:
        options.unlockPeriod || DEFAULT_VESTING_PARAMS.UNLOCK_PERIOD,
      cliff_duration:
        options.cliffDuration || DEFAULT_VESTING_PARAMS.CLIFF_DURATION,
      is_auto_claim: isAutoClaim,
      cancel_contract_permission: cancelContractPermission,
      change_recipient_permission: changeRecipientPermission,
      claimed_amount: 0n,
      seqno: 0,
      logger_address: Address.parse(LOGGER_CONTRACT_ADDRESS)
    };

    return VestingWallet.createFromConfig(config, code);
  }

  async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell().endCell(),
    });
  }

  async sendJettons(
    provider: ContractProvider,
    via: Sender,
    opts: {
      toAddress: Address;
      jettonAmount: bigint;
      forwardTonAmount: bigint;
      jettonWalletAddress: Address;
    }
  ) {
    const queryId = 1n;
    const value = opts.forwardTonAmount + toNano("0.05");

    return await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(VestingWalletOpcodes.send_jettons, 32)
        .storeUint(queryId, 64)
        .storeAddress(opts.toAddress)
        .storeCoins(opts.jettonAmount)
        .storeCoins(opts.forwardTonAmount)
        .storeAddress(opts.jettonWalletAddress)
        .endCell(),
    });
  }

  // claimUnlocked
  async claimUnlocked(
    provider: ContractProvider,
    via: Sender,
    opts: {
      forwardTonAmount: bigint;
      jettonWalletAddress: Address;
    }
  ) {
    const queryId = 2n;

    return await provider.internal(via, {
      value: toNano("0.2"),
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(VestingWalletOpcodes.claim_unlocked, 32)
        .storeUint(queryId, 64)
        .storeCoins(opts.forwardTonAmount)
        .storeAddress(opts.jettonWalletAddress)
        .endCell(),
    });
  }

  // External message ile claim işlemi (seqno gerektiriyor)
  async sendClaimUnlockedExternal(
    provider: ContractProvider,
    seqno: number,
    validUntil: number,
    opts: {
      forwardTonAmount: bigint;
      jettonWalletAddress: Address;
    }
  ) {
    const queryId = 3n;

    return await provider.external(
      beginCell()
        .storeUint(seqno, 32)
        .storeUint(validUntil, 32)
        .storeUint(VestingWalletOpcodes.claim_unlocked, 32)
        .storeUint(queryId, 64)
        .storeCoins(opts.forwardTonAmount)
        .storeAddress(opts.jettonWalletAddress)
        .endCell()
    );
  }

  // cancelVesting
  async cancelVesting(
    provider: ContractProvider, 
    via: Sender,
    opts: {
      forwardTonAmount: bigint;
      jettonWalletAddress: Address;
    }
  ) {
    const queryId = 4n;

    return await provider.internal(via, {
      value: toNano("0.5"),
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(VestingWalletOpcodes.cancel_vesting, 32)
        .storeUint(queryId, 64)
        .storeCoins(opts.forwardTonAmount)
        .storeAddress(opts.jettonWalletAddress)
        .endCell(),
    });
  }

  // changeRecipient
  async changeRecipient(
    provider: ContractProvider, 
    via: Sender,
    opts: {
      newRecipientAddress: Address;
    }
  ) {
    const queryId = 5n;

    return await provider.internal(via, {
      value: toNano("0.05"),
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(VestingWalletOpcodes.change_recipient, 32)
        .storeUint(queryId, 64)
        .storeAddress(opts.newRecipientAddress)
        .endCell(),
    });
  }

  // Get vesting data
  async getVestingData(provider: ContractProvider) {
    const result = await provider.get("get_vesting_data", []);

    return {
      ownerAddress: result.stack.readAddress(),
      recipientAddress: result.stack.readAddress(),
      jettonMasterAddress: result.stack.readAddress(),
      vestingTotalAmount: result.stack.readBigNumber(),
      vestingStartTime: result.stack.readNumber(),
      vestingTotalDuration: result.stack.readNumber(),
      unlockPeriod: result.stack.readNumber(),
      cliffDuration: result.stack.readNumber(),
      isAutoClaim: result.stack.readNumber(),
      cancelContractPermission: result.stack.readNumber(),
      changeRecipientPermission: result.stack.readNumber(),
      claimedAmount: result.stack.readBigNumber(),
      seqno: result.stack.readNumber(),  // seqno eklendi
    };
  }

  // updateOwner
  async updateOwner(
    provider: ContractProvider,
    via: Sender,
    opts: {
      newOwnerAddress: Address;
    }
  ) {
    const queryId = 6n;

    return await provider.internal(via, {
      value: toNano("0.05"),
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(VestingWalletOpcodes.update_owner, 32)
        .storeUint(queryId, 64)
        .storeAddress(opts.newOwnerAddress)
        .endCell(),
    });
  }

  // Get owner address
  async getOwner(provider: ContractProvider) {
    const result = await provider.get("get_owner", []);
    return result.stack.readAddress();
  }

  // Get recipient address
  async getRecipient(provider: ContractProvider) {
    const result = await provider.get("get_recipient", []);
    return result.stack.readAddress();
  }

  // getCancelContractPermission
  async getCancelContractPermission(provider: ContractProvider) {
    const result = await provider.get("get_cancel_contract_permission", []);
    return result.stack.readNumber();
  }

  // getChangeRecipientPermission
  async getChangeRecipientPermission(provider: ContractProvider) {
    const result = await provider.get("get_change_recipient_permission", []);
    return result.stack.readNumber();
  }

  async getIsAutoClaim(provider: ContractProvider) {
    const result = await provider.get("get_is_auto_claim", []);
    return result.stack.readNumber();
  }

  // take address parameter
  async canCancelContract(provider: ContractProvider, address: Address) {
    const result = await provider.get("can_cancel_contract", [
      { type: "slice", cell: beginCell().storeAddress(address).endCell() },
    ]);
    return result.stack.readNumber();
  }

  // take address parameter
  async canChangeRecipient(provider: ContractProvider, address: Address) {
    const result = await provider.get("can_change_recipient", [
      { type: "slice", cell: beginCell().storeAddress(address).endCell() },
    ]);
    return result.stack.readNumber();
  }

  // Get locked amount at a specific time
  async getLockedAmount(provider: ContractProvider, atTime: number) {
    const result = await provider.get("get_locked_amount", [
      { type: "int", value: BigInt(atTime) },
    ]);
    return result.stack.readBigNumber();
  }

  // Get unlocked amount at a specific time
  async getUnlockedAmount(provider: ContractProvider, atTime: number) {
    const result = await provider.get("get_unlocked_amount", [
      { type: "int", value: BigInt(atTime) },
    ]);
    return result.stack.readBigNumber();
  }

  // Get current locked amount
  async getCurrentLockedAmount(provider: ContractProvider) {
    const result = await provider.get("get_current_locked_amount", []);
    return result.stack.readBigNumber();
  }

  // Get current unlocked amount
  async getCurrentUnlockedAmount(provider: ContractProvider) {
    const result = await provider.get("get_current_unlocked_amount", []);
    return result.stack.readBigNumber();
  }

  // Get claimed amount
  async getClaimedAmount(provider: ContractProvider) {
    const result = await provider.get("get_claimed_amount", []);
    return result.stack.readBigNumber();
  }

  // Get claimable amount
  async getClaimableAmount(provider: ContractProvider) {
    const result = await provider.get("get_claimable_amount", []);
    return result.stack.readBigNumber();
  }

  async getVestingTotalAmount(provider: ContractProvider) {
    const result = await provider.get("get_vesting_total_amount", []);
    return result.stack.readBigNumber();
  }

  async getSeqno(provider: ContractProvider) {
    const result = await provider.get("get_seqno", []);
    return result.stack.readNumber();
  }

  async getLoggerAddress(provider: ContractProvider) {
    const result = await provider.get("get_logger_address", []);
    return result.stack.readAddress();
  }
}