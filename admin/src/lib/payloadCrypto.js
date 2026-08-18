// Payload encryption (AES-256-GCM) for sensitive fields in transit.
// The key is fetched from the backend after login and kept in memory only.

let cachedKeyRaw = null;
let cachedKey = null;

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToBase64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

async function getCryptoKey() {
  if (cachedKey) return cachedKey;
  if (!cachedKeyRaw) throw new Error('Payload encryption key is not loaded.');

  const raw = base64ToBytes(cachedKeyRaw);
  cachedKey = await crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
  return cachedKey;
}

export function setPayloadKey(base64Key) {
  cachedKeyRaw = base64Key;
  cachedKey = null;
}

export function clearPayloadKey() {
  cachedKeyRaw = null;
  cachedKey = null;
}

export async function encryptValue(value) {
  if (value === null || value === undefined || value === '') return value;

  const key = await getCryptoKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(String(value));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);

  // Format: iv(12) + ciphertext + tag(16) — matches the backend payload format.
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);

  return { data: bytesToBase64(combined) };
}

export async function decryptValue(value) {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return value;

  if (typeof value === 'object' && typeof value.data === 'string') {
    const key = await getCryptoKey();
    const combined = base64ToBytes(value.data);
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
    return new TextDecoder().decode(decrypted);
  }

  return value;
}

export async function decryptSubmission(submission) {
  const result = { ...submission };
  for (const field of ['name', 'email', 'subject', 'message', 'ip_address', 'user_agent']) {
    if (result[field] !== undefined && result[field] !== null) {
      result[field] = await decryptValue(result[field]);
    }
  }
  return result;
}

export async function decryptSettingsPayload(payload) {
  const result = { ...payload };
  for (const group of Object.keys(result)) {
    if (typeof result[group] !== 'object' || result[group] === null) continue;
    result[group] = { ...result[group] };
    for (const key of Object.keys(result[group])) {
      if (typeof result[group][key] !== 'object' || result[group][key] === null) continue;
      result[group][key] = { ...result[group][key] };
      for (const field of Object.keys(result[group][key])) {
        result[group][key][field] = await decryptValue(result[group][key][field]);
      }
    }
  }
  return result;
}

export async function encryptSettings(payload) {
  const paths = [
    ['general', 'profile', 'email'],
    ['general', 'profile', 'phone'],
    ['contact', 'form', 'recipient_email'],
  ];

  const result = JSON.parse(JSON.stringify(payload));
  for (const [group, key, field] of paths) {
    const value = result?.[group]?.[key]?.[field];
    if (typeof value === 'string' && value.length > 0) {
      result[group][key][field] = await encryptValue(value);
    }
  }
  return result;
}