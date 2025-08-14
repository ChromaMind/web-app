// Environment configuration for different networks
export type Environment = 'local' | 'sepolia' | 'mainnet';

// Get current environment from environment variable or default to local
export const getCurrentEnvironment = (): Environment => {
  return (process.env.NEXT_PUBLIC_ENVIRONMENT as Environment) || 'sepolia';
};

// Environment-specific configurations
export const ENVIRONMENT_CONFIG = {
  local: {
    name: 'Sepolia Testnet',
    chainId: 11155111,
    rpcUrl: 'https://lb.drpc.org/sepolia/AplHGB2v9khYpYVNxc5za0FG8GqzeK8R8IrYIgaNGuYu',
    explorerUrl: 'https://sepolia.etherscan.io',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    contracts: {
      tripFactory: '0xA3EF656C1BfeF416E5Ba93344e420c6B142CAcb4',
      streamingLedger: '0x70d5B407fb6713e9A0847A903233342624291Feb',
      tripNftTest: '0x23f5af18AD81e91Eb1570c0a390757a63Db25EDB'
    }
  },
  sepolia: {
    name: 'Sepolia Testnet',
    chainId: 11155111,
    rpcUrl: 'https://lb.drpc.org/sepolia/AplHGB2v9khYpYVNxc5za0FG8GqzeK8R8IrYIgaNGuYu',
    explorerUrl: 'https://sepolia.etherscan.io',
    nativeCurrency: {
      name: 'Sepolia Ether',
      symbol: 'SEP',
      decimals: 18
    },
    contracts: {
      tripFactory: '0xbDE876Fef492e9AAFb4f96B3F81C296e3Eb08ad0',
      streamingLedger: '0x70d5B407fb6713e9A0847A903233342624291Feb',
      tripNftTest: '0x23f5af18AD81e91Eb1570c0a390757a63Db25EDB'
    }
  },
  mainnet: {
    name: 'Ethereum Mainnet',
    chainId: 1,
    rpcUrl: 'https://eth.llamarpc.com',
    explorerUrl: 'https://etherscan.io',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    contracts: {
      tripFactory: '', // Add mainnet addresses when deployed
      streamingLedger: '',
      tripNftTest: ''
    }
  }
};

// Get current environment config
export const getCurrentConfig = () => {
  const env = getCurrentEnvironment();
  return ENVIRONMENT_CONFIG[env];
};

// Helper to check if we're in development
export const isDevelopment = () => getCurrentEnvironment() === 'sepolia';
export const isTestnet = () => getCurrentEnvironment() === 'sepolia';
export const isMainnet = () => getCurrentEnvironment() === 'mainnet';
