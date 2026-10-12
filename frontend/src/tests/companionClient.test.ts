import { afterEach, expect, it, vi } from 'vitest';
import { companionConnection } from '../api/companionClient';

afterEach(() => {companionConnection.disconnect();vi.unstubAllGlobals();});

it('keeps pairing in page memory and sends it only to the fixed loopback companion',async()=>{
  const fetchMock=vi.fn().mockResolvedValue({ok:true,json:async()=>({connected:true})});
  vi.stubGlobal('fetch',fetchMock);
  companionConnection.pair('local-test-code');
  expect(companionConnection.connected).toBe(true);
  await companionConnection.request('/status');
  expect(fetchMock.mock.calls[0][0]).toBe('http://127.0.0.1:8765/status');
  expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer local-test-code');
  companionConnection.disconnect();
  expect(companionConnection.connected).toBe(false);
});

it('reports denied companion requests as errors instead of connected state',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false,json:async()=>({detail:'Pair again'})}));
  await expect(companionConnection.request('/status')).rejects.toThrow('Pair again');
});

it('rejects paths that could change the destination of the pairing code',async()=>{
  const fetchMock=vi.fn();vi.stubGlobal('fetch',fetchMock);
  companionConnection.pair('local-test-code');
  await expect(companionConnection.request('@evil.example/status')).rejects.toThrow('local API path');
  await expect(companionConnection.request('//evil.example/status')).rejects.toThrow('local API path');
  expect(fetchMock).not.toHaveBeenCalled();
});
