/**
 * Hemi Network Configuration & Web3 Wallet Helper
 * Primary target: Hemi Sepolia Testnet (Chain ID 743111 / 0xb56c7)
 * Also supports: Hemi Mainnet (Chain ID 43111 / 0xa867)
 * Native Token: ETH
 */

export interface ChainConfig {
  chainId: string;
  chainIdDecimal: number;
  chainName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls: string[];
}

export const HEMI_SEPOLIA_CONFIG: ChainConfig = {
  chainId: '0xb56c7', // 743111 in hex
  chainIdDecimal: 743111,
  chainName: 'Hemi Sepolia',
  nativeCurrency: {
    name: 'Sepolia Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: ['https://testnet.rpc.hemi.network/rpc'],
  blockExplorerUrls: ['https://testnet.explorer.hemi.xyz'],
};

export const HEMI_MAINNET_CONFIG: ChainConfig = {
  chainId: '0xa867', // 43111 in hex
  chainIdDecimal: 43111,
  chainName: 'Hemi Network',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: ['https://rpc.hemi.network/rpc'],
  blockExplorerUrls: ['https://explorer.hemi.xyz'],
};

// Default target chain for the dApp
export const DEFAULT_HEMI_CONFIG = HEMI_SEPOLIA_CONFIG;

export interface WalletState {
  address: string | null;
  chainId: number | null;
  balance: string | null;
  isConnecting: boolean;
  error: string | null;
  walletName: string | null;
}

/**
 * Check if the chain ID belongs to Hemi (Sepolia Testnet or Mainnet)
 */
export function isHemiChain(chainId: number | null | undefined): boolean {
  if (!chainId) return false;
  return (
    chainId === HEMI_SEPOLIA_CONFIG.chainIdDecimal ||
    chainId === HEMI_MAINNET_CONFIG.chainIdDecimal
  );
}

/**
 * Get human-readable network info for Hemi
 */
export function getHemiNetworkInfo(chainId: number | null | undefined): {
  isHemi: boolean;
  name: string;
  isTestnet: boolean;
  explorerUrl: string;
  symbol: string;
} {
  if (chainId === HEMI_SEPOLIA_CONFIG.chainIdDecimal) {
    return {
      isHemi: true,
      name: 'Hemi Sepolia',
      isTestnet: true,
      explorerUrl: 'https://testnet.explorer.hemi.xyz',
      symbol: 'ETH',
    };
  }
  if (chainId === HEMI_MAINNET_CONFIG.chainIdDecimal) {
    return {
      isHemi: true,
      name: 'Hemi Mainnet',
      isTestnet: false,
      explorerUrl: 'https://explorer.hemi.xyz',
      symbol: 'ETH',
    };
  }
  return {
    isHemi: false,
    name: 'Wrong Network',
    isTestnet: false,
    explorerUrl: 'https://testnet.explorer.hemi.xyz',
    symbol: 'ETH',
  };
}

/**
 * Shorten Ethereum/Hemi address for UI display
 */
export function formatAddress(address: string | null | undefined): string {
  if (!address) return '';
  if (address.length < 10) return address;
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

/**
 * Safely access the injected Ethereum provider (window.ethereum)
 */
export function getInjectedProvider(): any {
  if (typeof window === 'undefined') return null;
  const anyWindow = window as any;
  return anyWindow.ethereum || null;
}

/**
 * Safely query ETH balance and format to 4 decimals
 */
export async function fetchEthBalance(provider: any, address: string): Promise<string> {
  if (!provider || !provider.request || !address) return '0.0000';
  try {
    const rawBal: string = await provider.request({
      method: 'eth_getBalance',
      params: [address, 'latest'],
    });
    const wei = BigInt(rawBal || '0x0');
    const ethWhole = wei / 1000000000000000000n;
    const ethFraction = (wei % 1000000000000000000n) / 100000000000000n; // 4 decimals
    const fractionStr = ethFraction.toString().padStart(4, '0');
    return `${ethWhole}.${fractionStr}`;
  } catch (err) {
    console.warn('Failed to fetch balance:', err);
    return '0.0000';
  }
}

/**
 * Switch or add Hemi Sepolia Testnet (or Mainnet)
 */
export async function switchOrAddHemiNetwork(
  provider: any,
  targetConfig: ChainConfig = HEMI_SEPOLIA_CONFIG
): Promise<boolean> {
  if (!provider || !provider.request) return false;
  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: targetConfig.chainId }],
    });
    return true;
  } catch (switchError: any) {
    // 4902 indicates that the chain has not been added to MetaMask / wallet
    const isUnrecognized =
      switchError?.code === 4902 ||
      switchError?.data?.originalError?.code === 4902 ||
      String(switchError?.message || '').toLowerCase().includes('unrecognized') ||
      String(switchError?.message || '').includes('4902');

    if (isUnrecognized) {
      try {
        await provider.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: targetConfig.chainId,
              chainName: targetConfig.chainName,
              nativeCurrency: targetConfig.nativeCurrency,
              rpcUrls: targetConfig.rpcUrls,
              blockExplorerUrls: targetConfig.blockExplorerUrls,
            },
          ],
        });
        return true;
      } catch (addError) {
        console.warn('Failed to add Hemi network:', addError);
        return false;
      }
    }

    // User rejected request
    if (switchError?.code === 4001) {
      console.warn('User rejected network switch request');
      return false;
    }

    console.warn('Failed to switch to Hemi network:', switchError);
    return false;
  }
}
