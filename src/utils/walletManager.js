/**
 * Unified Wallet Manager
 *
 * Combines Solana wallet utilities (generated keypairs) and
 * Web3 wallet integration (Phantom, Solflare) into a single interface.
 *
 * Wallet Types:
 * - 'generated': Server-generated keypair stored encrypted in localStorage
 * - 'web3': Browser extension wallet (Phantom, Solflare)
 */

import * as SolanaWallet from './solanaWallet.js';
import * as Web3Wallet from './web3Wallet.js';

// Wallet type constants
export const WALLET_TYPES = {
  GENERATED: 'generated',
  WEB3: 'web3',
};

// Current active wallet state
let activeWallet = null;

/**
 * Initialize wallet manager
 * Attempts to restore previous session
 * @returns {Object|null} Active wallet or null
 */
export function initialize() {
  // Check for Web3 wallet first (more secure)
  const web3Wallet = Web3Wallet.getConnectedWallet();
  if (web3Wallet) {
    activeWallet = {
      type: WALLET_TYPES.WEB3,
      publicKey: web3Wallet.publicKey,
      walletProvider: web3Wallet.walletType,
      connected: true,
    };
    return activeWallet;
  }

  // Check for stored generated wallet
  const storedWallets = SolanaWallet.listStoredWallets();
  if (storedWallets.length > 0 && SolanaWallet.hasWalletPassword()) {
    const defaultWallet = storedWallets.find(w => w.name === 'default') || storedWallets[0];
    activeWallet = {
      type: WALLET_TYPES.GENERATED,
      publicKey: defaultWallet.publicKey,
      walletName: defaultWallet.name,
      connected: true,
      needsPassword: !SolanaWallet.hasWalletPassword(),
    };
    return activeWallet;
  }

  return null;
}

/**
 * Get current active wallet
 * @returns {Object|null} Active wallet info
 */
export function getActiveWallet() {
  return activeWallet;
}

/**
 * Check if any wallet is connected
 * @returns {boolean}
 */
export function isConnected() {
  return activeWallet !== null && activeWallet.connected;
}

/**
 * Connect to a Web3 wallet (Phantom/Solflare)
 * @param {string} provider - 'phantom' or 'solflare'
 * @returns {Promise<Object>} Connected wallet
 */
export async function connectWeb3(provider = 'phantom') {
  const wallet = await Web3Wallet.connectWallet(provider);
  activeWallet = {
    type: WALLET_TYPES.WEB3,
    publicKey: wallet.publicKey,
    walletProvider: provider,
    connected: true,
  };
  return activeWallet;
}

/**
 * Generate a new wallet (server-side keypair)
 * @param {string} name - Wallet name
 * @param {string} password - Encryption password
 * @returns {Promise<Object>} Generated wallet
 */
export async function generateWallet(name = 'default', password) {
  if (!password) {
    throw new Error('Password required for wallet generation');
  }

  SolanaWallet.setWalletPassword(password);
  const wallet = await SolanaWallet.generateWallet();
  await SolanaWallet.saveWalletToStorage(wallet, name, password);

  activeWallet = {
    type: WALLET_TYPES.GENERATED,
    publicKey: wallet.publicKey,
    walletName: name,
    connected: true,
  };

  return activeWallet;
}

/**
 * Import existing wallet from private key
 * @param {string} privateKey - Base58 encoded private key
 * @param {string} name - Wallet name
 * @param {string} password - Encryption password
 * @returns {Promise<Object>} Imported wallet
 */
export async function importWallet(privateKey, name = 'imported', password) {
  if (!password) {
    throw new Error('Password required for wallet import');
  }

  SolanaWallet.setWalletPassword(password);
  const wallet = await SolanaWallet.importWallet(privateKey, name, password);

  activeWallet = {
    type: WALLET_TYPES.GENERATED,
    publicKey: wallet.publicKey,
    walletName: name,
    connected: true,
  };

  return activeWallet;
}

/**
 * Unlock generated wallet with password
 * @param {string} name - Wallet name
 * @param {string} password - Decryption password
 * @returns {Promise<Object>} Unlocked wallet info
 */
export async function unlockWallet(name = 'default', password) {
  SolanaWallet.setWalletPassword(password);
  const wallet = await SolanaWallet.loadWalletFromStorage(name, password);

  if (!wallet || !wallet.privateKey) {
    throw new Error('Failed to unlock wallet - incorrect password or wallet not found');
  }

  activeWallet = {
    type: WALLET_TYPES.GENERATED,
    publicKey: wallet.publicKey,
    walletName: name,
    connected: true,
  };

  return activeWallet;
}

/**
 * Disconnect current wallet
 */
export async function disconnect() {
  if (!activeWallet) return;

  if (activeWallet.type === WALLET_TYPES.WEB3) {
    await Web3Wallet.disconnectWallet(activeWallet.walletProvider);
  } else {
    SolanaWallet.clearWalletPassword();
  }

  activeWallet = null;
}

/**
 * Get wallet balance
 * @returns {Promise<Object>} Balance information
 */
export async function getBalance() {
  if (!activeWallet) {
    throw new Error('No wallet connected');
  }

  return SolanaWallet.getWalletBalance(activeWallet.publicKey);
}

/**
 * Get private key (only for generated wallets with password)
 * @param {string} password - Wallet password
 * @returns {Promise<string|null>} Private key or null
 */
export async function getPrivateKey(password) {
  if (!activeWallet || activeWallet.type !== WALLET_TYPES.GENERATED) {
    return null;
  }

  return SolanaWallet.exportWalletPrivateKey(activeWallet.walletName, password);
}

/**
 * Sign a transaction
 * @param {Object} transaction - Transaction to sign
 * @param {string} [password] - Password for generated wallets
 * @returns {Promise<Object>} Signed transaction
 */
export async function signTransaction(transaction, password) {
  if (!activeWallet) {
    throw new Error('No wallet connected');
  }

  if (activeWallet.type === WALLET_TYPES.WEB3) {
    return Web3Wallet.signTransaction(transaction, activeWallet.walletProvider);
  } else {
    // For generated wallets, we need to use the backend
    throw new Error('Transaction signing for generated wallets requires backend support');
  }
}

/**
 * Sign and send a transaction
 * @param {Object} transaction - Transaction to send
 * @returns {Promise<string>} Transaction signature
 */
export async function signAndSendTransaction(transaction) {
  if (!activeWallet) {
    throw new Error('No wallet connected');
  }

  if (activeWallet.type === WALLET_TYPES.WEB3) {
    return Web3Wallet.signAndSendTransaction(transaction, activeWallet.walletProvider);
  } else {
    throw new Error('Transaction sending for generated wallets requires backend support');
  }
}

/**
 * List all available wallets
 * @returns {Array} List of wallet info
 */
export function listWallets() {
  const wallets = [];

  // List Web3 wallets
  const web3Wallets = Web3Wallet.getAvailableWallets();
  web3Wallets.forEach(w => {
    wallets.push({
      type: WALLET_TYPES.WEB3,
      name: w.name,
      icon: w.icon,
      provider: w.type,
      installed: true,
    });
  });

  // Add install suggestions for missing Web3 wallets
  if (!Web3Wallet.isPhantomInstalled()) {
    wallets.push({
      type: WALLET_TYPES.WEB3,
      name: 'Phantom',
      icon: '👻',
      provider: 'phantom',
      installed: false,
      installUrl: 'https://phantom.app',
    });
  }

  // List generated wallets
  const storedWallets = SolanaWallet.listStoredWallets();
  storedWallets.forEach(w => {
    wallets.push({
      type: WALLET_TYPES.GENERATED,
      name: w.name,
      publicKey: w.publicKey,
      encrypted: w.encrypted,
      createdAt: w.createdAt,
    });
  });

  return wallets;
}

/**
 * Delete a generated wallet
 * @param {string} name - Wallet name to delete
 * @returns {boolean} Success status
 */
export function deleteWallet(name) {
  return SolanaWallet.deleteWalletFromStorage(name);
}

/**
 * Get truncated public key for display
 * @param {string} [publicKey] - Public key (uses active wallet if not provided)
 * @returns {string} Truncated key
 */
export function getTruncatedKey(publicKey) {
  const key = publicKey || activeWallet?.publicKey;
  return key ? SolanaWallet.truncatePublicKey(key) : '';
}

/**
 * Format SOL amount for display
 * @param {number} lamports - Amount in lamports
 * @returns {string} Formatted SOL
 */
export function formatSol(lamports) {
  return SolanaWallet.formatSolAmount(lamports);
}

export default {
  WALLET_TYPES,
  initialize,
  getActiveWallet,
  isConnected,
  connectWeb3,
  generateWallet,
  importWallet,
  unlockWallet,
  disconnect,
  getBalance,
  getPrivateKey,
  signTransaction,
  signAndSendTransaction,
  listWallets,
  deleteWallet,
  getTruncatedKey,
  formatSol,
};
