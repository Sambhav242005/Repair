const BASE = 'http://127.0.0.1:8765';
let pairingCode = '';
export const companionConnection = {
  get connected() { return !!pairingCode; },
  pair(code: string) { pairingCode = code; },
  disconnect() { pairingCode = ''; },
  async request<T = any>(path: string, options: RequestInit = {}, code = pairingCode): Promise<T> {
    if (!path.startsWith('/') || path.startsWith('//')) throw new Error('Companion requests must use a local API path.');
    const response = await fetch(BASE + path, {...options, headers: {...options.headers,
      Authorization: `Bearer ${code}`, ...(options.body ? {'Content-Type':'application/json'} : {})}, signal: AbortSignal.timeout(45000)});
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || data.error?.message || 'Companion request failed.');
    return data;
  },
};
