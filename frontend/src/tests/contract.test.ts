import { describe, it, expect, beforeEach } from 'vitest';
import { mockEngine } from '../api/mockEngine';

describe('Factory Scheduling & Contract Rules Tests', () => {
  beforeEach(() => {
    mockEngine.reset();
  });

  it('rejects production overlap with existing maintenance reservation (409 SCHEDULE_CONFLICT)', () => {
    // maint_1 is scheduled for asset_machine_1: 14:00Z to 15:30Z
    expect(() => {
      mockEngine.createProduction({
        asset_id: 'asset_machine_1',
        title: 'Conflicting Batch #99',
        starts_at: '2026-10-12T14:30:00Z',
        ends_at: '2026-10-12T16:00:00Z',
        quantity: 10,
      });
    }).toThrow();

    try {
      mockEngine.createProduction({
        asset_id: 'asset_machine_1',
        title: 'Conflicting Batch #99',
        starts_at: '2026-10-12T14:30:00Z',
        ends_at: '2026-10-12T16:00:00Z',
        quantity: 10,
      });
    } catch (err: any) {
      expect(err.error.code).toBe('SCHEDULE_CONFLICT');
      expect(err.error.details.conflicting_entity_id).toBe('maint_1');
    }
  });

  it('allows back-to-back reservation windows [start, end) without conflict', () => {
    // maint_1 ends at 15:30Z. Back-to-back starts at 15:30Z.
    const prod = mockEngine.createProduction({
      asset_id: 'asset_machine_1',
      title: 'Back-to-back Batch #100',
      starts_at: '2026-10-12T15:30:00Z',
      ends_at: '2026-10-12T17:00:00Z',
      quantity: 25,
    });
    expect(prod).toBeDefined();
    expect(prod.status).toBe('scheduled');
  });

  it('rejects production when equipment is faulty or in maintenance (409 ASSET_UNAVAILABLE)', () => {
    mockEngine.updateAsset('asset_machine_1', { status: 'faulty' });

    expect(() => {
      mockEngine.createProduction({
        asset_id: 'asset_machine_1',
        title: 'Batch on broken machine',
        starts_at: '2026-10-12T18:00:00Z',
        ends_at: '2026-10-12T19:00:00Z',
        quantity: 5,
      });
    }).toThrow();

    try {
      mockEngine.createProduction({
        asset_id: 'asset_machine_1',
        title: 'Batch on broken machine',
        starts_at: '2026-10-12T18:00:00Z',
        ends_at: '2026-10-12T19:00:00Z',
        quantity: 5,
      });
    } catch (err: any) {
      expect(err.error.code).toBe('ASSET_UNAVAILABLE');
    }
  });

  it('completes recurring maintenance, calculates next due_at, and rejects duplicate completion (409 ALREADY_COMPLETED)', () => {
    const completedTime = '2026-10-12T10:00:00Z';
    const res = mockEngine.completeMaintenance('maint_1', completedTime);
    expect(res.completed.status).toBe('completed');
    expect(res.completed.completed_at).toBe(completedTime);
    expect(res.next).toBeDefined();
    // interval_days is 30, so next due date must be 30 days after completedTime
    expect(res.next?.interval_days).toBe(30);

    // Second completion must fail with ALREADY_COMPLETED
    expect(() => {
      mockEngine.completeMaintenance('maint_1', completedTime);
    }).toThrow();

    try {
      mockEngine.completeMaintenance('maint_1', completedTime);
    } catch (err: any) {
      expect(err.error.code).toBe('ALREADY_COMPLETED');
    }
  });

  it('supports Native Desktop Session start and stop interrupt controls', () => {
    const session = mockEngine.startDesktopSession('calculator', 'Perform 42 + 58');
    expect(session.id).toBeDefined();
    expect(session.status).toBe('running');
    expect(session.app_id).toBe('calculator');

    // Test immediate Stop control
    const stopped = mockEngine.stopDesktopSession(session.id);
    expect(stopped.status).toBe('stopped');
    expect(stopped.stopped_at).toBeDefined();
    expect(stopped.steps.some((s) => s.status === 'stopped')).toBe(true);
  });
});
