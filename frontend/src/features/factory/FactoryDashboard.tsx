import React, { useState, useEffect } from 'react';
import {
  Asset,
  Maintenance,
  Lesson,
  Production,
  CreateMaintenanceInput,
  CreateLessonInput,
  CreateProductionInput,
} from '../../types';
import {
  Calendar,
  Wrench,
  GraduationCap,
  Boxes,
  Plus,
  CheckCircle,
  AlertTriangle,
  Clock,
  User,
  ShieldAlert,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import {
  formatKolkata,
  datetimeLocalToIso,
  getDefaultDatetimeLocal,
} from '../../utils/datetime';

interface FactoryDashboardProps {
  assets: Asset[];
  onError: (error: any) => void;
  onRefreshImpact: () => void;
}

type FactorySubTab = 'maintenance' | 'lessons' | 'production';

export const FactoryDashboard: React.FC<FactoryDashboardProps> = ({
  assets,
  onError,
  onRefreshImpact,
}) => {
  const [subTab, setSubTab] = useState<FactorySubTab>('maintenance');

  // Lists
  const [maintenanceList, setMaintenanceList] = useState<Maintenance[]>([]);
  const [lessonsList, setLessonsList] = useState<Lesson[]>([]);
  const [productionList, setProductionList] = useState<Production[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Form toggles
  const [showMaintModal, setShowMaintModal] = useState<boolean>(false);
  const [showLessonModal, setShowLessonModal] = useState<boolean>(false);
  const [showProdModal, setShowProdModal] = useState<boolean>(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [m, l, p] = await Promise.all([
        apiClient.getMaintenance(),
        apiClient.getLessons(),
        apiClient.getProduction(),
      ]);
      setMaintenanceList(m);
      setLessonsList(l);
      setProductionList(p);
    } catch (err: any) {
      onError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // Complete Actions
  const handleCompleteMaintenance = async (id: string) => {
    try {
      const res = await apiClient.completeMaintenance(id);
      await fetchAll();
      onRefreshImpact();
    } catch (err: any) {
      onError(err);
    }
  };

  const handleCompleteLesson = async (id: string) => {
    try {
      await apiClient.completeLesson(id);
      await fetchAll();
    } catch (err: any) {
      onError(err);
    }
  };

  const handleCompleteProduction = async (id: string) => {
    try {
      await apiClient.completeProduction(id);
      await fetchAll();
    } catch (err: any) {
      onError(err);
    }
  };

  const getAssetName = (assetId: string | null) => {
    if (!assetId) return 'All Equipment / Classroom';
    const found = assets.find((a) => a.id === assetId);
    return found ? `${found.name} (${found.category})` : assetId;
  };

  return (
    <div id="factory-dashboard-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Factory Sub-Navigation & Quick Action */}
      <div
        className="card"
        style={{
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            id="tab-btn-factory-maintenance"
            onClick={() => setSubTab('maintenance')}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              fontSize: '13px',
              background: subTab === 'maintenance' ? 'rgba(14, 165, 233, 0.2)' : 'transparent',
              color: subTab === 'maintenance' ? '#38bdf8' : 'var(--text-muted)',
              border: `1px solid ${subTab === 'maintenance' ? 'var(--brand-cyan)' : 'transparent'}`,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Wrench size={15} /> Maintenance ({maintenanceList.length})
          </button>

          <button
            id="tab-btn-factory-lessons"
            onClick={() => setSubTab('lessons')}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              fontSize: '13px',
              background: subTab === 'lessons' ? 'rgba(14, 165, 233, 0.2)' : 'transparent',
              color: subTab === 'lessons' ? '#38bdf8' : 'var(--text-muted)',
              border: `1px solid ${subTab === 'lessons' ? 'var(--brand-cyan)' : 'transparent'}`,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <GraduationCap size={15} /> Training Lessons ({lessonsList.length})
          </button>

          <button
            id="tab-btn-factory-production"
            onClick={() => setSubTab('production')}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              fontSize: '13px',
              background: subTab === 'production' ? 'rgba(14, 165, 233, 0.2)' : 'transparent',
              color: subTab === 'production' ? '#38bdf8' : 'var(--text-muted)',
              border: `1px solid ${subTab === 'production' ? 'var(--brand-cyan)' : 'transparent'}`,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Boxes size={15} /> Production Runs ({productionList.length})
          </button>
        </div>

        <div>
          {subTab === 'maintenance' && (
            <button
              id="btn-open-add-maintenance"
              onClick={() => setShowMaintModal(true)}
              className="btn-primary"
              style={{ fontSize: '13px', padding: '8px 16px' }}
            >
              <Plus size={15} /> Schedule Maintenance Task
            </button>
          )}

          {subTab === 'lessons' && (
            <button
              id="btn-open-add-lesson"
              onClick={() => setShowLessonModal(true)}
              className="btn-primary"
              style={{ fontSize: '13px', padding: '8px 16px' }}
            >
              <Plus size={15} /> Schedule Training Lesson
            </button>
          )}

          {subTab === 'production' && (
            <button
              id="btn-open-add-production"
              onClick={() => setShowProdModal(true)}
              className="btn-primary"
              style={{ fontSize: '13px', padding: '8px 16px' }}
            >
              <Plus size={15} /> Schedule Production Run
            </button>
          )}
        </div>
      </div>

      {/* SUB-TAB 1: Maintenance Schedule List */}
      {subTab === 'maintenance' && (
        <div id="factory-maintenance-list" className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-bright)' }}>
                Equipment Preventive Maintenance Schedule
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                FR-09: Completing recurring task writes history and calculates next due date = completed_at + interval_days.
              </p>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
              Asia/Kolkata (IST)
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {maintenanceList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-dim)' }}>
                No maintenance tasks scheduled. Click "+ Schedule Maintenance Task" above.
              </div>
            ) : (
              maintenanceList.map((m) => {
                const isCompleted = m.status === 'completed';
                return (
                  <div
                    key={m.id}
                    id={`maint-item-${m.id}`}
                    style={{
                      backgroundColor: isCompleted ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                      border: `1px solid ${isCompleted ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-subtle)'}`,
                      borderRadius: 'var(--radius-md)',
                      padding: '16px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <strong style={{ fontSize: '15px', color: 'var(--text-bright)' }}>{m.title}</strong>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: isCompleted ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                              color: isCompleted ? '#34d399' : '#fbbf24',
                            }}
                          >
                            {m.status}
                          </span>
                          {m.interval_days && (
                            <span style={{ fontSize: '11px', color: 'var(--brand-cyan)', fontFamily: 'var(--font-mono)' }}>
                              ↻ Every {m.interval_days} Days
                            </span>
                          )}
                        </div>

                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', lineHeight: 1.5 }}>
                          {m.description}
                        </p>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: 'var(--text-dim)', flexWrap: 'wrap' }}>
                          <span>
                            <strong>Asset:</strong> {getAssetName(m.asset_id)}
                          </span>
                          <span>
                            <strong>Assignee:</strong> {m.assignee}
                          </span>
                          <span>
                            <strong>Due:</strong> {formatKolkata(m.due_at)}
                          </span>
                          {m.starts_at && m.ends_at && (
                            <span>
                              <strong>Reserved Window:</strong> {formatKolkata(m.starts_at)} → {formatKolkata(m.ends_at)}
                            </span>
                          )}
                          {isCompleted && (
                            <span style={{ color: '#34d399' }}>
                              Completed at: {formatKolkata(m.completed_at)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        {!isCompleted ? (
                          <button
                            id={`btn-complete-maint-${m.id}`}
                            onClick={() => handleCompleteMaintenance(m.id)}
                            className="btn-secondary"
                            style={{ fontSize: '12px', padding: '6px 14px' }}
                          >
                            <CheckCircle size={14} color="#10b981" /> Complete Task
                          </button>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle size={14} /> Completed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: Training Lessons Schedule List */}
      {subTab === 'lessons' && (
        <div id="factory-lessons-list" className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-bright)' }}>
                Workforce Technical Training Lessons
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                FR-10: Training lessons reserve equipment only when <code>blocks_asset = true</code>.
              </p>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
              Asia/Kolkata (IST)
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {lessonsList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-dim)' }}>
                No training lessons scheduled. Click "+ Schedule Training Lesson" above.
              </div>
            ) : (
              lessonsList.map((l) => {
                const isCompleted = l.status === 'completed';
                return (
                  <div
                    key={l.id}
                    id={`lesson-item-${l.id}`}
                    style={{
                      backgroundColor: isCompleted ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                      border: `1px solid ${isCompleted ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-subtle)'}`,
                      borderRadius: 'var(--radius-md)',
                      padding: '16px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <strong style={{ fontSize: '15px', color: 'var(--text-bright)' }}>{l.title}</strong>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: isCompleted ? 'rgba(16, 185, 129, 0.2)' : 'rgba(139, 92, 246, 0.2)',
                              color: isCompleted ? '#34d399' : '#c084fc',
                            }}
                          >
                            {l.status}
                          </span>
                          {l.blocks_asset && (
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '4px',
                                background: 'rgba(244, 63, 94, 0.15)',
                                color: '#fb7185',
                                border: '1px solid rgba(244, 63, 94, 0.3)',
                              }}
                            >
                              Locks Equipment
                            </span>
                          )}
                        </div>

                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', lineHeight: 1.5 }}>
                          {l.instructions}
                        </p>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: 'var(--text-dim)', flexWrap: 'wrap' }}>
                          <span>
                            <strong>Target Asset:</strong> {getAssetName(l.asset_id)}
                          </span>
                          <span>
                            <strong>Trainee/Instructor:</strong> {l.assignee}
                          </span>
                          <span>
                            <strong>Window:</strong> {formatKolkata(l.starts_at)} → {formatKolkata(l.ends_at)}
                          </span>
                        </div>
                      </div>

                      <div>
                        {!isCompleted ? (
                          <button
                            id={`btn-complete-lesson-${l.id}`}
                            onClick={() => handleCompleteLesson(l.id)}
                            className="btn-secondary"
                            style={{ fontSize: '12px', padding: '6px 14px' }}
                          >
                            <CheckCircle size={14} color="#10b981" /> Complete Lesson
                          </button>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle size={14} /> Completed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: Production Schedule List */}
      {subTab === 'production' && (
        <div id="factory-production-list" className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-bright)' }}>
                Production Batches &amp; Machine Reservation
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                FR-11: Rejects overlaps with scheduled maintenance, production, or blocking training. Rejects non-operational equipment.
              </p>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
              Asia/Kolkata (IST)
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {productionList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-dim)' }}>
                No production jobs scheduled. Click "+ Schedule Production Run" above.
              </div>
            ) : (
              productionList.map((p) => {
                const isCompleted = p.status === 'completed';
                return (
                  <div
                    key={p.id}
                    id={`prod-item-${p.id}`}
                    style={{
                      backgroundColor: isCompleted ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                      border: `1px solid ${isCompleted ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-subtle)'}`,
                      borderRadius: 'var(--radius-md)',
                      padding: '16px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <strong style={{ fontSize: '15px', color: 'var(--text-bright)' }}>{p.title}</strong>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: isCompleted ? 'rgba(16, 185, 129, 0.2)' : 'rgba(14, 165, 233, 0.2)',
                              color: isCompleted ? '#34d399' : '#38bdf8',
                            }}
                          >
                            {p.status}
                          </span>
                          <span style={{ fontSize: '12px', color: '#fbbf24', fontWeight: 600 }}>
                            Target Output: {p.quantity} Units
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: 'var(--text-dim)', flexWrap: 'wrap', marginTop: '6px' }}>
                          <span>
                            <strong>Asset:</strong> {getAssetName(p.asset_id)}
                          </span>
                          <span>
                            <strong>Schedule Window:</strong> {formatKolkata(p.starts_at)} → {formatKolkata(p.ends_at)}
                          </span>
                        </div>
                      </div>

                      <div>
                        {!isCompleted ? (
                          <button
                            id={`btn-complete-prod-${p.id}`}
                            onClick={() => handleCompleteProduction(p.id)}
                            className="btn-secondary"
                            style={{ fontSize: '12px', padding: '6px 14px' }}
                          >
                            <CheckCircle size={14} color="#10b981" /> Complete Batch
                          </button>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle size={14} /> Completed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: Schedule Maintenance */}
      {showMaintModal && (
        <MaintenanceModal
          assets={assets}
          onClose={() => setShowMaintModal(false)}
          onSuccess={async (input) => {
            await apiClient.createMaintenance(input);
            setShowMaintModal(false);
            await fetchAll();
          }}
          onError={onError}
        />
      )}

      {/* MODAL 2: Schedule Lesson */}
      {showLessonModal && (
        <LessonModal
          assets={assets}
          onClose={() => setShowLessonModal(false)}
          onSuccess={async (input) => {
            await apiClient.createLesson(input);
            setShowLessonModal(false);
            await fetchAll();
          }}
          onError={onError}
        />
      )}

      {/* MODAL 3: Schedule Production */}
      {showProdModal && (
        <ProductionModal
          assets={assets}
          onClose={() => setShowProdModal(false)}
          onSuccess={async (input) => {
            await apiClient.createProduction(input);
            setShowProdModal(false);
            await fetchAll();
          }}
          onError={onError}
        />
      )}
    </div>
  );
};

// --- Maintenance Form Modal ---
const MaintenanceModal: React.FC<{
  assets: Asset[];
  onClose: () => void;
  onSuccess: (data: CreateMaintenanceInput) => Promise<void>;
  onError: (error: any) => void;
}> = ({ assets, onClose, onSuccess, onError }) => {
  const [assetId, setAssetId] = useState(assets[0]?.id || '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignee, setAssignee] = useState('');
  const [intervalDays, setIntervalDays] = useState('30');
  const [dueAt, setDueAt] = useState(getDefaultDatetimeLocal(24));
  const [hasWindow, setHasWindow] = useState(false);
  const [startsAt, setStartsAt] = useState(getDefaultDatetimeLocal(2));
  const [endsAt, setEndsAt] = useState(getDefaultDatetimeLocal(4));
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSuccess({
        asset_id: assetId,
        title: title.trim(),
        description: description.trim(),
        assignee: assignee.trim(),
        interval_days: intervalDays ? parseInt(intervalDays, 10) : null,
        due_at: datetimeLocalToIso(dueAt),
        starts_at: hasWindow ? datetimeLocalToIso(startsAt) : null,
        ends_at: hasWindow ? datetimeLocalToIso(endsAt) : null,
      });
    } catch (err: any) {
      onError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div className="card" style={{ width: '100%', maxWidth: '520px', padding: '24px' }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '14px' }}>
          Schedule Maintenance Task
        </h3>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              Target Asset *
            </label>
            <select id="input-maint-asset" value={assetId} onChange={(e) => setAssetId(e.target.value)} required>
              {assets.map((a) => (
                <option key={a.id} value={a.id} style={{ background: '#0b101c' }}>
                  {a.name} ({a.category})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              Task Title *
            </label>
            <input
              id="input-maint-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Spindle Lubrication Reservoir Flush"
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              Description &amp; Procedure *
            </label>
            <textarea
              id="input-maint-desc"
              rows={2}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Step-by-step filter change, fluid replacement, safety interlock checks..."
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                Assignee *
              </label>
              <input
                id="input-maint-assignee"
                type="text"
                required
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                placeholder="Ravi Kumar"
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                Recurrence Interval (Days)
              </label>
              <input
                id="input-maint-interval"
                type="number"
                min="1"
                value={intervalDays}
                onChange={(e) => setIntervalDays(e.target.value)}
                placeholder="e.g. 30"
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              Due Timestamp (Asia/Kolkata) *
            </label>
            <input
              id="input-maint-due"
              type="datetime-local"
              required
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={hasWindow}
                onChange={(e) => setHasWindow(e.target.checked)}
                style={{ width: 'auto' }}
              />
              Reserve machine window (Required for calendar collision checks)
            </label>
          </div>

          {hasWindow && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Starts At *
                </label>
                <input
                  id="input-maint-start"
                  type="datetime-local"
                  required
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Ends At *
                </label>
                <input
                  id="input-maint-end"
                  type="datetime-local"
                  required
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button id="btn-submit-maintenance" type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Scheduling...' : 'Confirm Maintenance'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- Lesson Form Modal ---
const LessonModal: React.FC<{
  assets: Asset[];
  onClose: () => void;
  onSuccess: (data: CreateLessonInput) => Promise<void>;
  onError: (error: any) => void;
}> = ({ assets, onClose, onSuccess, onError }) => {
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [assignee, setAssignee] = useState('');
  const [assetId, setAssetId] = useState('');
  const [blocksAsset, setBlocksAsset] = useState(false);
  const [startsAt, setStartsAt] = useState(getDefaultDatetimeLocal(3));
  const [endsAt, setEndsAt] = useState(getDefaultDatetimeLocal(5));
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (blocksAsset && !assetId) {
      onError({ error: { code: 'VALIDATION_ERROR', message: 'A blocking lesson requires an assigned asset (FR-11 rule).' } });
      return;
    }

    setSubmitting(true);
    try {
      await onSuccess({
        title: title.trim(),
        instructions: instructions.trim(),
        assignee: assignee.trim(),
        asset_id: assetId || null,
        blocks_asset: blocksAsset,
        starts_at: datetimeLocalToIso(startsAt),
        ends_at: datetimeLocalToIso(endsAt),
      });
    } catch (err: any) {
      onError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div className="card" style={{ width: '100%', maxWidth: '520px', padding: '24px' }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '14px' }}>
          Schedule Training Lesson
        </h3>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              Lesson Title *
            </label>
            <input
              id="input-lesson-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. CNC Work Coordinate & Tool Offset Calibration"
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              Training Instructions / Syllabus *
            </label>
            <textarea
              id="input-lesson-instructions"
              rows={2}
              required
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Hands-on touch probe setup, emergency stop verification, coolant flow test..."
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              Trainee / Instructor *
            </label>
            <input
              id="input-lesson-assignee"
              type="text"
              required
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              placeholder="Aarav Sharma (Apprentice)"
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              Associated Equipment (Optional)
            </label>
            <select id="input-lesson-asset" value={assetId} onChange={(e) => setAssetId(e.target.value)}>
              <option value="" style={{ background: '#0b101c' }}>-- None (Classroom Lecture) --</option>
              {assets.map((a) => (
                <option key={a.id} value={a.id} style={{ background: '#0b101c' }}>
                  {a.name} ({a.category})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={blocksAsset}
                onChange={(e) => setBlocksAsset(e.target.checked)}
                style={{ width: 'auto' }}
              />
              Blocks Equipment (<code>blocks_asset=true</code> — rejects production overlaps)
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                Starts At (Asia/Kolkata) *
              </label>
              <input
                id="input-lesson-start"
                type="datetime-local"
                required
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                Ends At (Asia/Kolkata) *
              </label>
              <input
                id="input-lesson-end"
                type="datetime-local"
                required
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button id="btn-submit-lesson" type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Scheduling...' : 'Confirm Lesson'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- Production Form Modal ---
const ProductionModal: React.FC<{
  assets: Asset[];
  onClose: () => void;
  onSuccess: (data: CreateProductionInput) => Promise<void>;
  onError: (error: any) => void;
}> = ({ assets, onClose, onSuccess, onError }) => {
  const [assetId, setAssetId] = useState(assets[0]?.id || '');
  const [title, setTitle] = useState('');
  const [quantity, setQuantity] = useState('50');
  const [startsAt, setStartsAt] = useState(getDefaultDatetimeLocal(1));
  const [endsAt, setEndsAt] = useState(getDefaultDatetimeLocal(3));
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSuccess({
        asset_id: assetId,
        title: title.trim(),
        quantity: parseInt(quantity, 10),
        starts_at: datetimeLocalToIso(startsAt),
        ends_at: datetimeLocalToIso(endsAt),
      });
    } catch (err: any) {
      onError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div className="card" style={{ width: '100%', maxWidth: '520px', padding: '24px' }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '14px' }}>
          Schedule Production Run
        </h3>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              Target Machine *
            </label>
            <select id="input-prod-asset" value={assetId} onChange={(e) => setAssetId(e.target.value)} required>
              {assets.map((a) => (
                <option key={a.id} value={a.id} style={{ background: '#0b101c' }}>
                  {a.name} ({a.category}) — [{a.status}]
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              Production Batch Title *
            </label>
            <input
              id="input-prod-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Aerospace Titanium Flange Batch #304"
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              Target Quantity (Units) *
            </label>
            <input
              id="input-prod-quantity"
              type="number"
              min="1"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g. 100"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                Starts At (Asia/Kolkata) *
              </label>
              <input
                id="input-prod-start"
                type="datetime-local"
                required
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                Ends At (Asia/Kolkata) *
              </label>
              <input
                id="input-prod-end"
                type="datetime-local"
                required
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button id="btn-submit-production" type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Checking Conflicts...' : 'Schedule Production'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
