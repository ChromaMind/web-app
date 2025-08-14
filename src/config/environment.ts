// Environment configuration for different networks
export type Environment = 'local' | 'sepolia' | 'mainnet';

// Get current environment from environment variable or default to local
export const getCurrentEnvironment = (): Environment => {
  return (process.env.NEXT_PUBLIC_ENVIRONMENT as Environment) || 'local';
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
      tripFactory: '0xA0425Dbe5B9D5f3dE15206f7F908A209357C4aFA',
      streamingLedger: '0x2abEA1c905c8547E4D7e2000257A77e52cB8A4cC'
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
      tripFactory: '0xA0425Dbe5B9D5f3dE15206f7F908A209357C4aFA',
      streamingLedger: '0x2abEA1c905c8547E4D7e2000257A77e52cB8A4cC'
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
      streamingLedger: ''
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
