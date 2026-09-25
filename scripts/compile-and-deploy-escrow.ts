import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import solc from 'solc';
import { ethers } from 'ethers';

async function main() {
  console.log('--- Step 1: Compiling HemiCrazy8Escrow.sol ---');
  const contractPath = path.resolve(process.cwd(), 'contracts', 'HemiCrazy8Escrow.sol');
  const sourceCode = fs.readFileSync(contractPath, 'utf8');

  const input = {
    language: 'Solidity',
    sources: {
      'HemiCrazy8Escrow.sol': {
        content: sourceCode,
      },
    },
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode'],
        },
      },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  if (output.errors) {
    let hasError = false;
    for (const error of output.errors) {
      if (error.severity === 'error') {
        console.error('Compilation Error:', error.formattedMessage);
        hasError = true;
      } else {
        console.warn('Compilation Warning:', error.formattedMessage);
      }
    }
    if (hasError) {
      throw new Error('Solidity compilation failed.');
    }
  }

  const contractOutput = output.contracts['HemiCrazy8Escrow.sol']['HemiCrazy8Escrow'];
  const abi = contractOutput.abi;
  const bytecode = contractOutput.evm.bytecode.object;

  console.log('Compilation successful!');

  // Ensure output dir exists
  const outDir = path.resolve(process.cwd(), 'src', 'contracts');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  console.log('--- Step 2: Connecting to Hemi Sepolia Testnet ---');
  const rpcUrl = 'https://testnet.rpc.hemi.network/rpc';
  const privateKey = process.env.admin_PRIVATE_KEY || process.env.ADMIN_PRIVATE_KEY;
  const tokenAddress =
    process.env.CRAZY8_TOKEN_ADDRESS || '0x19B111602A60442CCbe947a58a5fd7CB0195324E';
  const treasuryAddress =
    process.env.ADMIN_WALLETS || '0x8e8e39D67D227E0a8B10095e07EA020D53926df3';

  if (!privateKey) {
    throw new Error('Missing admin_PRIVATE_KEY in .env file');
  }

  const network = ethers.Network.from({
    chainId: 743111,
    name: 'hemi-sepolia',
  });
  const provider = new ethers.JsonRpcProvider(rpcUrl, network, { staticNetwork: network });
  const wallet = new ethers.Wallet(privateKey, provider);

  const balance = await provider.getBalance(wallet.address);
  console.log(`Deployer Address: ${wallet.address}`);
  console.log(`Deployer Balance: ${ethers.formatEther(balance)} ETH`);
  console.log(`Token Address: ${tokenAddress}`);
  console.log(`Treasury Address: ${treasuryAddress}`);

  if (balance === 0n) {
    throw new Error('Deployer wallet has 0 ETH on Hemi Sepolia testnet to pay for gas.');
  }

  console.log('--- Step 3: Deploying HemiCrazy8Escrow ---');
  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  
  // Deploy escrow contract with token and treasury parameters
  const contract = await factory.deploy(tokenAddress, treasuryAddress);
  console.log(`Deploy Transaction Hash: ${contract.deploymentTransaction()?.hash}`);
  console.log('Waiting for block confirmation on Hemi Sepolia...');

  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();

  console.log('----------------------------------------------------');
  console.log(`✅ HemiCrazy8Escrow deployed successfully to: ${contractAddress}`);
  console.log(`Explorer URL: https://testnet.explorer.hemi.xyz/address/${contractAddress}`);
  console.log('----------------------------------------------------');

  // Verify parameters
  const configuredToken = await (contract as any).token();
  const configuredTreasury = await (contract as any).treasury();
  const feeBps = await (contract as any).HOUSE_FEE_BPS();

  console.log(`Token Linked: ${configuredToken}`);
  console.log(`Treasury Linked: ${configuredTreasury}`);
  console.log(`House Fee: ${Number(feeBps) / 100}% (Board fee to house)`);

  // Save artifact
  const artifact = {
    address: contractAddress,
    network: 'Hemi Sepolia Testnet',
    chainId: 743111,
    deployer: wallet.address,
    tokenAddress: configuredToken,
    treasuryAddress: configuredTreasury,
    houseFeeBps: Number(feeBps),
    deployedAt: new Date().toISOString(),
    txHash: contract.deploymentTransaction()?.hash,
    abi,
  };

  fs.writeFileSync(
    path.join(outDir, 'HemiCrazy8Escrow.json'),
    JSON.stringify(artifact, null, 2),
    'utf8'
  );
  console.log(`Artifact saved to src/contracts/HemiCrazy8Escrow.json`);
}

main().catch((err) => {
  console.error('Escrow deployment error:', err);
  process.exit(1);
});
