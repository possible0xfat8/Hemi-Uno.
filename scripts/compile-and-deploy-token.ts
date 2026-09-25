import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import solc from 'solc';
import { ethers } from 'ethers';

async function main() {
  console.log('--- Step 1: Compiling HemiCrazy8Token.sol ---');
  const contractPath = path.resolve(process.cwd(), 'contracts', 'HemiCrazy8Token.sol');
  const sourceCode = fs.readFileSync(contractPath, 'utf8');

  const input = {
    language: 'Solidity',
    sources: {
      'HemiCrazy8Token.sol': {
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

  const contractOutput = output.contracts['HemiCrazy8Token.sol']['HemiCrazy8Token'];
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

  if (!privateKey) {
    throw new Error('Missing admin_PRIVATE_KEY in .env file');
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  const balance = await provider.getBalance(wallet.address);
  console.log(`Deployer Address: ${wallet.address}`);
  console.log(`Deployer Balance: ${ethers.formatEther(balance)} ETH`);

  if (balance === 0n) {
    throw new Error('Deployer wallet has 0 ETH on Hemi Sepolia testnet to pay for gas.');
  }

  console.log('--- Step 3: Deploying HemiCrazy8Token ($CRAZY8) ---');
  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  
  // Deploy contract
  const contract = await factory.deploy();
  console.log(`Deploy Transaction Hash: ${contract.deploymentTransaction()?.hash}`);
  console.log('Waiting for block confirmation on Hemi Sepolia...');

  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();

  console.log('----------------------------------------------------');
  console.log(`✅ HemiCrazy8Token deployed successfully to: ${contractAddress}`);
  console.log(`Explorer URL: https://testnet.explorer.hemi.xyz/address/${contractAddress}`);
  console.log('----------------------------------------------------');

  // Verify initial state
  const name = await (contract as any).name();
  const symbol = await (contract as any).symbol();
  const totalSupply = await (contract as any).totalSupply();
  const contractPool = await (contract as any).balanceOf(contractAddress);

  console.log(`Token Name: ${name}`);
  console.log(`Token Symbol: ${symbol}`);
  console.log(`Total Supply: ${ethers.formatEther(totalSupply)} ${symbol}`);
  console.log(`Contract Airdrop Pool: ${ethers.formatEther(contractPool)} ${symbol}`);

  // Save artifact
  const artifact = {
    address: contractAddress,
    network: 'Hemi Sepolia Testnet',
    chainId: 743111,
    deployer: wallet.address,
    deployedAt: new Date().toISOString(),
    txHash: contract.deploymentTransaction()?.hash,
    abi,
  };

  fs.writeFileSync(
    path.join(outDir, 'HemiCrazy8Token.json'),
    JSON.stringify(artifact, null, 2),
    'utf8'
  );
  console.log(`Artifact saved to src/contracts/HemiCrazy8Token.json`);
}

main().catch((err) => {
  console.error('Deployment error:', err);
  process.exit(1);
});
