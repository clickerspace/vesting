import {
    beginCell,
    Address,
    TonClient,
    internal,
    external,
    storeMessage,
    toNano,
    WalletContractV4,
    SendMode,
  } from "@ton/ton";
  import { mnemonicToPrivateKey } from "@ton/crypto";
  
  const mnemonic = [
    "burger",
    "sight",
    "mother",
    "song",
    "arm",
    "sheriff",
    "ice",
    "crater",
    "purchase",
    "mask",
    "nurse",
    "lock",
    "mammal",
    "various",
    "arena",
    "reveal",
    "velvet",
    "scan",
    "control",
    "student",
    "whisper",
    "eternal",
    "remove",
    "toe",
  ];

const API_KEY = 'b5982aadb3cf1211ff804df20704e55ec92439365b39858a4c3990794f080126';
  
  const JETTON_MASTER_ADDRESS =
    "kQBQCVW3qnGKeBcumkLVD6x_K2nehE6xC5VsCyJZ02wvUBJy";

    const VESTING_WALLET_CONTRACT_ADDRESS = "EQAvPePAY56rPqNxWb5UcJVBGEt8utakfclW_yuNukJRqui7";
  
    const client = new TonClient({
        endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC',
        apiKey: API_KEY,
    });
  
  // Take any address's jetton wallet address
  async function getUserJettonWalletAddress(
    userAddress: string,
    jettonMasterAddress: string
  ) {
    const userAddressCell = beginCell()
      .storeAddress(Address.parse(userAddress))
      .endCell();
  
    const response = await client.runMethod(
      Address.parse(jettonMasterAddress),
      "get_wallet_address",
      [{ type: "slice", cell: userAddressCell }]
    );
  
    return response.stack.readAddress();
  }
  
  export async function run() {
    try {
      const keyPair = await mnemonicToPrivateKey(mnemonic);
      const secretKey = keyPair.secretKey;
      const publicKey = keyPair.publicKey;
  
      const workchain = 0;
      const wallet = WalletContractV4.create({ workchain, publicKey });
      const address = wallet.address.toString({
        urlSafe: true,
        bounceable: false,
        testOnly: true,
      });
      const contract = client.open(wallet);
  
      console.log("Wallet address:", address);
  
      const balance = await contract.getBalance();
      console.log("Balance:", balance);
  
      const seqno = await contract.getSeqno();
      console.log("Seqno:", seqno);
  
      const { init } = contract;
      const contractDeployed = await client.isContractDeployed(
        Address.parse(address)
      );
      let neededInit: null | typeof init = null;
  
      if (init && !contractDeployed) {
        console.log("Wallet is not deployed, deploying...");
        neededInit = init;
      }
  
      console.log("Getting my jetton wallet address...");
      const myJettonWalletAddress = await getUserJettonWalletAddress(
        address,
        JETTON_MASTER_ADDRESS
      );
      console.log("My jetton wallet address:", myJettonWalletAddress.toString());
  
      const jettonAmount = toNano("100");
  
      const messageBody = beginCell()
        .storeUint(0xf8a7ea5, 32)
        .storeUint(0n, 64)
        .storeCoins(jettonAmount)
        .storeAddress(Address.parse(VESTING_WALLET_CONTRACT_ADDRESS)) // to address 
        .storeAddress(Address.parse(address))
        .storeBit(0)
        .storeCoins(toNano(0.1))
        .storeBit(0)
        .endCell();
  
      const internalMessage = internal({
        to: myJettonWalletAddress,
        value: toNano("0.5"),
        bounce: true,
        body: messageBody,
      });
  
      const body = wallet.createTransfer({
        seqno,
        secretKey,
        messages: [internalMessage],
        sendMode: SendMode.IGNORE_ERRORS,
      });
  
      const externalMessage = external({
        to: address,
        init: neededInit,
        body,
      });
  
      const externalMessageCell = beginCell()
        .store(storeMessage(externalMessage))
        .endCell();
  
      const signedTransaction = externalMessageCell.toBoc();
      const hash = externalMessageCell.hash().toString("hex");
  
      console.log("Transaction hash:", hash);
      console.log("Sending transaction...");
  
      await client.sendFile(signedTransaction);
      console.log("Transaction sent successfully!");
    } catch (error) {
      console.error("Error:", error);
    }
  }
  