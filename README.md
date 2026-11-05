# AES SecureVault

AES SecureVault is a responsive, browser-based cryptography application that demonstrates AES-256-GCM encryption and decryption for both text and binary files. It was built as an educational project for a Cryptography and Network Security course, with all encryption and decryption operations happening locally in the user's browser using the Web Crypto API.

## Features

- Text encryption and decryption using AES-256-GCM
- Password-based key derivation with PBKDF2-HMAC-SHA256
- Secure random IV generation for every encryption event
- File encryption and decryption for common binary formats
- Full .aes encrypted file container support with metadata preservation
- Educational AES content with rounds, transformations, and security concepts
- Responsive dark cybersecurity UI with accessibility-friendly controls
- Local-only cryptography workflow with no backend or database

## Technology Stack

- HTML5
- CSS3
- JavaScript ES6+
- Web Crypto API
- Vite
- Lucide-inspired SVG/icon styling via CSS and inline emoji-style icons

## AES Encryption Workflow

1. The user provides a plaintext message or file and a password.
2. A random 16-byte salt is generated for each operation.
3. A random 12-byte IV is generated for each AES-GCM encryption.
4. A key is derived from the password using `PBKDF2` with `SHA-256` and `600000` iterations.
5. The plaintext or file bytes are encrypted with AES-256-GCM.
6. The encrypted payload is packaged as a versioned JSON container containing salt, IV, metadata, and ciphertext.
7. Decryption repeats the same key derivation and verifies the authentication tag before returning the original content.

## How to Run Locally

```bash
npm install
npm run dev
```

Open the link shown in the terminal to view the site in a browser.

## How to Build

```bash
npm run build
```

The production build output will be placed in the `dist/` directory.

## How to Deploy to Vercel

1. Push the project to a GitHub repository.
2. Create a Vercel project linked to that repository.
3. Set the framework preset to `Vite`.
4. Import the project and deploy.
5. No backend or database is required because the site runs entirely in the browser.

## Security Limitations

- Weak passwords reduce effective security.
- Forgotten passwords cannot be recovered because keys are never stored.
- This is a local educational demo and should not be treated as a production-grade password manager.
- Use HTTPS in production, especially if the project is deployed publicly.
- The application does not store encryption keys or passwords anywhere.

## Testing and Demonstration

Use the built-in interface to verify:

- Message encryption and decryption with the correct password
- Rejection of incorrect passwords
- File encryption and decryption for PDF, image, and text files
- Handling of corrupted or malformed encrypted payloads
- Mobile responsiveness and clipboard download workflows

For repeatable automated validation, run:

```bash
npm test
```

## Project Structure

```text
.
├── index.html
├── src/
│   ├── crypto.js
│   ├── main.js
│   └── styles.css
├── tests/
│   └── crypto.test.js
├── package.json
├── README.md
├── .gitignore
└── dist/
```
