import { DesktopDebugEvent, DesktopSession } from '../../types';

export type DesktopActivityTone = 'complete' | 'pending' | 'error';

export interface DesktopActivityItem {
  event: string;
  at: string;
  title: string;
  description: string;
  tone: DesktopActivityTone;
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

const asText = (value: unknown): string | null => typeof value === 'string' && value.trim() ? value.trim() : null;

export function hasDesktopSessionError(session: Pick<DesktopSession, 'status' | 'error' | 'debug_events'>): boolean {
  return session.status === 'failed' || Boolean(session.error?.trim()) || session.debug_events.some((event) => event.event === 'error');
}

export function describeProposedAction(action: Record<string, unknown> | null | undefined): string {
  if (!action) return 'Review the selected step before allowing it to use the computer.';

  const operation = asText(action.operation);
  const expectedEffect = asText(action.expected_effect);
  const effectControl = expectedEffect?.match(/\bon\s+(.+?)\.?$/i)?.[1];
  const argument = asText(action.argument);

  if (operation === 'text') return argument ? `Enter ${argument} in Calculator.` : 'Enter the requested digits in Calculator.';
  if (operation === 'invoke') return effectControl ? `Press the ${effectControl} control.` : 'Press the selected app control.';
  if (operation === 'select') return effectControl ? `Select ${effectControl}.` : 'Select the chosen app item.';
  if (operation === 'scroll') return argument ? `Scroll ${argument} in the selected app.` : 'Scroll the selected app view.';
  if (operation === 'key') return argument === 'ENTER' ? 'Press Calculator’s equals control.' : argument === 'ESC' ? 'Clear the Calculator entry.' : 'Use the selected Calculator key.';
  return expectedEffect || 'Review the selected step before allowing it to use the computer.';
}

export function buildDesktopActivity(events: DesktopDebugEvent[], currentStatus?: DesktopSession['status']): DesktopActivityItem[] {
  const shownOnce = new Set<string>();
  return events.flatMap((event) => {
    const data = asRecord(event.data);
    const item = (title: string, description: string, tone: DesktopActivityTone = 'complete'): DesktopActivityItem[] => [{
      event: event.event,
      at: event.at,
      title,
      description,
      tone,
    }];

    switch (event.event) {
      case 'observation':
        if (shownOnce.has(event.event)) return [];
        shownOnce.add(event.event);
        return item('Checked the open app', 'Read the available controls in the selected window.');
      case 'workflow':
        if (shownOnce.has(event.event)) return [];
        shownOnce.add(event.event);
        return item('Planned the task', 'Turned your request into a short sequence of steps.');
      case 'plan':
      case 'clef_selection':
      case 'clef_request':
        // Keep model prompts, candidate payloads and repeated internal planning out of the teacher view.
        return [];
      case 'inspection':
        return item('Preview is ready', data.input_executed === false ? 'No computer input was sent; review the proposal above.' : 'The selected app was inspected.');
      case 'execution': {
        const action = asRecord(data.action);
        return item('Ran the approved step', describeProposedAction(action));
      }
      case 'verification':
        return item(data.effect_verified === true ? 'Checked the visible result' : 'Could not confirm the visible result',
          data.acceptance_matched === true ? 'The result matches your success check.' : data.effect_verified === true ? 'The screen changed, but the requested success check has not matched yet.' : 'The app did not show the expected change.',
          data.effect_verified === true ? 'complete' : 'error');
      case 'result': {
        const resultStatus = asText(data.status);
        const message = asText(data.message) || 'The computer workflow has finished.';
        if (resultStatus === 'succeeded') return [];
        if (resultStatus === 'needs_user') {
          return currentStatus === undefined || currentStatus === 'needs_approval' || currentStatus === 'needs_user'
            ? item('Waiting for your review', message, 'pending')
            : [];
        }
        if (resultStatus === 'stopped') return item('Task stopped', message, 'pending');
        if (resultStatus === 'failed') return item('Task could not be completed', message, 'error');
        return item('Workflow updated', message, 'pending');
      }
      case 'error':
        return item('Task needs attention', asText(data.message) || asText(data.error) || 'Review the technical details below.', 'error');
      default:
        // Low-level provider requests and other implementation events stay out of the teacher-facing summary.
        return [];
    }
  });
}
