// ─── E2E Encryption Module (Phase 2) ───
// Client-side encryption for room payloads.
// Server stores ciphertext only — zero-knowledge architecture.
//
// Threat Model:
// - Server is considered honest-but-curious: it relays data faithfully but may read it.
// - Each room has a unique AES-GCM key derived via PBKDF2 from a room passphrase.
// - The passphrase is never sent to the server; it's shared out-of-band (e.g., in the URL fragment).
// - Forward secrecy is NOT provided (same key used for all updates in a room).
// - If the passphrase leaks, all past data for that room is compromised.
// - Mitigation: rotate room keys by creating a new room.
//
// Implementation:
// 1. User provides a passphrase when creating/joining an encrypted room.
// 2. Derive AES-256-GCM key from passphrase + room salt via PBKDF2 (100k iterations).
// 3. Encrypt each Yjs update/snapshot before sending to server.
// 4. Decrypt received updates/snapshots before applying locally.

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for AES-GCM
const SALT_LENGTH = 16;
const PBKDF2_ITERATIONS = 100000;

/**
 * Derive an AES-GCM key from a passphrase and salt.
 */
export async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Generate a random salt for key derivation.
 */
export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

/**
 * Encrypt a Uint8Array payload.
 * Returns: salt (16 bytes) + iv (12 bytes) + ciphertext
 */
export async function encrypt(data: Uint8Array, passphrase: string): Promise<Uint8Array> {
  const salt = generateSalt();
  const key = await deriveKey(passphrase, salt);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv: iv as BufferSource },
    key,
    data as BufferSource
  );

  // Concatenate: salt + iv + ciphertext
  const result = new Uint8Array(SALT_LENGTH + IV_LENGTH + ciphertext.byteLength);
  result.set(salt, 0);
  result.set(iv, SALT_LENGTH);
  result.set(new Uint8Array(ciphertext), SALT_LENGTH + IV_LENGTH);

  return result;
}

/**
 * Decrypt a payload produced by encrypt().
 * Input format: salt (16 bytes) + iv (12 bytes) + ciphertext
 */
export async function decrypt(encryptedData: Uint8Array, passphrase: string): Promise<Uint8Array> {
  const salt = encryptedData.slice(0, SALT_LENGTH);
  const iv = encryptedData.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const ciphertext = encryptedData.slice(SALT_LENGTH + IV_LENGTH);

  const key = await deriveKey(passphrase, salt);

  const plaintext = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv: iv as BufferSource },
    key,
    ciphertext as BufferSource
  );

  return new Uint8Array(plaintext);
}

/**
 * Encrypt a Yjs update before sending to server.
 */
export async function encryptUpdate(update: Uint8Array, passphrase: string): Promise<Uint8Array> {
  return encrypt(update, passphrase);
}

/**
 * Decrypt a Yjs update received from server.
 */
export async function decryptUpdate(encryptedUpdate: Uint8Array, passphrase: string): Promise<Uint8Array> {
  return decrypt(encryptedUpdate, passphrase);
}
