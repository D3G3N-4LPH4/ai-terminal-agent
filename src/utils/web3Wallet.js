/**
 * Web3 Wallet Integration for Solana
 * Supports Phantom, Solflare, and other Solana wallets
 *
 * SECURITY: This approach never stores private keys in the application.
 * Wallets manage keys internally and only provide signatures when requested.
 */

/**
 * Check if Phantom wallet is installed
 */
export function isPhantomInstalled() {
  return typeof window !== 'undefined' && window.solana && window.solana.isPhantom;
}

/**
 * Check if Solflare wallet is installed
 */
export function isSolflareInstalled() {
  return typeof window !== 'undefined' && window.solflare && window.solflare.isSolflare;
}

/**
 * Get available wallet providers
 */
export function getAvailableWallets() {
  const wallets = [];

  if (isPhantomInstalled()) {
    wallets.push({
      name: 'Phantom',
      icon: '👻',
      provider: window.solana,
      type: 'phantom'
    });
  }

  if (isSolflareInstalled()) {
    wallets.push({
      name: 'Solflare',
      icon: '☀️',
      provider: window.solflare,
      type: 'solflare'
    });
  }

  return wallets;
}

/**
 * Connect to a Web3 wallet
 * @param {string} walletType - 'phantom' or 'solflare'
 * @returns {Promise<Object>} Connected wallet info
 */
export async function connectWallet(walletType = 'phantom') {
  try {
    let provider;

    if (walletType === 'phantom') {
      if (!isPhantomInstalled()) {
        throw new Error('Phantom wallet not installed. Install from https://phantom.app');
      }
      provider = window.solana;
    } else if (walletType === 'solflare') {
      if (!isSolflareInstalled()) {
        throw new Error('Solflare wallet not installed. Install from https://solflare.com');
      }
      provider = window.solflare;
    } else {
      throw new Error(`Unsupported wallet type: ${walletType}`);
    }

    // Request connection
    const response = await provider.connect();
    const publicKey = response.publicKey.toString();

    // Store only public key and wallet type (no private keys!)
    const walletInfo = {
      publicKey,
      walletType,
      connected: true,
      connectedAt: new Date().toISOString()
    };

    // Save to localStorage (only public info)
    localStorage.setItem('web3_wallet', JSON.stringify(walletInfo));

    console.log(`✅ Connected to ${walletType}:`, publicKey);

    return walletInfo;
  } catch (error) {
    console.error('Wallet connection error:', error);
    throw error;
  }
}

/**
 * Disconnect wallet
 * @param {string} walletType - 'phantom' or 'solflare'
 */
export async function disconnectWallet(walletType = 'phantom') {
  try {
    let provider;

    if (walletType === 'phantom') {
      provider = window.solana;
    } else if (walletType === 'solflare') {
      provider = window.solflare;
    }

    if (provider && provider.disconnect) {
      await provider.disconnect();
    }

    localStorage.removeItem('web3_wallet');
    console.log(`✅ Disconnected from ${walletType}`);
  } catch (error) {
    console.error('Wallet disconnect error:', error);
    throw error;
  }
}

/**
 * Get connected wallet info
 * @returns {Object|null} Wallet info or null if not connected
 */
export function getConnectedWallet() {
  try {
    const stored = localStorage.getItem('web3_wallet');
    if (!stored) return null;

    const wallet = JSON.parse(stored);

    // Verify wallet is still connected
    const provider = wallet.walletType === 'phantom' ? window.solana : window.solflare;
    if (!provider || !provider.isConnected) {
      localStorage.removeItem('web3_wallet');
      return null;
    }

    return wallet;
  } catch (error) {
    console.error('Error getting connected wallet:', error);
    return null;
  }
}

/**
 * Sign a transaction with connected wallet
 * @param {Object} transaction - Solana transaction object
 * @param {string} walletType - 'phantom' or 'solflare'
 * @returns {Promise<Object>} Signed transaction
 */
export async function signTransaction(transaction, walletType = 'phantom') {
  try {
    const provider = walletType === 'phantom' ? window.solana : window.solflare;

    if (!provider || !provider.isConnected) {
      throw new Error('Wallet not connected');
    }

    const signedTransaction = await provider.signTransaction(transaction);
    return signedTransaction;
  } catch (error) {
    console.error('Transaction signing error:', error);
    throw error;
  }
}

/**
 * Sign and send a transaction
 * @param {Object} transaction - Solana transaction object
 * @param {string} walletType - 'phantom' or 'solflare'
 * @returns {Promise<string>} Transaction signature
 */
export async function signAndSendTransaction(transaction, walletType = 'phantom') {
  try {
    const provider = walletType === 'phantom' ? window.solana : window.solflare;

    if (!provider || !provider.isConnected) {
      throw new Error('Wallet not connected');
    }

    // Sign and send transaction
    const { signature } = await provider.signAndSendTransaction(transaction);
    console.log('Transaction sent:', signature);

    return signature;
  } catch (error) {
    console.error('Transaction send error:', error);
    throw error;
  }
}

/**
 * Sign a message with connected wallet
 * @param {string} message - Message to sign
 * @param {string} walletType - 'phantom' or 'solflare'
 * @returns {Promise<Uint8Array>} Signature
 */
export async function signMessage(message, walletType = 'phantom') {
  try {
    const provider = walletType === 'phantom' ? window.solana : window.solflare;

    if (!provider || !provider.isConnected) {
      throw new Error('Wallet not connected');
    }

    const encodedMessage = new TextEncoder().encode(message);
    const signature = await provider.signMessage(encodedMessage);

    return signature;
  } catch (error) {
    console.error('Message signing error:', error);
    throw error;
  }
}

/**
 * Get wallet balance using Web3 connection
 * @param {string} publicKey - Wallet public key
 * @returns {Promise<Object>} Balance information
 */
export async function getWeb3Balance(publicKey) {
  try {
    const response = await fetch(`http://localhost:3001/api/fenrir/wallet/balance/${publicKey}`);

    if (!response.ok) {
      throw new Error(`Failed to get balance: ${response.statusText}`);
    }

    const balance = await response.json();
    return balance;
  } catch (error) {
    console.error('Balance fetch error:', error);
    throw error;
  }
}

/**
 * Listen for wallet account changes
 * @param {Function} callback - Called when account changes
 * @param {string} walletType - 'phantom' or 'solflare'
 */
export function onAccountChange(callback, walletType = 'phantom') {
  const provider = walletType === 'phantom' ? window.solana : window.solflare;

  if (provider && provider.on) {
    provider.on('accountChanged', (publicKey) => {
      if (publicKey) {
        console.log('Account changed to:', publicKey.toString());
        callback(publicKey.toString());
      } else {
        console.log('Account disconnected');
        localStorage.removeItem('web3_wallet');
        callback(null);
      }
    });
  }
}

/**
 * Get installation links for wallets
 */
export function getWalletInstallLinks() {
  return {
    phantom: 'https://phantom.app',
    solflare: 'https://solflare.com'
  };
}

/**
 * Check if any Web3 wallet is available
 */
export function isWeb3Available() {
  return isPhantomInstalled() || isSolflareInstalled();
}
