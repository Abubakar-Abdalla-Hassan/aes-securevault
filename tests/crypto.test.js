import assert from 'node:assert/strict';
import test from 'node:test';

import {
  decryptFile,
  decryptText,
  encryptFile,
  encryptText,
} from '../src/crypto.js';

test('encryptText and decryptText round-trip correctly with Unicode text', async () => {
  const original = 'Salaan, waa maxay? 👋';
  const payload = await encryptText(original, 'StrongPassword!123');
  const decrypted = await decryptText(payload, 'StrongPassword!123');

  assert.equal(decrypted, original);
});

test('decryptText rejects an incorrect password', async () => {
  const payload = await encryptText('secret plan', 'rightPassword');

  await assert.rejects(async () => {
    await decryptText(payload, 'wrongPassword');
  }, /Decryption failed/);
});

test('encryptText supports empty message safely', async () => {
  const payload = await encryptText('', 'emptyMessagePassword');
  const decrypted = await decryptText(payload, 'emptyMessagePassword');

  assert.equal(decrypted, '');
});

test('repeated encryption produces different ciphertext', async () => {
  const first = await encryptText('same message', 'samePassword');
  const second = await encryptText('same message', 'samePassword');

  assert.notEqual(first, second);
});

test('encryptFile and decryptFile round-trip correctly', async () => {
  const file = new File([Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7])], 'sample.pdf', {
    type: 'application/pdf',
  });

  const encrypted = await encryptFile(file, 'fileSecretPassword');
  const decrypted = await decryptFile(encrypted.blob, 'fileSecretPassword');

  assert.equal(decrypted.originalName, 'sample.pdf');
  assert.equal(decrypted.mimeType, 'application/pdf');

  const restored = new Uint8Array(await decrypted.blob.arrayBuffer());
  assert.deepEqual(Array.from(restored), [0, 1, 2, 3, 4, 5, 6, 7]);
});

test('decryptFile rejects malformed payloads', async () => {
  const blob = new Blob(['not valid json'], { type: 'application/octet-stream' });

  await assert.rejects(async () => {
    await decryptFile(blob, 'anyPassword');
  }, /Decryption failed/);
});
