// File: frontend/src/utils/crypto.ts

import nacl from 'tweetnacl';
import util from 'tweetnacl-util';
import apiClient from '../api/apiClient';

/**
 * Generates a new public/private key pair, stores it in localStorage,
 * and uploads the public key to the server.
 */
export const generateAndStoreKeys = async (): Promise<void> => {
  // 1. Generate the key pair
  const keyPair = nacl.box.keyPair();

  // 2. Encode the keys into a readable Base64 format
  const publicKey = util.encodeBase64(keyPair.publicKey);
  const secretKey = util.encodeBase64(keyPair.secretKey);

  // 3. Store the keys securely in the browser's local storage
  localStorage.setItem('publicKey', publicKey);
  localStorage.setItem('secretKey', secretKey);

  // 4. Send the public key to the server to be shared with other users
  try {
    await apiClient.post('/users/key', { publicKey });
    console.log('Public key uploaded successfully.');
  } catch (error) {
    console.error('Failed to upload public key:', error);
    // In a real app, you might want to handle this error more gracefully
  }
};

/**
 * Retrieves the current user's key pair from localStorage.
 * @returns An object containing the publicKey and secretKey, or null if not found.
 */
export const getKeys = (): { publicKey: string; secretKey: string } | null => {
  const publicKey = localStorage.getItem('publicKey');
  const secretKey = localStorage.getItem('secretKey');

  if (publicKey && secretKey) {
    return { publicKey, secretKey };
  }
  return null;
};

/**
 * Encrypts a message for a recipient.
 * @param message The plaintext message string to encrypt.
 * @param theirPublicKey The recipient's public key (in Base64).
 * @param mySecretKey The sender's (your) secret key (in Base64).
 * @returns A JSON string containing the encrypted message and the nonce.
 */
export const encryptMessage = (
  message: string,
  theirPublicKey: string,
  mySecretKey: string
): string => {
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const messageBytes = util.decodeUTF8(message);

  const encrypted = nacl.box(
    messageBytes,
    nonce,
    util.decodeBase64(theirPublicKey),
    util.decodeBase64(mySecretKey)
  );

  // Package the encrypted message and the nonce together
  const payload = {
    nonce: util.encodeBase64(nonce),
    message: util.encodeBase64(encrypted),
  };

  return JSON.stringify(payload);
};

/**
 * Decrypts an incoming message.
 * @param encryptedPayload The JSON string payload received from the sender.
 * @param theirPublicKey The sender's public key (in Base64).
 * @param mySecretKey The recipient's (your) secret key (in Base64).
 * @returns The decrypted plaintext message, or null if decryption fails.
 */
export const decryptMessage = (
  encryptedPayload: string,
  theirPublicKey: string,
  mySecretKey: string
): string | null => {
  try {
    const payload = JSON.parse(encryptedPayload);
    const nonce = util.decodeBase64(payload.nonce);
    const encryptedMessage = util.decodeBase64(payload.message);

    const decryptedBytes = nacl.box.open(
      encryptedMessage,
      nonce,
      util.decodeBase64(theirPublicKey),
      util.decodeBase64(mySecretKey)
    );

    if (decryptedBytes) {
      return util.encodeUTF8(decryptedBytes);
    }
    return null; // Decryption failed
  } catch (e) {
    console.error('Decryption error:', e);
    return null;
  }
};