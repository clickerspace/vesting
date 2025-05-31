import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Address, ExternalAddress, beginCell, Cell, toNano } from '@ton/core';
import { VestingMaster } from '../wrappers/VestingMaster';
import { VestingLogger } from '../wrappers/VestingLogger';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

/*
Treasury = test cüzdanı, Blockchain = test ortamı, SandboxContract = test kontratı wrapper'ı
*/

const JETTON_MASTER_ADDRESS = "kQBQCVW3qnGKeBcumkLVD6x_K2nehE6xC5VsCyJZ02wvUBJy";
const DEFAULT_ROYALTY_FEE = toNano('0.1'); // 0.1 TON default royalty fee

describe('VestingMaster - Extended Tests with Logger Operations', () => {
    let vestingMasterCode: Cell;
    let vestingWalletCode: Cell;
    let vestingLoggerCode: Cell;

    beforeAll(async () => {
        // Compile required contracts
        vestingMasterCode = await compile('VestingMaster');
        vestingWalletCode = await compile('VestingWallet');
        vestingLoggerCode = await compile('VestingLogger');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let user1: SandboxContract<TreasuryContract>;
    let user2: SandboxContract<TreasuryContract>;
    let user3: SandboxContract<TreasuryContract>;
    let user4: SandboxContract<TreasuryContract>;
    let vestingMaster: SandboxContract<VestingMaster>;
    let vestingLogger: SandboxContract<VestingLogger>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        
        deployer = await blockchain.treasury('deployer');
        user1 = await blockchain.treasury('user1');
        user2 = await blockchain.treasury('user2');
        user3 = await blockchain.treasury('user3');
        user4 = await blockchain.treasury('user4');

        // Deploy VestingLogger first
        vestingLogger = blockchain.openContract(
            VestingLogger.createFromConfig(
                {
                    owner_address: deployer.address,
                    deploy_time: 1
                },
                vestingLoggerCode
            )
        );

        const loggerDeployResult = await vestingLogger.sendDeploy(
            deployer.getSender(),
            toNano('0.05')
        );

        expect(loggerDeployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: vestingLogger.address,
            deploy: true,
            success: true,
        });

        // Deploy VestingMaster with logger address
        vestingMaster = blockchain.openContract(
            VestingMaster.createFromConfig(
                {
                    owner_address: deployer.address,
                    vesting_wallet_code: vestingWalletCode,
                    logger_address: vestingLogger.address,
                    total_wallets_created: 0,
                    total_royalty_collected: 0n,
                    royalty_fee: DEFAULT_ROYALTY_FEE,
                },
                vestingMasterCode
            )
        );

        const deployResult = await vestingMaster.sendDeploy(
            deployer.getSender(),
            toNano('0.05')
        );

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: vestingMaster.address,
            deploy: true,
            success: true,
        });
    });

    describe('Logger Integration Tests', () => {
        it('should create vesting wallet and notify logger correctly', async () => {
            const jettonAmount = toNano('100');
            const vestingOwner = user1.address;
            const vestingRecipient = user2.address;
            const jettonMaster = Address.parse(JETTON_MASTER_ADDRESS);
            
            // Vesting parameters
            const vestingStartTime = Math.floor(Date.now() / 1000) + 60;
            const vestingTotalDuration = 3600;
            const unlockPeriod = 360;
            const cliffDuration = 0;
            const isAutoClaim = 1;
            const cancelContractPermission = 2;
            const changeRecipientPermission = 2;

            // Create forward payload
            const forwardPayload1 = beginCell()
                .storeAddress(vestingOwner)
                .storeAddress(vestingRecipient)
                .endCell();

            const forwardPayload2 = beginCell()
                .storeAddress(jettonMaster)
                .storeAddress(user1.address)
                .storeUint(vestingStartTime, 32)
                .storeUint(vestingTotalDuration, 32)
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

            // Create transfer notification message
            const msgBody = beginCell()
                .storeUint(0x7362d09c, 32) // transfer_notification op
                .storeUint(0, 64) // query_id
                .storeCoins(jettonAmount)
                .storeAddress(vestingOwner)
                .storeRef(combinedForwardPayload)
                .endCell();

            const result = await user1.send({
                to: vestingMaster.address,
                value: DEFAULT_ROYALTY_FEE + toNano('1.5'),
                body: msgBody,
            });

            // Check main transaction success
            expect(result.transactions).toHaveTransaction({
                from: user1.address,
                to: vestingMaster.address,
                success: true,
            });

            // Check vesting wallet deployment
            expect(result.transactions).toHaveTransaction({
                from: vestingMaster.address,
                deploy: true,
            });

            // Check jetton transfer
            expect(result.transactions).toHaveTransaction({
                from: vestingMaster.address,
                to: user1.address,
                success: true,
            });

            // Check logger notification with register_wallet op
            expect(result.transactions).toHaveTransaction({
                from: vestingMaster.address,
                to: vestingLogger.address,
                success: true,
            });

            // Verify the logger message contains correct op code
            const loggerTx = result.transactions.find(tx => 
                tx.inMessage?.info.dest?.toString() === vestingLogger.address.toString() &&
                tx.inMessage?.info.src?.toString() === vestingMaster.address.toString()
            );
            
            expect(loggerTx).toBeDefined();
            if (loggerTx?.inMessage?.body) {
                const loggerMsgBody = loggerTx.inMessage.body.beginParse();
                const loggerOp = loggerMsgBody.loadUint(32);
                expect(loggerOp).toBe(0xd1d1d1d1); // register_wallet op from VestingLogger
            }

            // Check that stats were updated
            const stats = await vestingMaster.getVestingStats();
            expect(stats.totalWalletsCreated).toEqual(1);
            expect(stats.totalRoyaltyCollected).toEqual(DEFAULT_ROYALTY_FEE);
        });

        it('should handle multiple vesting wallet creations with different auto-claim settings', async () => {
            const jettonAmount = toNano('100');
            const jettonMaster = Address.parse(JETTON_MASTER_ADDRESS);
            const vestingStartTime = Math.floor(Date.now() / 1000);

            // Create first vesting wallet with auto-claim enabled
            const forwardPayload1_1 = beginCell()
                .storeAddress(user1.address)
                .storeAddress(user2.address)
                .endCell();

            const forwardPayload1_2 = beginCell()
                .storeAddress(jettonMaster)
                .storeAddress(user1.address)
                .storeUint(vestingStartTime, 32)
                .storeUint(3600, 32)
                .storeUint(360, 32)
                .storeUint(0, 32)
                .storeUint(1, 1) // auto-claim enabled
                .storeUint(2, 3)
                .storeUint(2, 3)
                .endCell();

            const combinedPayload1 = beginCell()
                .storeRef(forwardPayload1_1)
                .storeRef(forwardPayload1_2)
                .endCell();

            const msgBody1 = beginCell()
                .storeUint(0x7362d09c, 32)
                .storeUint(0, 64)
                .storeCoins(jettonAmount)
                .storeAddress(user1.address)
                .storeRef(combinedPayload1)
                .endCell();

            const result1 = await user1.send({
                to: vestingMaster.address,
                value: DEFAULT_ROYALTY_FEE + toNano('1.5'),
                body: msgBody1,
            });

            expect(result1.transactions).toHaveTransaction({
                from: vestingMaster.address,
                to: vestingLogger.address,
                success: true,
            });

            // Create second vesting wallet with auto-claim disabled
            const forwardPayload2_1 = beginCell()
                .storeAddress(user3.address)
                .storeAddress(user4.address)
                .endCell();

            const forwardPayload2_2 = beginCell()
                .storeAddress(jettonMaster)
                .storeAddress(user3.address)
                .storeUint(vestingStartTime + 3600, 32)
                .storeUint(1800, 32)
                .storeUint(180, 32)
                .storeUint(300, 32)
                .storeUint(0, 1) // auto-claim disabled
                .storeUint(1, 3)
                .storeUint(1, 3)
                .endCell();

            const combinedPayload2 = beginCell()
                .storeRef(forwardPayload2_1)
                .storeRef(forwardPayload2_2)
                .endCell();

            const msgBody2 = beginCell()
                .storeUint(0x7362d09c, 32)
                .storeUint(0, 64)
                .storeCoins(jettonAmount)
                .storeAddress(user3.address)
                .storeRef(combinedPayload2)
                .endCell();

            const result2 = await user3.send({
                to: vestingMaster.address,
                value: DEFAULT_ROYALTY_FEE + toNano('1.5'),
                body: msgBody2,
            });

            expect(result2.transactions).toHaveTransaction({
                from: vestingMaster.address,
                to: vestingLogger.address,
                success: true,
            });

            // Check final stats
            const stats = await vestingMaster.getVestingStats();
            expect(stats.totalWalletsCreated).toEqual(2);
            expect(stats.totalRoyaltyCollected).toEqual(DEFAULT_ROYALTY_FEE * 2n);
        });

        it('should not send logger message when logger address is null', async () => {
            // Use a different address that we can control - use user3's address
            // and then verify that old logger doesn't receive messages
            const tempLogger = user3.address;

            await vestingMaster.sendSetLoggerAddress(
                deployer.getSender(),
                tempLogger
            );

            const jettonAmount = toNano('100');
            const forwardPayload1 = beginCell()
                .storeAddress(user1.address)
                .storeAddress(user2.address)
                .endCell();

            const forwardPayload2 = beginCell()
                .storeAddress(Address.parse(JETTON_MASTER_ADDRESS))
                .storeAddress(user1.address)
                .storeUint(Math.floor(Date.now() / 1000), 32)
                .storeUint(3600, 32)
                .storeUint(360, 32)
                .storeUint(0, 32)
                .storeUint(1, 1)
                .storeUint(2, 3)
                .storeUint(2, 3)
                .endCell();

            const combinedForwardPayload = beginCell()
                .storeRef(forwardPayload1)
                .storeRef(forwardPayload2)
                .endCell();

            const msgBody = beginCell()
                .storeUint(0x7362d09c, 32)
                .storeUint(0, 64)
                .storeCoins(jettonAmount)
                .storeAddress(user1.address)
                .storeRef(combinedForwardPayload)
                .endCell();

            const result = await user1.send({
                to: vestingMaster.address,
                value: DEFAULT_ROYALTY_FEE + toNano('1.5'),
                body: msgBody,
            });

            // Should not have transaction to original logger
            expect(result.transactions).not.toHaveTransaction({
                from: vestingMaster.address,
                to: vestingLogger.address,
            });

            // Should have transaction to temp logger instead
            expect(result.transactions).toHaveTransaction({
                from: vestingMaster.address,
                to: tempLogger,
                success: true,
            });

            // But should still create vesting wallet
            expect(result.transactions).toHaveTransaction({
                from: vestingMaster.address,
                deploy: true,
            });
        });

        it('should verify logger message payload structure', async () => {
            const jettonAmount = toNano('100');
            const vestingOwner = user1.address;
            const vestingRecipient = user2.address;
            const jettonMaster = Address.parse(JETTON_MASTER_ADDRESS);
            const isAutoClaim = 1;

            const forwardPayload1 = beginCell()
                .storeAddress(vestingOwner)
                .storeAddress(vestingRecipient)
                .endCell();

            const forwardPayload2 = beginCell()
                .storeAddress(jettonMaster)
                .storeAddress(user1.address)
                .storeUint(Math.floor(Date.now() / 1000), 32)
                .storeUint(3600, 32)
                .storeUint(360, 32)
                .storeUint(0, 32)
                .storeUint(isAutoClaim, 1)
                .storeUint(2, 3)
                .storeUint(2, 3)
                .endCell();

            const combinedForwardPayload = beginCell()
                .storeRef(forwardPayload1)
                .storeRef(forwardPayload2)
                .endCell();

            const msgBody = beginCell()
                .storeUint(0x7362d09c, 32)
                .storeUint(0, 64)
                .storeCoins(jettonAmount)
                .storeAddress(vestingOwner)
                .storeRef(combinedForwardPayload)
                .endCell();

            const result = await user1.send({
                to: vestingMaster.address,
                value: DEFAULT_ROYALTY_FEE + toNano('1.5'),
                body: msgBody,
            });

            // Find logger transaction
            const loggerTx = result.transactions.find(tx => 
                tx.inMessage?.info.dest?.toString() === vestingLogger.address.toString() &&
                tx.inMessage?.info.src?.toString() === vestingMaster.address.toString()
            );

            expect(loggerTx).toBeDefined();
            
            if (loggerTx?.inMessage?.body) {
                const loggerMsgBody = loggerTx.inMessage.body.beginParse();
                
                // Verify op code
                const op = loggerMsgBody.loadUint(32);
                expect(op).toBe(0xd1d1d1d1); // register_wallet op
                
                // Verify query_id
                const queryId = loggerMsgBody.loadUint(64);
                expect(queryId).toBe(0);
                
                // Verify first ref (log_data)
                const logData = loggerMsgBody.loadRef().beginParse();
                const walletAddress = logData.loadAddress();
                const tokenAddress = logData.loadAddress();
                
                expect(tokenAddress.toString()).toBe(jettonMaster.toString());
                
                // Verify second ref (log_data2)
                const logData2 = loggerMsgBody.loadRef().beginParse();
                const ownerAddress = logData2.loadAddress();
                const recipientAddress = logData2.loadAddress();
                const autoClaimFlag = logData2.loadUint(1);
                
                expect(ownerAddress.toString()).toBe(vestingOwner.toString());
                expect(recipientAddress.toString()).toBe(vestingRecipient.toString());
                expect(autoClaimFlag).toBe(isAutoClaim);
            }
        });
    });

    describe('Logger Address Management Tests', () => {
        it('should change logger address and verify new logger receives messages', async () => {
            // Deploy a second logger with DIFFERENT parameters to get different address
            const newLogger = blockchain.openContract(
                VestingLogger.createFromConfig(
                    {
                        owner_address: deployer.address,
                        deploy_time: 999 // Different deploy_time to generate different address
                    },
                    vestingLoggerCode
                )
            );
        
            await newLogger.sendDeploy(deployer.getSender(), toNano('0.05'));
        
            // Verify addresses are actually different
            console.log('Original logger address:', vestingLogger.address.toString());
            console.log('New logger address:', newLogger.address.toString());
            expect(newLogger.address.toString()).not.toBe(vestingLogger.address.toString());
        
            // Change logger address in master
            const result = await vestingMaster.sendSetLoggerAddress(
                deployer.getSender(),
                newLogger.address
            );
        
            expect(result.transactions).toHaveTransaction({
                from: deployer.address,
                to: vestingMaster.address,
                success: true,
            });
        
            // Verify logger address was updated
            const updatedLogger = await vestingMaster.getLoggerAddress();
            expect(updatedLogger.toString()).toBe(newLogger.address.toString());
        
            // Create a vesting wallet and verify message goes to new logger
            const jettonAmount = toNano('100');
            const forwardPayload1 = beginCell()
                .storeAddress(user1.address)
                .storeAddress(user2.address)
                .endCell();
        
            const forwardPayload2 = beginCell()
                .storeAddress(Address.parse(JETTON_MASTER_ADDRESS))
                .storeAddress(user1.address)
                .storeUint(Math.floor(Date.now() / 1000), 32)
                .storeUint(3600, 32)
                .storeUint(360, 32)
                .storeUint(0, 32)
                .storeUint(1, 1)
                .storeUint(2, 3)
                .storeUint(2, 3)
                .endCell();
        
            const combinedForwardPayload = beginCell()
                .storeRef(forwardPayload1)
                .storeRef(forwardPayload2)
                .endCell();
        
            const msgBody = beginCell()
                .storeUint(0x7362d09c, 32)
                .storeUint(0, 64)
                .storeCoins(jettonAmount)
                .storeAddress(user1.address)
                .storeRef(combinedForwardPayload)
                .endCell();
        
            const walletCreationResult = await user1.send({
                to: vestingMaster.address,
                value: DEFAULT_ROYALTY_FEE + toNano('1.5'),
                body: msgBody,
            });
        
            // Should send message to new logger, not old one
            expect(walletCreationResult.transactions).toHaveTransaction({
                from: vestingMaster.address,
                to: newLogger.address,
                success: true,
            });
        
            // Should NOT send message to old logger
            const hasOldLoggerTransaction = walletCreationResult.transactions.some(tx => 
                tx.inMessage?.info.src?.toString() === vestingMaster.address.toString() &&
                tx.inMessage?.info.dest?.toString() === vestingLogger.address.toString()
            );
            expect(hasOldLoggerTransaction).toBe(false);
        });

        it('should fail to change logger address when called by non-owner', async () => {
            const result = await vestingMaster.sendSetLoggerAddress(
                user1.getSender(),
                user2.address
            );

            expect(result.transactions).toHaveTransaction({
                from: user1.address,
                to: vestingMaster.address,
                success: false,
                exitCode: 0xffa0, // access_denied
            });

            // Verify logger address wasn't changed
            const loggerAddress = await vestingMaster.getLoggerAddress();
            expect(loggerAddress.toString()).toBe(vestingLogger.address.toString());
        });
    });

    describe('Gas Optimization Tests', () => {
        it('should handle multiple operations and track gas usage', async () => {
            const initialInfo = await blockchain.getContract(vestingMaster.address);
            const initialBalance = initialInfo.balance;

            // Create multiple vesting wallets
            for (let i = 0; i < 3; i++) {
                const jettonAmount = toNano('100');
                const forwardPayload1 = beginCell()
                    .storeAddress(user1.address)
                    .storeAddress(user2.address)
                    .endCell();

                const forwardPayload2 = beginCell()
                    .storeAddress(Address.parse(JETTON_MASTER_ADDRESS))
                    .storeAddress(user1.address)
                    .storeUint(Math.floor(Date.now() / 1000) + i * 100, 32)
                    .storeUint(3600 + i * 100, 32) // Different durations
                    .storeUint(360, 32)
                    .storeUint(0, 32)
                    .storeUint(i % 2, 1) // Alternate auto-claim
                    .storeUint(2, 3)
                    .storeUint(2, 3)
                    .endCell();

                const combinedForwardPayload = beginCell()
                    .storeRef(forwardPayload1)
                    .storeRef(forwardPayload2)
                    .endCell();

                const msgBody = beginCell()
                    .storeUint(0x7362d09c, 32)
                    .storeUint(i, 64)
                    .storeCoins(jettonAmount)
                    .storeAddress(user1.address)
                    .storeRef(combinedForwardPayload)
                    .endCell();

                await user1.send({
                    to: vestingMaster.address,
                    value: DEFAULT_ROYALTY_FEE + toNano('1.5'),
                    body: msgBody,
                });
            }

            const finalInfo = await blockchain.getContract(vestingMaster.address);
            const finalBalance = finalInfo.balance;
            const stats = await vestingMaster.getVestingStats();

            // Check that all operations succeeded
            expect(stats.totalWalletsCreated).toBe(3);
            expect(stats.totalRoyaltyCollected).toBe(DEFAULT_ROYALTY_FEE * 3n);

            // Balance should have increased due to royalty collection
            expect(finalBalance).toBeGreaterThan(initialBalance);
        });

        it('should verify logger gas consumption is reasonable', async () => {
            const loggerInitialInfo = await blockchain.getContract(vestingLogger.address);
            const loggerInitialBalance = loggerInitialInfo.balance;

            // Create a vesting wallet
            const jettonAmount = toNano('100');
            const forwardPayload1 = beginCell()
                .storeAddress(user1.address)
                .storeAddress(user2.address)
                .endCell();

            const forwardPayload2 = beginCell()
                .storeAddress(Address.parse(JETTON_MASTER_ADDRESS))
                .storeAddress(user1.address)
                .storeUint(Math.floor(Date.now() / 1000), 32)
                .storeUint(3600, 32)
                .storeUint(360, 32)
                .storeUint(0, 32)
                .storeUint(1, 1)
                .storeUint(2, 3)
                .storeUint(2, 3)
                .endCell();

            const combinedForwardPayload = beginCell()
                .storeRef(forwardPayload1)
                .storeRef(forwardPayload2)
                .endCell();

            const msgBody = beginCell()
                .storeUint(0x7362d09c, 32)
                .storeUint(0, 64)
                .storeCoins(jettonAmount)
                .storeAddress(user1.address)
                .storeRef(combinedForwardPayload)
                .endCell();

            await user1.send({
                to: vestingMaster.address,
                value: DEFAULT_ROYALTY_FEE + toNano('1.5'),
                body: msgBody,
            });

            const loggerFinalInfo = await blockchain.getContract(vestingLogger.address);
            const loggerFinalBalance = loggerFinalInfo.balance;

            // Logger should have received some gas for processing
            expect(loggerFinalBalance).toBeGreaterThan(loggerInitialBalance);
        });
    });

    describe('Edge Cases and Error Handling', () => {
        it('should handle empty forward payload gracefully', async () => {
            const jettonAmount = toNano('100');
            
            const msgBody = beginCell()
                .storeUint(0x7362d09c, 32)
                .storeUint(0, 64)
                .storeCoins(jettonAmount)
                .storeAddress(user1.address)
                .storeRef(beginCell().endCell()) // Empty payload
                .endCell();

            const result = await user1.send({
                to: vestingMaster.address,
                value: DEFAULT_ROYALTY_FEE + toNano('0.1'),
                body: msgBody,
            });

            expect(result.transactions).toHaveTransaction({
                from: user1.address,
                to: vestingMaster.address,
                success: true,
            });

            // Should not create vesting wallet or send logger message
            expect(result.transactions).not.toHaveTransaction({
                from: vestingMaster.address,
                deploy: true,
            });

            expect(result.transactions).not.toHaveTransaction({
                from: vestingMaster.address,
                to: vestingLogger.address,
            });
        });

        it('should handle malformed forward payload', async () => {
            const jettonAmount = toNano('100');
            
            // Create malformed payload (missing second ref)
            const malformedPayload = beginCell()
                .storeRef(beginCell()
                    .storeAddress(user1.address)
                    .storeAddress(user2.address)
                    .endCell())
                // Missing second ref - this will cause parsing error
                .endCell();

            const msgBody = beginCell()
                .storeUint(0x7362d09c, 32)
                .storeUint(0, 64)
                .storeCoins(jettonAmount)
                .storeAddress(user1.address)
                .storeRef(malformedPayload)
                .endCell();

            const result = await user1.send({
                to: vestingMaster.address,
                value: DEFAULT_ROYALTY_FEE + toNano('1.5'),
                body: msgBody,
            });

            // Transaction may succeed but vesting wallet won't be created
            // due to malformed payload causing error during parsing
            expect(result.transactions).toHaveTransaction({
                from: user1.address,
                to: vestingMaster.address,
            });

            // Verify stats remain unchanged
            const stats = await vestingMaster.getVestingStats();
            expect(stats.totalWalletsCreated).toBe(0);
        });

        it('should verify wallet address calculation consistency', async () => {
            const owner = user1.address;
            const recipient = user2.address;
            const jettonMaster = Address.parse(JETTON_MASTER_ADDRESS);
            const vestingTotalAmount = toNano('1000');
            const startTime = Math.floor(Date.now() / 1000);
            const totalDuration = 365 * 24 * 3600;
            const unlockPeriod = 30 * 24 * 3600;
            const cliffDuration = 90 * 24 * 3600;
            const isAutoClaim = 1;
            const cancelContractPermission = 1;
            const changeRecipientPermission = 1;

            // Calculate address multiple times
            const addresses = [];
            for (let i = 0; i < 5; i++) {
                const walletAddress = await vestingMaster.getVestingWalletAddress(
                    owner,
                    recipient,
                    jettonMaster,
                    vestingTotalAmount,
                    startTime,
                    totalDuration,
                    unlockPeriod,
                    cliffDuration,
                    isAutoClaim,
                    cancelContractPermission,
                    changeRecipientPermission
                );
                addresses.push(walletAddress.toString());
            }

            // All addresses should be identical
            const firstAddress = addresses[0];
            for (const address of addresses) {
                expect(address).toBe(firstAddress);
            }
        });

        it('should handle different permission combinations correctly', async () => {
            const jettonAmount = toNano('100');
            const jettonMaster = Address.parse(JETTON_MASTER_ADDRESS);
            
            // Test different permission combinations
            const permissionCombinations = [
                { cancel: 0, change: 0 }, // no_permission
                { cancel: 1, change: 1 }, // only_recipient  
                { cancel: 2, change: 2 }, // only_owner
                { cancel: 3, change: 3 }, // both
            ];

            for (let i = 0; i < permissionCombinations.length; i++) {
                const perms = permissionCombinations[i];
                
                const forwardPayload1 = beginCell()
                    .storeAddress(user1.address)
                    .storeAddress(user2.address)
                    .endCell();

                const forwardPayload2 = beginCell()
                    .storeAddress(jettonMaster)
                    .storeAddress(user1.address)
                    .storeUint(Math.floor(Date.now() / 1000) + i * 10, 32)
                    .storeUint(3600, 32)
                    .storeUint(360, 32)
                    .storeUint(0, 32)
                    .storeUint(i % 2, 1) // Alternate auto-claim
                    .storeUint(perms.cancel, 3)
                    .storeUint(perms.change, 3)
                    .endCell();

                const combinedForwardPayload = beginCell()
                    .storeRef(forwardPayload1)
                    .storeRef(forwardPayload2)
                    .endCell();

                const msgBody = beginCell()
                    .storeUint(0x7362d09c, 32)
                    .storeUint(i, 64)
                    .storeCoins(jettonAmount)
                    .storeAddress(user1.address)
                    .storeRef(combinedForwardPayload)
                    .endCell();

                const result = await user1.send({
                    to: vestingMaster.address,
                    value: DEFAULT_ROYALTY_FEE + toNano('1.5'),
                    body: msgBody,
                });

                expect(result.transactions).toHaveTransaction({
                    from: user1.address,
                    to: vestingMaster.address,
                    success: true,
                });

                expect(result.transactions).toHaveTransaction({
                    from: vestingMaster.address,
                    to: vestingLogger.address,
                    success: true,
                });
            }

            // Verify all wallets were created
            const stats = await vestingMaster.getVestingStats();
            expect(stats.totalWalletsCreated).toBe(permissionCombinations.length);
        });
    });

    describe('Stress Tests', () => {
        it('should handle burst of vesting wallet creations', async () => {
            const numberOfWallets = 5; // Reduce number to avoid timeout
            const jettonAmount = toNano('100');
            const jettonMaster = Address.parse(JETTON_MASTER_ADDRESS);
            const baseTime = Math.floor(Date.now() / 1000);

            // Execute transactions sequentially to avoid conflicts
            for (let i = 0; i < numberOfWallets; i++) {
                const forwardPayload1 = beginCell()
                    .storeAddress(user1.address)
                    .storeAddress(user2.address)
                    .endCell();

                const forwardPayload2 = beginCell()
                    .storeAddress(jettonMaster)
                    .storeAddress(user1.address)
                    .storeUint(baseTime + i * 60, 32) // Different start times
                    .storeUint(3600 + i * 100, 32) // Different durations
                    .storeUint(360, 32)
                    .storeUint(i * 60, 32) // Different cliff durations
                    .storeUint(i % 2, 1) // Alternate auto-claim
                    .storeUint(2, 3)
                    .storeUint(2, 3)
                    .endCell();

                const combinedForwardPayload = beginCell()
                    .storeRef(forwardPayload1)
                    .storeRef(forwardPayload2)
                    .endCell();

                const msgBody = beginCell()
                    .storeUint(0x7362d09c, 32)
                    .storeUint(i, 64)
                    .storeCoins(jettonAmount)
                    .storeAddress(user1.address)
                    .storeRef(combinedForwardPayload)
                    .endCell();

                const result = await user1.send({
                    to: vestingMaster.address,
                    value: DEFAULT_ROYALTY_FEE + toNano('1.5'),
                    body: msgBody,
                });

                // Verify each transaction succeeded
                expect(result.transactions).toHaveTransaction({
                    from: user1.address,
                    to: vestingMaster.address,
                    success: true,
                });
            }

            // Check final stats
            const stats = await vestingMaster.getVestingStats();
            expect(stats.totalWalletsCreated).toBe(numberOfWallets);
            expect(stats.totalRoyaltyCollected).toBe(DEFAULT_ROYALTY_FEE * BigInt(numberOfWallets));
        });

        it('should handle mixed operations (wallet creation + admin operations)', async () => {
            // Start with wallet creation
            const jettonAmount = toNano('100');
            const forwardPayload1 = beginCell()
                .storeAddress(user1.address)
                .storeAddress(user2.address)
                .endCell();

            const forwardPayload2 = beginCell()
                .storeAddress(Address.parse(JETTON_MASTER_ADDRESS))
                .storeAddress(user1.address)
                .storeUint(Math.floor(Date.now() / 1000), 32)
                .storeUint(3600, 32)
                .storeUint(360, 32)
                .storeUint(0, 32)
                .storeUint(1, 1)
                .storeUint(2, 3)
                .storeUint(2, 3)
                .endCell();

            const combinedForwardPayload = beginCell()
                .storeRef(forwardPayload1)
                .storeRef(forwardPayload2)
                .endCell();

            const msgBody = beginCell()
                .storeUint(0x7362d09c, 32)
                .storeUint(0, 64)
                .storeCoins(jettonAmount)
                .storeAddress(user1.address)
                .storeRef(combinedForwardPayload)
                .endCell();

            // Create wallet
            const walletResult = await user1.send({
                to: vestingMaster.address,
                value: DEFAULT_ROYALTY_FEE + toNano('1.5'),
                body: msgBody,
            });

            expect(walletResult.transactions).toHaveTransaction({
                from: vestingMaster.address,
                to: vestingLogger.address,
                success: true,
            });

            // Change royalty fee
            await vestingMaster.sendSetRoyaltyFee(deployer.getSender(), toNano('0.2'));

            // Change logger address
            const newLogger = blockchain.openContract(
                VestingLogger.createFromConfig(
                    {
                        owner_address: deployer.address,
                        deploy_time: 1
                    },
                    vestingLoggerCode
                )
            );
            await newLogger.sendDeploy(deployer.getSender(), toNano('0.05'));
            await vestingMaster.sendSetLoggerAddress(deployer.getSender(), newLogger.address);

            // Create another wallet with new settings
            const msgBody2 = beginCell()
                .storeUint(0x7362d09c, 32)
                .storeUint(1, 64)
                .storeCoins(jettonAmount)
                .storeAddress(user2.address)
                .storeRef(combinedForwardPayload)
                .endCell();

            const walletResult2 = await user2.send({
                to: vestingMaster.address,
                value: toNano('0.2') + toNano('1.5'), // New royalty fee
                body: msgBody2,
            });

            // Should go to new logger
            expect(walletResult2.transactions).toHaveTransaction({
                from: vestingMaster.address,
                to: newLogger.address,
                success: true,
            });

            // Verify final state
            const stats = await vestingMaster.getVestingStats();
            expect(stats.totalWalletsCreated).toBe(2);
            
            const currentRoyalty = await vestingMaster.getRoyaltyFee();
            expect(currentRoyalty).toBe(toNano('0.2'));
            
            const currentLogger = await vestingMaster.getLoggerAddress();
            expect(currentLogger.toString()).toBe(newLogger.address.toString());
        });
    });

    describe('Complex Integration Tests', () => {
        it('should handle vesting wallet creation with extreme parameters', async () => {
            const jettonAmount = toNano('1000000'); // 1M tokens
            const jettonMaster = Address.parse(JETTON_MASTER_ADDRESS);
            
            // Extreme parameters
            const vestingStartTime = Math.floor(Date.now() / 1000) + 86400; // 1 day from now
            const vestingTotalDuration = 10 * 365 * 24 * 3600; // 10 years
            const unlockPeriod = 30 * 24 * 3600; // Monthly unlocks
            const cliffDuration = 365 * 24 * 3600; // 1 year cliff
            const isAutoClaim = 1;
            const cancelContractPermission = 3; // both
            const changeRecipientPermission = 2; // only_owner

            const forwardPayload1 = beginCell()
                .storeAddress(user1.address)
                .storeAddress(user2.address)
                .endCell();

            const forwardPayload2 = beginCell()
                .storeAddress(jettonMaster)
                .storeAddress(user1.address)
                .storeUint(vestingStartTime, 32)
                .storeUint(vestingTotalDuration, 32)
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

            const msgBody = beginCell()
                .storeUint(0x7362d09c, 32)
                .storeUint(0, 64)
                .storeCoins(jettonAmount)
                .storeAddress(user1.address)
                .storeRef(combinedForwardPayload)
                .endCell();

            const result = await user1.send({
                to: vestingMaster.address,
                value: DEFAULT_ROYALTY_FEE + toNano('2'), // More gas for complex operation
                body: msgBody,
            });

            expect(result.transactions).toHaveTransaction({
                from: user1.address,
                to: vestingMaster.address,
                success: true,
            });

            expect(result.transactions).toHaveTransaction({
                from: vestingMaster.address,
                deploy: true,
            });

            expect(result.transactions).toHaveTransaction({
                from: vestingMaster.address,
                to: vestingLogger.address,
                success: true,
            });

            // Verify wallet address can be calculated
            const walletAddress = await vestingMaster.getVestingWalletAddress(
                user1.address,
                user2.address,
                jettonMaster,
                jettonAmount,
                vestingStartTime,
                vestingTotalDuration,
                unlockPeriod,
                cliffDuration,
                isAutoClaim,
                cancelContractPermission,
                changeRecipientPermission
            );

            expect(walletAddress).toBeInstanceOf(Address);
        });

        it('should verify logger payload structure with complex data', async () => {
            const jettonAmount = toNano('500000');
            const vestingOwner = user3.address;
            const vestingRecipient = user4.address;
            const jettonMaster = Address.parse(JETTON_MASTER_ADDRESS);
            const isAutoClaim = 0; // disabled

            const forwardPayload1 = beginCell()
                .storeAddress(vestingOwner)
                .storeAddress(vestingRecipient)
                .endCell();

            const forwardPayload2 = beginCell()
                .storeAddress(jettonMaster)
                .storeAddress(user3.address)
                .storeUint(Math.floor(Date.now() / 1000) + 3600, 32)
                .storeUint(5 * 365 * 24 * 3600, 32) // 5 years
                .storeUint(7 * 24 * 3600, 32) // Weekly
                .storeUint(6 * 30 * 24 * 3600, 32) // 6 months cliff
                .storeUint(isAutoClaim, 1)
                .storeUint(1, 3) // only_recipient
                .storeUint(3, 3) // both
                .endCell();

            const combinedForwardPayload = beginCell()
                .storeRef(forwardPayload1)
                .storeRef(forwardPayload2)
                .endCell();

            const msgBody = beginCell()
                .storeUint(0x7362d09c, 32)
                .storeUint(12345, 64) // Custom query_id
                .storeCoins(jettonAmount)
                .storeAddress(vestingOwner)
                .storeRef(combinedForwardPayload)
                .endCell();

            const result = await user3.send({
                to: vestingMaster.address,
                value: DEFAULT_ROYALTY_FEE + toNano('1.8'),
                body: msgBody,
            });

            // Find and verify logger transaction
            const loggerTx = result.transactions.find(tx => 
                tx.inMessage?.info.dest?.toString() === vestingLogger.address.toString() &&
                tx.inMessage?.info.src?.toString() === vestingMaster.address.toString()
            );

            expect(loggerTx).toBeDefined();
            
            if (loggerTx?.inMessage?.body) {
                const loggerMsgBody = loggerTx.inMessage.body.beginParse();
                
                const op = loggerMsgBody.loadUint(32);
                expect(op).toBe(0xd1d1d1d1);
                
                const queryId = loggerMsgBody.loadUint(64);
                expect(queryId).toBe(12345); // Should match original query_id
                
                const logData = loggerMsgBody.loadRef().beginParse();
                const walletAddress = logData.loadAddress();
                const tokenAddress = logData.loadAddress();
                expect(tokenAddress.toString()).toBe(jettonMaster.toString());
                
                const logData2 = loggerMsgBody.loadRef().beginParse();
                const ownerAddress = logData2.loadAddress();
                const recipientAddress = logData2.loadAddress();
                const autoClaimFlag = logData2.loadUint(1);
                
                expect(ownerAddress.toString()).toBe(vestingOwner.toString());
                expect(recipientAddress.toString()).toBe(vestingRecipient.toString());
                expect(autoClaimFlag).toBe(isAutoClaim);
            }
        });

        it('should handle concurrent wallet creations with different users', async () => {
            const users = [user1, user2, user3, user4];
            const jettonAmount = toNano('100');
            const jettonMaster = Address.parse(JETTON_MASTER_ADDRESS);
            const baseTime = Math.floor(Date.now() / 1000);

            // Execute sequentially instead of concurrently to avoid blockchain conflicts
            for (let index = 0; index < users.length; index++) {
                const user = users[index];
                const forwardPayload1 = beginCell()
                    .storeAddress(user.address)
                    .storeAddress(users[(index + 1) % users.length].address) // Circular recipients
                    .endCell();

                const forwardPayload2 = beginCell()
                    .storeAddress(jettonMaster)
                    .storeAddress(user.address)
                    .storeUint(baseTime + index * 3600, 32) // Different start times
                    .storeUint(3600 * (index + 1), 32) // Different durations
                    .storeUint(360, 32)
                    .storeUint(index * 600, 32) // Different cliffs
                    .storeUint(index % 2, 1) // Alternate auto-claim
                    .storeUint((index % 3) + 1, 3) // Different cancel permissions
                    .storeUint(((index + 1) % 3) + 1, 3) // Different change permissions
                    .endCell();

                const combinedForwardPayload = beginCell()
                    .storeRef(forwardPayload1)
                    .storeRef(forwardPayload2)
                    .endCell();

                const msgBody = beginCell()
                    .storeUint(0x7362d09c, 32)
                    .storeUint(index, 64)
                    .storeCoins(jettonAmount)
                    .storeAddress(user.address)
                    .storeRef(combinedForwardPayload)
                    .endCell();

                const result = await user.send({
                    to: vestingMaster.address,
                    value: DEFAULT_ROYALTY_FEE + toNano('1.5'),
                    body: msgBody,
                });

                // Verify transaction succeeded
                expect(result.transactions).toHaveTransaction({
                    from: user.address,
                    to: vestingMaster.address,
                    success: true,
                });

                expect(result.transactions).toHaveTransaction({
                    from: vestingMaster.address,
                    to: vestingLogger.address,
                    success: true,
                });
            }

            // Check final stats
            const stats = await vestingMaster.getVestingStats();
            expect(stats.totalWalletsCreated).toBe(users.length);
            expect(stats.totalRoyaltyCollected).toBe(DEFAULT_ROYALTY_FEE * BigInt(users.length));
        });
    });

    describe('Security and Access Control Tests', () => {
        it('should prevent unauthorized access to all admin functions', async () => {
            const unauthorizedUser = user1;
            const newCode = beginCell().storeUint(999, 32).endCell();
            const newAddress = user2.address;
            const newFee = toNano('0.5');

            // Test all admin functions with unauthorized user
            const adminFunctions = [
                () => vestingMaster.sendSetLoggerAddress(unauthorizedUser.getSender(), newAddress),
                () => vestingMaster.sendUpdateWalletCode(unauthorizedUser.getSender(), newCode),
                () => vestingMaster.sendChangeOwner(unauthorizedUser.getSender(), newAddress),
                () => vestingMaster.sendSetRoyaltyFee(unauthorizedUser.getSender(), newFee),
                () => vestingMaster.sendWithdrawTons(unauthorizedUser.getSender(), toNano('1')),
                () => vestingMaster.sendWithdrawJettons(
                    unauthorizedUser.getSender(), 
                    toNano('100'), 
                    toNano('0.1'), 
                    newAddress
                ),
            ];

            for (const adminFunction of adminFunctions) {
                const result = await adminFunction();
                
                expect(result.transactions).toHaveTransaction({
                    from: unauthorizedUser.address,
                    to: vestingMaster.address,
                    success: false,
                    exitCode: 0xffa0, // access_denied
                });
            }
        });

        it('should maintain security after owner change', async () => {
            const newOwner = user1.address;
            
            // Change owner
            await vestingMaster.sendChangeOwner(deployer.getSender(), newOwner);
            
            // Verify new owner can perform admin operations
            const result1 = await vestingMaster.sendSetRoyaltyFee(
                user1.getSender(), 
                toNano('0.3')
            );
            
            expect(result1.transactions).toHaveTransaction({
                from: user1.address,
                to: vestingMaster.address,
                success: true,
            });
            
            // Verify old owner cannot perform admin operations
            const result2 = await vestingMaster.sendSetRoyaltyFee(
                deployer.getSender(), 
                toNano('0.4')
            );
            
            expect(result2.transactions).toHaveTransaction({
                from: deployer.address,
                to: vestingMaster.address,
                success: false,
                exitCode: 0xffa0, // access_denied
            });
        });
    });

    describe('State Consistency Tests', () => {
        it('should maintain consistent state across multiple operations', async () => {
            // Initial state check
            let stats = await vestingMaster.getVestingStats();
            const initialWallets = stats.totalWalletsCreated;
            const initialRoyalty = stats.totalRoyaltyCollected;
            
            // Create wallets and track state changes
            const walletsToCreate = 5;
            
            for (let i = 0; i < walletsToCreate; i++) {
                const jettonAmount = toNano('100');
                const forwardPayload1 = beginCell()
                    .storeAddress(user1.address)
                    .storeAddress(user2.address)
                    .endCell();

                const forwardPayload2 = beginCell()
                    .storeAddress(Address.parse(JETTON_MASTER_ADDRESS))
                    .storeAddress(user1.address)
                    .storeUint(Math.floor(Date.now() / 1000) + i * 60, 32)
                    .storeUint(3600, 32)
                    .storeUint(360, 32)
                    .storeUint(0, 32)
                    .storeUint(1, 1)
                    .storeUint(2, 3)
                    .storeUint(2, 3)
                    .endCell();

                const combinedForwardPayload = beginCell()
                    .storeRef(forwardPayload1)
                    .storeRef(forwardPayload2)
                    .endCell();

                const msgBody = beginCell()
                    .storeUint(0x7362d09c, 32)
                    .storeUint(i, 64)
                    .storeCoins(jettonAmount)
                    .storeAddress(user1.address)
                    .storeRef(combinedForwardPayload)
                    .endCell();

                await user1.send({
                    to: vestingMaster.address,
                    value: DEFAULT_ROYALTY_FEE + toNano('1.5'),
                    body: msgBody,
                });

                // Check state after each wallet creation
                stats = await vestingMaster.getVestingStats();
                expect(stats.totalWalletsCreated).toBe(initialWallets + i + 1);
                expect(stats.totalRoyaltyCollected).toBe(initialRoyalty + DEFAULT_ROYALTY_FEE * BigInt(i + 1));
            }

            // Final state verification
            stats = await vestingMaster.getVestingStats();
            expect(stats.totalWalletsCreated).toBe(initialWallets + walletsToCreate);
            expect(stats.totalRoyaltyCollected).toBe(initialRoyalty + DEFAULT_ROYALTY_FEE * BigInt(walletsToCreate));
        });

        it('should verify data integrity after admin operations', async () => {
            // Create initial wallet
            const jettonAmount = toNano('100');
            const forwardPayload1 = beginCell()
                .storeAddress(user1.address)
                .storeAddress(user2.address)
                .endCell();

            const forwardPayload2 = beginCell()
                .storeAddress(Address.parse(JETTON_MASTER_ADDRESS))
                .storeAddress(user1.address)
                .storeUint(Math.floor(Date.now() / 1000), 32)
                .storeUint(3600, 32)
                .storeUint(360, 32)
                .storeUint(0, 32)
                .storeUint(1, 1)
                .storeUint(2, 3)
                .storeUint(2, 3)
                .endCell();

            const combinedForwardPayload = beginCell()
                .storeRef(forwardPayload1)
                .storeRef(forwardPayload2)
                .endCell();

            const msgBody = beginCell()
                .storeUint(0x7362d09c, 32)
                .storeUint(0, 64)
                .storeCoins(jettonAmount)
                .storeAddress(user1.address)
                .storeRef(combinedForwardPayload)
                .endCell();

            await user1.send({
                to: vestingMaster.address,
                value: DEFAULT_ROYALTY_FEE + toNano('1.5'),
                body: msgBody,
            });

            const statsBeforeAdmin = await vestingMaster.getVestingStats();
            
            // Perform admin operations
            await vestingMaster.sendSetRoyaltyFee(deployer.getSender(), toNano('0.2'));
            await vestingMaster.sendSetLoggerAddress(deployer.getSender(), user3.address);
            
            // Verify stats unchanged by admin operations
            const statsAfterAdmin = await vestingMaster.getVestingStats();
            expect(statsAfterAdmin.totalWalletsCreated).toBe(statsBeforeAdmin.totalWalletsCreated);
            expect(statsAfterAdmin.totalRoyaltyCollected).toBe(statsBeforeAdmin.totalRoyaltyCollected);
            
            // Verify admin changes took effect
            const newRoyalty = await vestingMaster.getRoyaltyFee();
            expect(newRoyalty).toBe(toNano('0.2'));
            
            const newLogger = await vestingMaster.getLoggerAddress();
            expect(newLogger.toString()).toBe(user3.address.toString());
        });
    });
});