const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.WALLET_ENCRYPTION_KEY, 'hex'); // 32 bytes

/**
 * Encrypt a private key string using AES-256-GCM.
 * Returns "iv:authTag:encryptedData" in hex format.
 */
function encryptPrivateKey(privateKey) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(privateKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return iv.toString('hex') + ':' + authTag + ':' + encrypted;
}

/**
 * Decrypt a private key stored as "iv:authTag:encryptedData" (GCM).
 * Also handles legacy "iv:encryptedData" (CBC) for backwards compatibility.
 */
function decryptPrivateKey(encryptedStr) {
  const parts = encryptedStr.split(':');

  if (parts.length === 3) {
    // New GCM format: iv:authTag:ciphertext
    const [ivHex, authTagHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } else if (parts.length === 2) {
    // Legacy CBC format: iv:ciphertext (backwards compat)
    const [ivHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', KEY, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } else {
    throw new Error('Invalid encrypted key format');
  }
}

module.exports = { encryptPrivateKey, decryptPrivateKey };

