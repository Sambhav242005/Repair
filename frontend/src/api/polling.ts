import { useEffect, useState, useCallback, useRef } from 'react';
import { Job, Alert } from '../types';
import { apiClient } from './client';

export interface PollJobOptions<T> {
  intervalMs?: number;
  maxWaitMs?: number;
  signal?: AbortSignal;
  onProgress?: (job: Job<T>) => void;
}

/**
 * Polls GET /jobs/{id} every 2 seconds until succeeded or failed.
 * Respects AbortSignal to cancel polling on component unmount.
 */
export async function pollJob<T = any>(
  jobId: string,
  options: PollJobOptions<T> = {}
): Promise<Job<T>> {
  const intervalMs = options.intervalMs ?? 2000;
  const maxWaitMs = options.maxWaitMs ?? 45000;
  const startTime = Date.now();

  while (true) {
    if (options.signal?.aborted) {
      throw new DOMException('Polling aborted due to component unmount', 'AbortError');
    }

    if (Date.now() - startTime > maxWaitMs) {
      throw {
        error: {
          code: 'TIMEOUT',
          message: `Job ${jobId} timed out after ${Math.round(maxWaitMs / 1000)}s without reaching terminal state.`,
        },
      };
    }

    const job = await apiClient.getJob<T>(jobId);
    if (options.onProgress) {
      options.onProgress(job);
    }

    if (job.status === 'succeeded') {
      return job;
    }
    if (job.status === 'failed') {
      throw {
        error: job.error || {
          code: 'PROVIDER_UNAVAILABLE',
          message: 'Job failed during execution.',
        },
      };
    }

    // Wait intervalMs before next poll
    await new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, intervalMs);
      if (options.signal) {
        options.signal.addEventListener(
          'abort',
          () => {
            clearTimeout(timer);
            reject(new DOMException('Polling aborted', 'AbortError'));
          },
          { once: true }
        );
      }
    });
  }
}

/**
 * Synthesizes a clean, pleasant notification chime using the Web Audio API.
 * Avoids broken external audio URLs and works reliably in modern browsers.
 */
export function playAlertChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880.0, ctx.currentTime + 0.15); // A5

    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  } catch (err) {
    console.warn('Could not play alert chime:', err);
  }
}

/**
 * Hook for polling alerts every 15 seconds.
 * Sound triggers once per new alert ID only if sound is user-enabled.
 */
export function useAlertsPolling(soundEnabled: boolean) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Keep track of alert IDs already chimed in this session to prevent repeat chime
  const playedAlertIdsRef = useRef<Set<string>>(new Set<string>());

  const fetchAlerts = useCallback(async () => {
    try {
      const list = await apiClient.getAlerts();
      setAlerts(list);
      setError(null);

      // Check for newly arrived unacknowledged alerts to chime
      if (soundEnabled) {
        for (const al of list) {
          if (!al.acknowledged_at && !playedAlertIdsRef.current.has(al.id)) {
            playedAlertIdsRef.current.add(al.id);
            playAlertChime();
            break; // Sound once per poll cycle
          }
        }
      }
    } catch (err: any) {
      setError(err?.error?.message || 'Failed to poll alerts');
    } finally {
      setLoading(false);
    }
  }, [soundEnabled]);

  useEffect(() => {
    fetchAlerts();
    // Poll every 15 seconds per 00_SRS.md
    const interval = setInterval(fetchAlerts, 15000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const acknowledge = async (id: string) => {
    try {
      const updated = await apiClient.acknowledgeAlert(id);
      setAlerts((prev) => prev.map((a) => (a.id === id ? updated : a)));
    } catch (err: any) {
      console.error('Failed to acknowledge alert:', err);
    }
  };

  return { alerts, loading, error, refetch: fetchAlerts, acknowledge };
}
