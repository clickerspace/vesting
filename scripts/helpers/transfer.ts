import { beginCell, Address, TonClient, internal, external, storeMessage, toNano, WalletContractV5R1, SendMode } from '@ton/ton';
import { mnemonicToPrivateKey } from '@ton/crypto';

const API_KEY = "006dccec833d6e1193c45e9c5eaa839f2170f2e780efb2af74cfb05a6261e99d";

const client = new TonClient({ endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC', apiKey: API_KEY });

const jettonContractAddress = "EQBQCVW3qnGKeBcumkLVD6x_K2nehE6xC5VsCyJZ02wvUKn4";
const toAddress = "EQATig-URAt4b6oswMYHeLO9xXDeY-M1c4OkQXsgrLlCYcY9";

const mnemonic = ['burger', 'sight', 'mother', 'song', 'arm', 'sheriff', 'ice', 'crater', 'purchase', 'mask', 'nurse', 'lock', 'mammal', 'various', 'arena', 'reveal', 'velvet', 'scan', 'control', 'student', 'whisper', 'eternal', 'remove', 'toe'];

async function getUserJettonWalletAddress(userAddress: string, jettonMasterAddress: string) {
  const userAddressCell = beginCell().storeAddress(Address.parse(userAddress)).endCell();

  const response = await client.runMethod(Address.parse(jettonMasterAddress), 'get_wallet_address', [
    { type: 'slice', cell: userAddressCell },
  ]);

  return response.stack.readAddress();
}

(async () => {
  try {
    const keyPair = await mnemonicToPrivateKey(mnemonic);
    const secretKey = keyPair.secretKey;
    const publicKey = keyPair.publicKey;

    const workchain = 0;
    const wallet = WalletContractV5R1.create({ workchain, publicKey });
    const address = wallet.address.toString({ urlSafe: true, bounceable: false, testOnly: true });
    const contract = client.open(wallet);

    console.log('Cüzdan adresi:', address);

    const balance = await contract.getBalance();
    console.log('Bakiye:', balance);

    const seqno = await contract.getSeqno();
    console.log('Seqno:', seqno);

    const { init } = contract;
    const contractDeployed = await client.isContractDeployed(Address.parse(address));
    let neededInit: null | typeof init = null;

    if (init && !contractDeployed) {
      console.log('Cüzdan deploy edilmemiş, deploy ediliyor...');
      neededInit = init;
    }

    console.log('Jetton wallet adresi alınıyor...');
    const jettonWalletAddress = await getUserJettonWalletAddress(address, jettonContractAddress);
    console.log('Jetton wallet adresi:', jettonWalletAddress.toString());

    // İsterseniz yorum eklemek için payload
    // const forwardPayload = beginCell()
    //   .storeUint(0, 32) // 0 opcode yorum eklemek için
    //   .storeStringTail('Hello, TON!')
    //   .endCell();

    // Jetton transfer mesajını oluştur
    const jettonAmount = toNano(100); // miktar (Jetton'ın decimal sayısına göre ayarlayın)
    console.log(`${jettonAmount} jetton transfer ediliyor...`);
    
    const messageBody = beginCell()
      .storeUint(0xf8a7ea5, 32) // jetton transfer için opcode
      .storeUint(0, 64) // query id
      .storeCoins(jettonAmount) // jetton miktarı 
      .storeAddress(Address.parse(toAddress)) // hedef adres
      .storeAddress(Address.parse(address)) // response destination (kendi adresiniz)
      .storeBit(0) // özel payload yok
      .storeCoins(toNano(0.01)) // forward amount - 0'dan büyükse bildirim mesajı gönderir
      .storeBit(0) // forwardPayload referans olarak saklanır, yorum eklemek için 1 yapın
      // .storeRef(forwardPayload) // yorum eklemek isterseniz yorum işaretini kaldırın
      .endCell();

    // Jetton wallet'a gönderilecek iç mesajı oluştur
    const internalMessage = internal({
      to: jettonWalletAddress,
      value: toNano('0.1'), // Gas için TON miktarı
      bounce: true,
      body: messageBody,
    });

    // Cüzdan transfer işlemini oluştur
    const body = wallet.createTransfer({
      seqno,
      secretKey,
      messages: [internalMessage],
      sendMode: SendMode.IGNORE_ERRORS,
    });

    // Dış mesajı oluştur
    const externalMessage = external({
      to: address,
      init: neededInit,
      body,
    });

    const externalMessageCell = beginCell().store(storeMessage(externalMessage)).endCell();

    // İşlemi gönder
    const signedTransaction = externalMessageCell.toBoc();
    const hash = externalMessageCell.hash().toString('hex');

    console.log('İşlem hash:', hash);
    console.log('İşlem gönderiliyor...');

    await client.sendFile(signedTransaction);
    console.log('İşlem başarıyla gönderildi!');
    
  } catch (error) {
    console.error('Hata:', error);
  }
})();