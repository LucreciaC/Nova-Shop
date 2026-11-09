const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const KEYS_DIR = process.env.KEYS_DIR || path.join(__dirname, '..', 'keys');
const PRIVATE_KEY_PATH = path.join(KEYS_DIR, 'private.pem');
const PUBLIC_KEY_PATH = path.join(KEYS_DIR, 'public.pem');
const KID = 'nova-shop-rs256-key-1';

let privateKeyPem;
let publicKeyPem;
let jwksPayload;

function initKeys() {
  if (!fs.existsSync(KEYS_DIR)) {
    fs.mkdirSync(KEYS_DIR, { recursive: true });
  }

  if (fs.existsSync(PRIVATE_KEY_PATH) && fs.existsSync(PUBLIC_KEY_PATH)) {
    privateKeyPem = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');
    publicKeyPem = fs.readFileSync(PUBLIC_KEY_PATH, 'utf8');
  } else {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    privateKeyPem = privateKey;
    publicKeyPem = publicKey;
    try {
      fs.writeFileSync(PRIVATE_KEY_PATH, privateKeyPem, 'utf8');
      fs.writeFileSync(PUBLIC_KEY_PATH, publicKeyPem, 'utf8');
    } catch (err) {
      // Ignore write errors in read-only filesystems
    }
  }

  const pubKeyObj = crypto.createPublicKey(publicKeyPem);
  const jwk = pubKeyObj.export({ format: 'jwk' });

  jwksPayload = {
    keys: [
      {
        ...jwk,
        kid: KID,
        use: 'sig',
        alg: 'RS256',
        publicKeyPem,
      },
    ],
  };
}

initKeys();

module.exports = {
  getPrivateKey: () => privateKeyPem,
  getPublicKey: () => publicKeyPem,
  getJwks: () => jwksPayload,
  KID,
};
