/**
 * Solana Wallet Utilities
 * Handles wallet generation, storage, and management for Fenrir Trading Bot
 *
 * Security: Private keys are encrypted with AES-256-GCM before localStorage storage.
 * The encryption password is stored only in memory (session) and cleared on page refresh.
 */

import { encrypt, decrypt, isEncryptionSupported } from './encryption.js';

// Session password storage (cleared on page refresh)
let sessionPassword = null;

/**
 * Set the session password for wallet encryption
 * @param {string} password - Password for encryption
 */
export function setWalletPassword(password) {
  sessionPassword = password;
}

/**
 * Check if a wallet password is set
 * @returns {boolean} True if password is set
 */
export function hasWalletPassword() {
  return sessionPassword !== null;
}

/**
 * Clear the session password
 */
export function clearWalletPassword() {
  sessionPassword = null;
}

/**
 * Generate a new Solana wallet (keypair)
 * This calls the backend which has @solana/web3.js installed
 *
 * @returns {Promise<Object>} Wallet data with publicKey and privateKey
 */
export async function generateWallet() {
  try {
    const response = await fetch('http://localhost:3001/api/fenrir/wallet/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to generate wallet: ${response.statusText}`);
    }

    const wallet = await response.json();
    return wallet;
  } catch (error) {
    console.error('Wallet generation error:', error);
    throw error;
  }
}

/**
 * Get wallet balance
 *
 * @param {string} publicKey - Wallet public key
 * @returns {Promise<Object>} Balance information
 */
export async function getWalletBalance(publicKey) {
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
 * Validate Solana private key format
 *
 * @param {string} privateKey - Private key in base58 format
 * @returns {boolean} True if valid
 */
export function isValidPrivateKey(privateKey) {
  if (!privateKey || typeof privateKey !== 'string') {
    return false;
  }

  // Solana private keys are 64 bytes encoded in base58
  // Base58 length is typically 87-88 characters
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{87,88}$/;
  return base58Regex.test(privateKey);
}

/**
 * Store wallet in localStorage with encrypted private key
 *
 * @param {Object} wallet - Wallet object with publicKey and privateKey
 * @param {string} name - Wallet name/label
 * @param {string} [password] - Optional password (uses session password if not provided)
 * @returns {Promise<boolean>} Success status
 */
export async function saveWalletToStorage(wallet, name = 'default', password = null) {
  try {
    const pwd = password || sessionPassword;

    if (!pwd) {
      console.error('No password set for wallet encryption');
      return false;
    }

    if (!isEncryptionSupported()) {
      console.error('Encryption not supported in this browser');
      return false;
    }

    const wallets = JSON.parse(localStorage.getItem('fenrir_wallets') || '{}');

    // Encrypt the private key before storage
    const encryptedPrivateKey = await encrypt(wallet.privateKey, pwd);

    wallets[name] = {
      publicKey: wallet.publicKey,
      encryptedPrivateKey,
      encrypted: true,
      createdAt: new Date().toISOString(),
      label: name
    };

    localStorage.setItem('fenrir_wallets', JSON.stringify(wallets));
    return true;
  } catch (error) {
    console.error('Wallet save error:', error);
    return false;
  }
}

/**
 * Load wallet from localStorage and decrypt private key
 *
 * @param {string} name - Wallet name/label
 * @param {string} [password] - Optional password (uses session password if not provided)
 * @returns {Promise<Object|null>} Wallet object with decrypted privateKey or null
 */
export async function loadWalletFromStorage(name = 'default', password = null) {
  try {
    const wallets = JSON.parse(localStorage.getItem('fenrir_wallets') || '{}');
    const wallet = wallets[name];

    if (!wallet) return null;

    // Handle legacy unencrypted wallets
    if (!wallet.encrypted && wallet.privateKey) {
      console.warn('Found unencrypted wallet - consider re-saving with encryption');
      return wallet;
    }

    const pwd = password || sessionPassword;

    if (!pwd) {
      // Return wallet info without private key
      return {
        publicKey: wallet.publicKey,
        createdAt: wallet.createdAt,
        label: wallet.label,
        needsPassword: true
      };
    }

    // Decrypt the private key
    const privateKey = await decrypt(wallet.encryptedPrivateKey, pwd);

    return {
      publicKey: wallet.publicKey,
      privateKey,
      createdAt: wallet.createdAt,
      label: wallet.label
    };
  } catch (error) {
    console.error('Wallet load error:', error);
    return null;
  }
}

/**
 * List all stored wallets (without private keys)
 *
 * @returns {Array} Array of wallet info
 */
export function listStoredWallets() {
  try {
    const wallets = JSON.parse(localStorage.getItem('fenrir_wallets') || '{}');

    return Object.entries(wallets).map(([name, wallet]) => ({
      name,
      publicKey: wallet.publicKey,
      createdAt: wallet.createdAt,
      label: wallet.label,
      encrypted: wallet.encrypted || false
    }));
  } catch (error) {
    console.error('Wallet list error:', error);
    return [];
  }
}

/**
 * Delete wallet from storage
 *
 * @param {string} name - Wallet name/label
 * @returns {boolean} Success status
 */
export function deleteWalletFromStorage(name) {
  try {
    const wallets = JSON.parse(localStorage.getItem('fenrir_wallets') || '{}');
    delete wallets[name];
    localStorage.setItem('fenrir_wallets', JSON.stringify(wallets));
    return true;
  } catch (error) {
    console.error('Wallet delete error:', error);
    return false;
  }
}

/**
 * Import wallet from private key
 *
 * @param {string} privateKey - Base58 encoded private key
 * @param {string} name - Wallet name/label
 * @param {string} [password] - Optional password for encryption
 * @returns {Promise<Object>} Wallet info
 */
export async function importWallet(privateKey, name = 'imported', password = null) {
  try {
    const response = await fetch('http://localhost:3001/api/fenrir/wallet/import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ privateKey })
    });

    if (!response.ok) {
      throw new Error(`Failed to import wallet: ${response.statusText}`);
    }

    const wallet = await response.json();

    // Save to storage with encryption
    await saveWalletToStorage(wallet, name, password);

    return wallet;
  } catch (error) {
    console.error('Wallet import error:', error);
    throw error;
  }
}

/**
 * Export wallet private key (requires password)
 *
 * @param {string} name - Wallet name
 * @param {string} [password] - Password for decryption
 * @returns {Promise<string|null>} Private key or null
 */
export async function exportWalletPrivateKey(name = 'default', password = null) {
  const wallet = await loadWalletFromStorage(name, password);
  return wallet?.privateKey || null;
}

/**
 * Truncate public key for display
 *
 * @param {string} publicKey - Full public key
 * @returns {string} Truncated key (first 4 and last 4 chars)
 */
export function truncatePublicKey(publicKey) {
  if (!publicKey || publicKey.length < 8) return publicKey;
  return `${publicKey.substring(0, 4)}...${publicKey.substring(publicKey.length - 4)}`;
}

/**
 * Format SOL amount for display
 *
 * @param {number} lamports - Amount in lamports (1 SOL = 1e9 lamports)
 * @returns {string} Formatted SOL amount
 */
export function formatSolAmount(lamports) {
  const sol = lamports / 1e9;
  return sol.toFixed(4);
}

/**
 * Migrate legacy unencrypted wallets to encrypted format
 *
 * @param {string} password - Password to use for encryption
 * @returns {Promise<number>} Number of wallets migrated
 */
export async function migrateLegacyWallets(password) {
  try {
    const wallets = JSON.parse(localStorage.getItem('fenrir_wallets') || '{}');
    let migrated = 0;

    for (const [name, wallet] of Object.entries(wallets)) {
      if (!wallet.encrypted && wallet.privateKey) {
        const encryptedPrivateKey = await encrypt(wallet.privateKey, password);

        wallets[name] = {
          publicKey: wallet.publicKey,
          encryptedPrivateKey,
          encrypted: true,
          createdAt: wallet.createdAt || new Date().toISOString(),
          label: wallet.label || name,
          migratedAt: new Date().toISOString()
        };

        migrated++;
      }
    }

    if (migrated > 0) {
      localStorage.setItem('fenrir_wallets', JSON.stringify(wallets));
    }

    return migrated;
  } catch (error) {
    console.error('Migration error:', error);
    return 0;
  }
}
