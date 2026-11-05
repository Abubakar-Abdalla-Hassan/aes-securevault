export const PBKDF2_ITERATIONS = 600000;
export const MAX_PBKDF2_ITERATIONS = 2_000_000;

export function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';

  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }

  return btoa(binary);
}

export function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes.buffer;
}

export function textToBase64(text) {
  return arrayBufferToBase64(new TextEncoder().encode(text));
}

export function base64ToText(base64) {
  return new TextDecoder().decode(base64ToArrayBuffer(base64));
}

export function sanitizeFileName(name = 'download') {
  return name.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');
}

export function getDownloadName(fileName, extension) {
  const safeName = sanitizeFileName(fileName || 'download');
  return safeName.toLowerCase().endsWith(extension.toLowerCase())
    ? safeName
    : `${safeName}${extension}`;
}

export async function deriveKey(password, salt, iterations = PBKDF2_ITERATIONS) {
  if (!password || typeof password !== 'string') {
    throw new Error('Password is required to derive the encryption key.');
  }

  const safeIterations = Number.parseInt(String(iterations), 10);
  if (!Number.isFinite(safeIterations) || safeIterations < 1 || safeIterations > MAX_PBKDF2_ITERATIONS) {
    throw new Error('Unsupported PBKDF2 iteration count.');
  }

  const passwordKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt instanceof Uint8Array ? salt : new Uint8Array(salt),
      iterations: safeIterations,
      hash: 'SHA-256',
    },
    passwordKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptText(plaintext, password) {
  if (typeof plaintext !== 'string') {
    throw new Error('Plaintext must be a string.');
  }

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, PBKDF2_ITERATIONS);
  const encodedPlaintext = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
      tagLength: 128,
    },
    key,
    encodedPlaintext,
  );

  const payload = {
    version: 1,
    algorithm: 'AES-256-GCM',
    kdf: 'PBKDF2-SHA-256',
    iterations: PBKDF2_ITERATIONS,
    salt: arrayBufferToBase64(salt.buffer),
    iv: arrayBufferToBase64(iv.buffer),
    ciphertext: arrayBufferToBase64(ciphertext),
  };

  return JSON.stringify(payload);
}

export async function decryptText(payloadText, password) {
  if (typeof payloadText !== 'string' || !payloadText.trim()) {
    throw new Error('Decryption failed. Check your password or encrypted message.');
  }

  let payload;

  try {
    payload = JSON.parse(payloadText);
  } catch {
    throw new Error('Decryption failed. Check your password or encrypted message.');
  }

  if (!payload || typeof payload !== 'object') {
    throw new Error('Decryption failed. Check your password or encrypted message.');
  }

  const { algorithm, kdf, iterations, salt, iv, ciphertext } = payload;
  if (algorithm !== 'AES-256-GCM' || kdf !== 'PBKDF2-SHA-256' || !salt || !iv || !ciphertext) {
    throw new Error('Decryption failed. Check your password or encrypted message.');
  }

  try {
    const key = await deriveKey(password, base64ToArrayBuffer(salt), iterations);
    const plaintextBytes = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: new Uint8Array(base64ToArrayBuffer(iv)),
      },
      key,
      base64ToArrayBuffer(ciphertext),
    );

    return new TextDecoder().decode(plaintextBytes);
  } catch {
    throw new Error('Decryption failed. Check your password or encrypted message.');
  }
}

export async function encryptFile(file, password) {
  if (!(file instanceof Blob)) {
    throw new Error('A valid file is required for encryption.');
  }

  const fileBytes = new Uint8Array(await file.arrayBuffer());
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, PBKDF2_ITERATIONS);
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
      tagLength: 128,
    },
    key,
    fileBytes,
  );

  const payload = {
    version: 1,
    algorithm: 'AES-256-GCM',
    kdf: 'PBKDF2-SHA-256',
    iterations: PBKDF2_ITERATIONS,
    salt: arrayBufferToBase64(salt.buffer),
    iv: arrayBufferToBase64(iv.buffer),
    mimeType: file.type || 'application/octet-stream',
    originalName: textToBase64(file.name || 'download.bin'),
    ciphertext: arrayBufferToBase64(ciphertext),
  };

  const encryptedBlob = new Blob([JSON.stringify(payload)], { type: 'application/octet-stream' });
  const downloadName = `${getDownloadName(file.name || 'download', '.aes')}`;

  return {
    blob: encryptedBlob,
    fileName: downloadName,
  };
}

export async function decryptFile(file, password) {
  if (!(file instanceof Blob)) {
    throw new Error('A valid encrypted file is required for decryption.');
  }

  let payload;

  try {
    payload = JSON.parse(await file.text());
  } catch {
    throw new Error('Decryption failed. Check your password or encrypted file.');
  }

  const { algorithm, kdf, iterations, salt, iv, ciphertext, mimeType, originalName } = payload;
  if (algorithm !== 'AES-256-GCM' || kdf !== 'PBKDF2-SHA-256' || !salt || !iv || !ciphertext) {
    throw new Error('Decryption failed. Check your password or encrypted file.');
  }

  try {
    const key = await deriveKey(password, base64ToArrayBuffer(salt), iterations);
    const plaintext = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: new Uint8Array(base64ToArrayBuffer(iv)),
      },
      key,
      base64ToArrayBuffer(ciphertext),
    );

    const finalName = typeof originalName === 'string' && originalName
      ? base64ToText(originalName)
      : 'restored-file.bin';

    return {
      blob: new Blob([plaintext], { type: mimeType || 'application/octet-stream' }),
      originalName: sanitizeFileName(finalName) || 'restored-file.bin',
      mimeType: mimeType || 'application/octet-stream',
    };
  } catch {
    throw new Error('Decryption failed. Check your password or encrypted file.');
  }
}
