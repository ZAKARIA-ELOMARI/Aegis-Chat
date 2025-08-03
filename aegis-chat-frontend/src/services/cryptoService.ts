// In src/services/cryptoService.ts
import nacl from 'tweetnacl';
import { decodeBase64, encodeBase64 } from 'tweetnacl-util';

// Define the shape of our key pair for TypeScript
export interface KeyPair {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
}

/**
 * Generates a new public/private key pair using TweetNaCl's box algorithm.
 * @returns {KeyPair} The generated key pair.
 */
export const generateKeyPair = (): KeyPair => {
  return nacl.box.keyPair();
};

/**
 * Encrypts a string message for a specific recipient.
 * @param message The plaintext string to encrypt.
 * @param theirPublicKey The recipient's public key as a base64 encoded string.
 * @param mySecretKey The sender's (your own) secret key as a Uint8Array.
 * @returns The encrypted payload (nonce + ciphertext) as a base64 string.
 */
export const encryptMessage = (
  message: string,
  theirPublicKey: string,
  mySecretKey: Uint8Array
): string => {
  // A nonce is a random number used once per message to prevent replay attacks
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const messageUint8 = new TextEncoder().encode(message);
  const theirPublicKeyUint8 = decodeBase64(theirPublicKey);

  const encrypted = nacl.box(messageUint8, nonce, theirPublicKeyUint8, mySecretKey);

  // Prepend the nonce to the encrypted message. The recipient will need it for decryption.
  const fullMessage = new Uint8Array(nonce.length + encrypted.length);
  fullMessage.set(nonce);
  fullMessage.set(encrypted, nonce.length);

  return encodeBase64(fullMessage);
};

/**
 * Decrypts a base64 encoded message.
 * @param encryptedMessageB64 The full encrypted payload (nonce + ciphertext) as a base64 string.
 * @param theirPublicKey The sender's public key as a base64 encoded string.
 * @param mySecretKey The recipient's (your own) secret key as a Uint8Array.
 * @returns The decrypted string, or null if decryption fails.
 */
export const decryptMessage = (
  encryptedMessageB64: string,
  theirPublicKey: string,
  mySecretKey: Uint8Array
): string | null => {
  try {
    const messageWithNonce = decodeBase64(encryptedMessageB64);
    const nonce = messageWithNonce.slice(0, nacl.box.nonceLength);
    const message = messageWithNonce.slice(nacl.box.nonceLength);
    const theirPublicKeyUint8 = decodeBase64(theirPublicKey);

    const decrypted = nacl.box.open(message, nonce, theirPublicKeyUint8, mySecretKey);

    if (!decrypted) {
      console.error("Decryption failed: Ciphertext could not be authenticated.");
      return null;
    }

    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error("An error occurred during decryption:", error);
    return null;
  }
};