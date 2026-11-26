import { decryptSettingsPayload, decryptSubmission, encryptSettings } from './payloadCrypto.js';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000/api';

function isContactSubmissionPath(path) {
  return path.includes('/contact-submissions');
}

// Read the response body without assuming it is JSON: gateway error pages
// (502/503/504) and empty bodies are not, and must not throw.
async function parseJsonSafely(response) {
  const text = await response.text();
  if (!text) {
    return {};
  }
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
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

  let payload = await parseJsonSafely(response);

  if (!response.ok) {
    // Session expired or token invalid: clear stored auth and send the user
    // back to the login screen (guard against redirect loops on /login).
    if (response.status === 401) {
      localStorage.removeItem('cms_token');
      localStorage.removeItem('cms_user');
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }

    // 502/503/504 come from the web server (PHP-FPM down / timed out), not the
    // API, so there is no JSON body to read. Surface a clear message instead
    // of letting the UI break on a malformed response.
    const isGatewayError = [502, 503, 504].includes(response.status);
    const message = payload?.message
      ?? (isGatewayError
        ? 'The server is temporarily unavailable. Please try again in a moment.'
        : 'Request failed. Please try again.');

    const error = new Error(message);
    error.status = response.status;
    error.errors = payload?.errors;
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
