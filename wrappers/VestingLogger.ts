import {
  Address,
  beginCell,
  Cell,
  Contract,
  contractAddress,
  ContractProvider,
  Dictionary,
  Sender,
  SendMode,
  toNano,
} from "@ton/core";

export const VestingLoggerOpcodes = {
  register_wallet: 0xd1d1d1d1,
  update_recipient: 0xd2d2d2d2,
  update_owner: 0xd3d3d3d3,
  set_max_wallets: 0xd4d4d4d4,
} as const;

export type VestingLoggerConfig = {
  owner_address: Address;
  deploy_time: number;
};

export function vestingLoggerConfigToCell(config: VestingLoggerConfig): Cell {
  return beginCell().storeAddress(config.owner_address)
  .storeUint(config.deploy_time, 32)
  .endCell();
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

  async sendSetMaxWallets(
    provider: ContractProvider,
    via: Sender,
    opts: {
      maxWallets: number;
    }
  ) {
    const queryId = 2n;
    await provider.internal(via, {
      value: toNano("0.05"),
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(VestingLoggerOpcodes.set_max_wallets, 32)
        .storeUint(queryId, 64)
        .storeUint(opts.maxWallets, 32)
        .endCell(),
    });
  }
  

  // Get all wallets for a token
  async getTokenWallets(provider: ContractProvider, tokenAddress: Address) {
    try {
      const result = await provider.get("get_token_wallets", [
        { type: "slice", cell: beginCell().storeAddress(tokenAddress).endCell() },
      ]);
      const dictCell = result.stack.readCell();
      const dict = Dictionary.loadDirect(
        Dictionary.Keys.BigUint(256),
        Dictionary.Values.Cell(),
        dictCell
      );
      const readableWallets = [];
      const keys = dict.keys();
      for (const key of keys) {
        const valueCell = dict.get(key);
        if (valueCell) {
          const slice = valueCell.beginParse();
          readableWallets.push(slice.loadAddress().toString());
        }
      }
      return readableWallets;
    } catch (error) {
      console.error("Error in getTokenWallets:", error);
      return [];
    }
  }

  // Get all wallets for an owner
  async getOwnerWallets(provider: ContractProvider, ownerAddress: Address) {
    try {
      const result = await provider.get("get_owner_wallets", [
        { type: "slice", cell: beginCell().storeAddress(ownerAddress).endCell() },
      ]);
      const dictCell = result.stack.readCell();
      const dict = Dictionary.loadDirect(
        Dictionary.Keys.BigUint(256),
        Dictionary.Values.Cell(),
        dictCell
      );
      const readableWallets = [];
      const keys = dict.keys();
      for (const key of keys) {
        const valueCell = dict.get(key);
        if (valueCell) {
          const slice = valueCell.beginParse();
          readableWallets.push(slice.loadAddress().toString());
        }
      }
      return readableWallets;
    } catch (error) {
      console.error("Error in getOwnerWallets:", error);
      return [];
    }
  }

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
  
      const dictCell = result.stack.readCell();
      
      const dict = Dictionary.loadDirect(
        Dictionary.Keys.BigUint(256),
        Dictionary.Values.Cell(),
        dictCell
      );

      const readableWallets = [];
      const keys = dict.keys();
      
      for (const key of keys) {
        const valueCell = dict.get(key);
        if (valueCell) {
          const slice = valueCell.beginParse();
          try {
            const address = slice.loadAddress();
            readableWallets.push(address.toString());
          } catch (error) {
            console.warn("Adres yüklenirken hata:", error);
          }
        }
      }
      
      return readableWallets;
    } catch (error) {
      console.error("Error in getReceiverWallets:", error);
      return [];
    }
  }

  // Get all wallets with auto claim enabled
  async getAutoClaimWallets(provider: ContractProvider) {
    try {
      const result = await provider.get("get_auto_claim_wallets", []);
      const dictCell = result.stack.readCell();
      const dict = Dictionary.loadDirect(
        Dictionary.Keys.BigUint(256),
        Dictionary.Values.Cell(),
        dictCell
      );
      
      const readableWallets = [];
      const keys = dict.keys();
      
      for (const key of keys) {
        const valueCell = dict.get(key);
        if (valueCell) {
          const slice = valueCell.beginParse();
          try {
            const address = slice.loadAddress();
            readableWallets.push(address.toString());
          } catch (error) {
            console.warn("Adres yüklenirken hata:", error);
          }
        }
      }
      
      return readableWallets;
    } catch (error) {
      console.error("Error in getAutoClaimWallets:", error);
      return [];
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

  // Get total wallet count
  async getTotalWalletCount(provider: ContractProvider) {
    const result = await provider.get("get_total_wallet_count", []);
    return result.stack.readNumber();
  }

  // Get max wallet count
  async getMaxWalletCount(provider: ContractProvider) {
    const result = await provider.get("get_max_wallet_count", []);
    return result.stack.readNumber();
  }
  
}