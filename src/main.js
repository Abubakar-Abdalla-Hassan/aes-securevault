import {
  decryptFile,
  decryptText,
  encryptFile,
  encryptText,
  getDownloadName,
} from './crypto.js';

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

const state = {
  selectedFile: null,
  encryptedDownloadBlob: null,
  encryptedDownloadName: 'encrypted-file.aes',
  decryptedBlob: null,
  decryptedName: 'restored-file.bin',
};

const elements = {
  themeToggle: document.getElementById('themeToggle'),
  mobileMenu: document.querySelector('.mobile-menu'),
  sidebar: document.querySelector('.sidebar'),
  navLinks: Array.from(document.querySelectorAll('.nav-link')),
  textPlaintext: document.getElementById('textPlaintext'),
  textPassword: document.getElementById('textPassword'),
  encryptTextBtn: document.getElementById('encryptTextBtn'),
  copyCiphertextBtn: document.getElementById('copyCiphertextBtn'),
  downloadCiphertextBtn: document.getElementById('downloadCiphertextBtn'),
  clearTextBtn: document.getElementById('clearTextBtn'),
  ciphertextOutput: document.getElementById('ciphertextOutput'),
  encryptedPayload: document.getElementById('encryptedPayload'),
  decryptPassword: document.getElementById('decryptPassword'),
  decryptTextBtn: document.getElementById('decryptTextBtn'),
  copyPlaintextBtn: document.getElementById('copyPlaintextBtn'),
  clearDecryptBtn: document.getElementById('clearDecryptBtn'),
  plaintextOutput: document.getElementById('plaintextOutput'),
  fileInput: document.getElementById('fileInput'),
  encryptedFileInput: document.getElementById('encryptedFileInput'),
  filePassword: document.getElementById('filePassword'),
  decryptFilePassword: document.getElementById('decryptFilePassword'),
  encryptFileBtn: document.getElementById('encryptFileBtn'),
  downloadEncryptedFileBtn: document.getElementById('downloadEncryptedFileBtn'),
  removeSelectedFileBtn: document.getElementById('removeSelectedFileBtn'),
  decryptFileBtn: document.getElementById('decryptFileBtn'),
  downloadOriginalFileBtn: document.getElementById('downloadOriginalFileBtn'),
  selectedFileInfo: document.getElementById('selectedFileInfo'),
  encryptedFileInfo: document.getElementById('encryptedFileInfo'),
  fileProgress: document.getElementById('fileProgress'),
  dropZone: document.getElementById('dropZone'),
  decryptDropZone: document.getElementById('decryptDropZone'),
  toastContainer: document.getElementById('toastContainer'),
};

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  elements.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 350);
  }, 2600);
}

function setBusy(button, isBusy, label) {
  if (!button) return;

  if (isBusy) {
    button.dataset.originalText = button.textContent;
    button.textContent = label;
    button.disabled = true;
    return;
  }

  button.textContent = button.dataset.originalText || label;
  button.disabled = false;
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function togglePasswordVisibility(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;

  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';

  const trigger = document.querySelector(`[data-toggle-password="${inputId}"]`);
  if (trigger) {
    trigger.textContent = isPassword ? 'Hide' : 'Show';
  }
}

function updateSelectedFileDisplay(file, targetElement) {
  if (!file) {
    targetElement.innerHTML = '<strong>No file selected</strong><span>Choose a PDF, image, text file, or document to encrypt.</span>';
    return;
  }

  const sizeInKB = (file.size / 1024).toFixed(1);
  targetElement.innerHTML = `
    <strong>${file.name}</strong>
    <span>${file.type || 'Unknown type'} • ${sizeInKB} KB</span>
  `;
}

function updateEncryptedFileDisplay(file) {
  if (!file) {
    elements.encryptedFileInfo.innerHTML = '<strong>No encrypted file selected</strong><span>Use an encrypted .aes archive to recover the original file.</span>';
    return;
  }

  const sizeInKB = (file.size / 1024).toFixed(1);
  elements.encryptedFileInfo.innerHTML = `
    <strong>${file.name}</strong>
    <span>${file.type || 'Encrypted archive'} • ${sizeInKB} KB</span>
  `;
}

function attachPasswordToggleButtons() {
  document.querySelectorAll('[data-toggle-password]').forEach((button) => {
    button.addEventListener('click', () => {
      const inputId = button.getAttribute('data-toggle-password');
      togglePasswordVisibility(inputId);
    });
  });
}

function applyTheme() {
  const isLight = document.body.classList.contains('theme-light');
  elements.themeToggle.innerHTML = isLight ? '<span class="toggle-icon">☀️</span>' : '<span class="toggle-icon">🌙</span>';
}

function toggleTheme() {
  document.body.classList.toggle('theme-light');
  applyTheme();
}

function handleFileSelection(file, isEncrypted = false) {
  if (!file) return;

  if (file.size > MAX_FILE_SIZE_BYTES) {
    showToast('Selected file is too large. Please use a file smaller than 25 MB.', 'error');
    return;
  }

  if (isEncrypted) {
    state.encryptedFile = file;
    updateEncryptedFileDisplay(file);
    return;
  }

  state.selectedFile = file;
  updateSelectedFileDisplay(file, elements.selectedFileInfo);
  elements.fileProgress.textContent = 'File ready for encryption';
}

function clearTextPanel() {
  elements.textPlaintext.value = '';
  elements.textPassword.value = '';
  elements.ciphertextOutput.value = '';
}

function clearDecryptPanel() {
  elements.encryptedPayload.value = '';
  elements.decryptPassword.value = '';
  elements.plaintextOutput.value = '';
}

function resetFileSelection() {
  state.selectedFile = null;
  elements.fileInput.value = '';
  updateSelectedFileDisplay(null, elements.selectedFileInfo);
  elements.filePassword.value = '';
  elements.fileProgress.textContent = 'Ready for encryption';
  state.encryptedDownloadBlob = null;
}

function resetEncryptedFileSelection() {
  state.encryptedFile = null;
  elements.encryptedFileInput.value = '';
  updateEncryptedFileDisplay(null);
  elements.decryptFilePassword.value = '';
  state.decryptedBlob = null;
  state.decryptedName = 'restored-file.bin';
}

async function encryptTextMessage() {
  const plaintext = elements.textPlaintext.value;
  const password = elements.textPassword.value.trim();

  if (!password) {
    showToast('Please enter a password to encrypt the message.', 'error');
    return;
  }

  try {
    setBusy(elements.encryptTextBtn, true, 'Encrypting...');
    const encryptedPayload = await encryptText(plaintext, password);
    elements.ciphertextOutput.value = encryptedPayload;
    showToast('Message encrypted successfully.', 'success');
  } catch (error) {
    showToast(error.message || 'Encryption failed. Please try again.', 'error');
  } finally {
    setBusy(elements.encryptTextBtn, false, 'Encrypt Message');
  }
}

async function decryptTextMessage() {
  const encryptedPayload = elements.encryptedPayload.value.trim();
  const password = elements.decryptPassword.value.trim();

  if (!encryptedPayload) {
    showToast('Paste a valid encrypted payload before decrypting.', 'error');
    return;
  }

  if (!password) {
    showToast('Please enter the decryption password.', 'error');
    return;
  }

  try {
    setBusy(elements.decryptTextBtn, true, 'Decrypting...');
    const decryptedText = await decryptText(encryptedPayload, password);
    elements.plaintextOutput.value = decryptedText;
    showToast('Message decrypted successfully.', 'success');
  } catch (error) {
    showToast(error.message || 'Decryption failed. Check your password or encrypted message.', 'error');
  } finally {
    setBusy(elements.decryptTextBtn, false, 'Decrypt Message');
  }
}

async function encryptSelectedFile() {
  const file = state.selectedFile;
  const password = elements.filePassword.value.trim();

  if (!file) {
    showToast('Select a file to encrypt first.', 'error');
    return;
  }

  if (!password) {
    showToast('Please enter a password to encrypt this file.', 'error');
    return;
  }

  try {
    setBusy(elements.encryptFileBtn, true, 'Encrypting...');
    elements.fileProgress.textContent = 'Processing file securely...';
    const encryptedResult = await encryptFile(file, password);
    state.encryptedDownloadBlob = encryptedResult.blob;
    state.encryptedDownloadName = encryptedResult.fileName;
    elements.fileProgress.textContent = 'Encryption complete. Download ready.';
    showToast('File encrypted successfully.', 'success');
  } catch (error) {
    elements.fileProgress.textContent = 'Encryption failed';
    showToast(error.message || 'Unable to encrypt the selected file.', 'error');
  } finally {
    setBusy(elements.encryptFileBtn, false, 'Encrypt File');
  }
}

function downloadCiphertext() {
  const value = elements.ciphertextOutput.value.trim();
  if (!value) {
    showToast('Encrypt a message before downloading the ciphertext.', 'error');
    return;
  }

  const blob = new Blob([value], { type: 'application/json' });
  const fileName = getDownloadName('encrypted-message', '.txt');
  downloadBlob(blob, fileName);
  showToast('Encrypted text downloaded.', 'success');
}

async function copyToClipboard(text, successMessage) {
  if (!text || !text.trim()) {
    showToast('Nothing to copy yet.', 'error');
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    showToast(successMessage, 'success');
  } catch {
    showToast('Clipboard access unavailable. Please copy manually.', 'error');
  }
}

async function decryptSelectedFile() {
  const file = state.encryptedFile;
  const password = elements.decryptFilePassword.value.trim();

  if (!file) {
    showToast('Select an encrypted .aes file to decrypt first.', 'error');
    return;
  }

  if (!password) {
    showToast('Please enter the decryption password.', 'error');
    return;
  }

  try {
    setBusy(elements.decryptFileBtn, true, 'Decrypting...');
    const decryptedResult = await decryptFile(file, password);
    state.decryptedBlob = decryptedResult.blob;
    state.decryptedName = decryptedResult.originalName;
    showToast('File decrypted successfully.', 'success');
  } catch (error) {
    showToast(error.message || 'Decryption failed. Check your password or encrypted file.', 'error');
  } finally {
    setBusy(elements.decryptFileBtn, false, 'Decrypt File');
  }
}

function downloadCurrentEncryptedFile() {
  if (!state.encryptedDownloadBlob) {
    showToast('Encrypt a file before downloading the secure archive.', 'error');
    return;
  }

  downloadBlob(state.encryptedDownloadBlob, state.encryptedDownloadName);
  showToast('Encrypted file downloaded.', 'success');
}

function downloadOriginalFile() {
  if (!state.decryptedBlob) {
    showToast('Decrypt a file before requesting the original output.', 'error');
    return;
  }

  downloadBlob(state.decryptedBlob, state.decryptedName);
  showToast('Original file downloaded.', 'success');
}

function attachEvents() {
  elements.themeToggle.addEventListener('click', toggleTheme);
  elements.mobileMenu.addEventListener('click', () => {
    elements.sidebar.classList.toggle('open');
  });

  elements.navLinks.forEach((link) => {
    link.addEventListener('click', () => {
      elements.navLinks.forEach((navLink) => navLink.classList.remove('active'));
      link.classList.add('active');
      elements.sidebar.classList.remove('open');
    });
  });

  elements.encryptTextBtn.addEventListener('click', encryptTextMessage);
  elements.copyCiphertextBtn.addEventListener('click', () => copyToClipboard(elements.ciphertextOutput.value, 'Ciphertext copied to clipboard.'));
  elements.downloadCiphertextBtn.addEventListener('click', downloadCiphertext);
  elements.clearTextBtn.addEventListener('click', () => {
    if (window.confirm('Clear all text encryption fields?')) {
      clearTextPanel();
    }
  });

  elements.decryptTextBtn.addEventListener('click', decryptTextMessage);
  elements.copyPlaintextBtn.addEventListener('click', () => copyToClipboard(elements.plaintextOutput.value, 'Plaintext copied to clipboard.'));
  elements.clearDecryptBtn.addEventListener('click', () => {
    if (window.confirm('Clear all decryption fields?')) {
      clearDecryptPanel();
    }
  });

  elements.fileInput.addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    handleFileSelection(file, false);
  });

  elements.encryptedFileInput.addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    handleFileSelection(file, true);
  });

  elements.dropZone.addEventListener('dragover', (event) => {
    event.preventDefault();
    elements.dropZone.classList.add('dragover');
  });

  elements.dropZone.addEventListener('dragleave', () => {
    elements.dropZone.classList.remove('dragover');
  });

  elements.dropZone.addEventListener('drop', (event) => {
    event.preventDefault();
    elements.dropZone.classList.remove('dragover');
    const file = event.dataTransfer?.files?.[0];
    handleFileSelection(file, false);
    elements.fileInput.value = '';
  });

  elements.decryptDropZone.addEventListener('dragover', (event) => {
    event.preventDefault();
    elements.decryptDropZone.classList.add('dragover');
  });

  elements.decryptDropZone.addEventListener('dragleave', () => {
    elements.decryptDropZone.classList.remove('dragover');
  });

  elements.decryptDropZone.addEventListener('drop', (event) => {
    event.preventDefault();
    elements.decryptDropZone.classList.remove('dragover');
    const file = event.dataTransfer?.files?.[0];
    handleFileSelection(file, true);
    elements.encryptedFileInput.value = '';
  });

  elements.dropZone.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      elements.fileInput.click();
    }
  });

  elements.decryptDropZone.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      elements.encryptedFileInput.click();
    }
  });

  elements.encryptFileBtn.addEventListener('click', encryptSelectedFile);
  elements.downloadEncryptedFileBtn.addEventListener('click', downloadCurrentEncryptedFile);
  elements.removeSelectedFileBtn.addEventListener('click', () => {
    if (window.confirm('Remove the selected file?')) {
      resetFileSelection();
    }
  });

  elements.decryptFileBtn.addEventListener('click', decryptSelectedFile);
  elements.downloadOriginalFileBtn.addEventListener('click', downloadOriginalFile);

  attachPasswordToggleButtons();
}

function init() {
  if (!window.crypto || !window.crypto.subtle) {
    showToast('This browser does not support the Web Crypto API. AES SecureVault requires secure local encryption support.', 'error');
    return;
  }

  applyTheme();
  attachEvents();
  showToast('AES SecureVault is ready to use.', 'success');
}

init();
