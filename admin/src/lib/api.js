import { decryptSettingsPayload, decryptSubmission, encryptSettings } from './payloadCrypto.js';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000/api';

function isContactSubmissionPath(path) {
  return path.includes('/contact-submissions');
}

export async function apiRequest(path, options = {}) {
  const token = localStorage.getItem('cms_token');
  const headers = {
    Accept: 'application/json',
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const isSettingsUpdate = path === '/admin/settings' && (options.method ?? 'GET') === 'PUT';
  let body = options.body;

  if (isSettingsUpdate && typeof body === 'string') {
    const parsed = JSON.parse(body);
    body = JSON.stringify({ settings: await encryptSettings(parsed.settings ?? parsed) });
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    body,
    headers,
  });

  let payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload.message ?? 'Request failed. Please try again.';
    const error = new Error(message);
    error.status = response.status;
    error.errors = payload.errors;
    throw error;
  }

  if (path.includes('/settings')) {
    payload = { ...payload, settings: await decryptSettingsPayload(payload.settings ?? {}) };
  } else if (isContactSubmissionPath(path)) {
    if (Array.isArray(payload.data)) {
      payload = { ...payload, data: await Promise.all(payload.data.map((item) => decryptSubmission(item))) };
    } else if (payload.submission) {
      payload = { ...payload, submission: await decryptSubmission(payload.submission) };
    }
  }

  return payload;
}
