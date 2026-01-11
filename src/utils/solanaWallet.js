/**
 * Solana Wallet Utilities
 * Handles wallet generation, storage, and management for Fenrir Trading Bot
 */

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
 * Store wallet in localStorage (encrypted)
 * WARNING: This stores the private key in browser storage. In production,
 * consider using a more secure method like hardware wallets or password encryption.
 *
 * @param {Object} wallet - Wallet object with publicKey and privateKey
 * @param {string} name - Wallet name/label
 */
export function saveWalletToStorage(wallet, name = 'default') {
  try {
    const wallets = JSON.parse(localStorage.getItem('fenrir_wallets') || '{}');

    wallets[name] = {
      publicKey: wallet.publicKey,
      privateKey: wallet.privateKey, // TODO: Encrypt this
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
 * Load wallet from localStorage
 *
 * @param {string} name - Wallet name/label
 * @returns {Object|null} Wallet object or null if not found
 */
export function loadWalletFromStorage(name = 'default') {
  try {
    const wallets = JSON.parse(localStorage.getItem('fenrir_wallets') || '{}');
    return wallets[name] || null;
  } catch (error) {
    console.error('Wallet load error:', error);
    return null;
  }
}

/**
 * List all stored wallets
 *
 * @returns {Array} Array of wallet info (without private keys)
 */
export function listStoredWallets() {
  try {
    const wallets = JSON.parse(localStorage.getItem('fenrir_wallets') || '{}');

    return Object.entries(wallets).map(([name, wallet]) => ({
      name,
      publicKey: wallet.publicKey,
      createdAt: wallet.createdAt,
      label: wallet.label
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
 * @returns {Promise<Object>} Wallet info
 */
export async function importWallet(privateKey, name = 'imported') {
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

    // Save to storage
    saveWalletToStorage(wallet, name);

    return wallet;
  } catch (error) {
    console.error('Wallet import error:', error);
    throw error;
  }
}

/**
 * Export wallet mnemonic/seed phrase (if available)
 *
 * @param {string} name - Wallet name
 * @returns {string|null} Mnemonic phrase or null
 */
export function exportWalletMnemonic(name = 'default') {
  const wallet = loadWalletFromStorage(name);
  return wallet?.mnemonic || null;
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
