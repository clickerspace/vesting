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
  const MASTER_CONTRACT_ADDRESS = "EQDpmZ3Eao57wQzD7U7PeU9VQq-APUUNmohJ8XK5J-w_noFK";

const client = new TonClient({
  endpoint: "https://testnet.toncenter.com/api/v2/jsonRPC",
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

async function getVestingWalletAddress(
  ownerAddress: string,
  recipientAddress: string,
  jettonMasterAddress: string,
  vestingTotalAmount: bigint,
  startTime: number,
  totalDuration: number,
  unlockPeriod: number,
  cliffDuration: number,
  isAutoClaim: number,
  cancelPermission: number,
  changeRecipientPermission: number
) {
  const response = await client.runMethod(
    Address.parse(MASTER_CONTRACT_ADDRESS),
    "get_wallet_address",
    [
      {
        type: "slice",
        cell: beginCell().storeAddress(Address.parse(ownerAddress)).endCell(),
      },
      {
        type: "slice",
        cell: beginCell()
          .storeAddress(Address.parse(recipientAddress))
          .endCell(),
      },
      {
        type: "slice",
        cell: beginCell()
          .storeAddress(Address.parse(jettonMasterAddress))
          .endCell(),
      },
      { type: "int", value: BigInt(vestingTotalAmount) },
      { type: "int", value: BigInt(startTime) },
      { type: "int", value: BigInt(totalDuration) },
      { type: "int", value: BigInt(unlockPeriod) },
      { type: "int", value: BigInt(cliffDuration) },
      { type: "int", value: BigInt(isAutoClaim) },
      { type: "int", value: BigInt(cancelPermission) },
      { type: "int", value: BigInt(changeRecipientPermission) },
    ]
  );

  const vestingWalletAddress = response.stack.readAddress();

  const vestingJettonWalletAddress = await getUserJettonWalletAddress(
    vestingWalletAddress.toString(),
    jettonMasterAddress
  );

  return {
    vestingWalletAddress,
    vestingJettonWalletAddress,
  };
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

    const startDelay = 60; // 1 minute
    const totalDuration = 3600; // 1 hour
    const unlockPeriod = 360; // 6 minutes
    const cliffDuration = 0;

    const customStartDate = new Date("2025-04-16T10:55:00Z");
    const dateTime = Math.floor(customStartDate.getTime() / 1000);

    const startTime = dateTime + startDelay;
    const recipientAddress = "0QA_aYew2jqj8gNdkeg-KDw8YB8ovTkKNNj02aMwpAZxNwP5";
    const jettonAmount = toNano("100");
    const isAutoClaim = 1;
    const cancelContractPermission = 2; // only_owner
    const changeRecipientPermission = 2; // only_owner

    const { vestingWalletAddress, vestingJettonWalletAddress } = await getVestingWalletAddress(
        address,
        recipientAddress,
        JETTON_MASTER_ADDRESS,
        jettonAmount,
        startTime,
        totalDuration,
        unlockPeriod,
        cliffDuration,
        isAutoClaim,
        cancelContractPermission,
        changeRecipientPermission
      );

    console.log(
      "Vesting wallet address to be created:",
      vestingWalletAddress.toString()
    );
    console.log(
      "Vesting wallet's jetton wallet address:",
      vestingJettonWalletAddress.toString()
    );

    const masterJettonWalletAddress = await getUserJettonWalletAddress(
      MASTER_CONTRACT_ADDRESS,
      JETTON_MASTER_ADDRESS
    );

    const forwardPayload1 = beginCell()
      .storeAddress(Address.parse(address)) // vesting_owner
      .storeAddress(Address.parse(recipientAddress)) // vesting_recipient
      .endCell();

    const forwardPayload2 = beginCell()
      .storeAddress(Address.parse(JETTON_MASTER_ADDRESS)) // jetton_master_address
      .storeAddress(masterJettonWalletAddress) // master jetton_wallet_address
      .storeUint(startTime, 32)
      .storeUint(totalDuration, 32)
      .storeUint(unlockPeriod, 32)
      .storeUint(cliffDuration, 32)
      .storeUint(isAutoClaim, 1)
      .storeUint(cancelContractPermission, 3)
      .storeUint(changeRecipientPermission, 3)
      .endCell();

    const combinedForwardPayload = beginCell()
      .storeRef(forwardPayload1)
      .storeRef(forwardPayload2)
      .endCell();

    const messageBody = beginCell()
      .storeUint(0xf8a7ea5, 32)
      .storeUint(0n, 64)
      .storeCoins(jettonAmount)
      .storeAddress(Address.parse(MASTER_CONTRACT_ADDRESS))
      .storeAddress(Address.parse(address))
      .storeBit(0)
      .storeCoins(toNano(1))
      .storeBit(1)
      .storeRef(combinedForwardPayload)
      .endCell();

    const internalMessage = internal({
      to: myJettonWalletAddress,
      value: toNano("1.2"),
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
    console.log("Vesting wallet address:", vestingWalletAddress.toString());
    console.log(
      "Vesting jetton wallet address:",
      vestingJettonWalletAddress.toString()
    );
  } catch (error) {
    console.error("Error:", error);
  }
}
