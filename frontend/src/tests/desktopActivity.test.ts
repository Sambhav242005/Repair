import { describe, expect, it } from 'vitest';
import { DesktopDebugEvent } from '../types';
import { buildDesktopActivity, describeProposedAction, hasDesktopSessionError } from '../features/computer-assistance/desktopActivity';

describe('desktop workflow teacher summary', () => {
  it('keeps technical diagnostics hidden after a successful session', () => {
    expect(hasDesktopSessionError({ status: 'completed', error: null, debug_events: [] })).toBe(false);
  });

  it('makes diagnostics available for a failed session or an error event', () => {
    expect(hasDesktopSessionError({ status: 'failed', error: 'The selected app closed.', debug_events: [] })).toBe(true);
    expect(hasDesktopSessionError({
      status: 'completed',
      error: null,
      debug_events: [{ at: '2026-10-12T12:00:00Z', event: 'error', data: { message: 'Could not verify the result.' } }],
    })).toBe(true);
  });

  it('summarizes task events in plain language and skips provider request payloads', () => {
    const events: DesktopDebugEvent[] = [
      { at: '2026-10-12T12:00:00Z', event: 'observation' },
      { at: '2026-10-12T12:00:01Z', event: 'clef_request', data: { state: { controls: ['private low-level payload'] } } },
      { at: '2026-10-12T12:00:02Z', event: 'execution', data: { action: { operation: 'invoke', expected_effect: 'Visible state changes after invoke on Seven.' } } },
      { at: '2026-10-12T12:00:03Z', event: 'verification', data: { effect_verified: true, acceptance_matched: true } },
    ];
    const activity = buildDesktopActivity(events);

    expect(activity.map((item) => item.title)).toEqual(['Checked the open app', 'Ran the approved step', 'Checked the visible result']);
    expect(activity[1].description).toBe('Press the Seven control.');
    expect(activity[2].description).toBe('The result matches your success check.');
  });

  it('describes digit entry without exposing the raw action object', () => {
    expect(describeProposedAction({ operation: 'text', argument: '7', control_id: 'snapshot:control' })).toBe('Enter 7 in Calculator.');
  });

  it('does not leave an old approval wait in the summary after the task has completed', () => {
    const events: DesktopDebugEvent[] = [
      { at: '2026-10-12T12:00:00Z', event: 'result', data: { status: 'needs_user', message: 'Review the proposal.' } },
      { at: '2026-10-12T12:00:01Z', event: 'execution', data: { action: { operation: 'invoke', expected_effect: 'Visible state changes after invoke on Seven.' } } },
    ];
    expect(buildDesktopActivity(events, 'completed').map((item) => item.title)).toEqual(['Ran the approved step']);
    expect(buildDesktopActivity(events, 'needs_approval')[0].title).toBe('Waiting for your review');
  });
});
