import React, { useState } from 'react';
import { Asset, AssetStatus, CreateAssetInput, UpdateAssetInput } from '../../types';
import { Plus, Edit2, Laptop, Settings, ShieldAlert, Cpu } from 'lucide-react';

interface AssetListProps {
  assets: Asset[];
  selectedAssetId?: string;
  onSelectAsset: (asset: Asset) => void;
  onCreateAsset: (input: CreateAssetInput) => Promise<void>;
  onUpdateAsset: (id: string, input: UpdateAssetInput) => Promise<void>;
}

export const AssetList: React.FC<AssetListProps> = ({
  assets,
  selectedAssetId,
  onSelectAsset,
  onCreateAsset,
  onUpdateAsset,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

  const getCategoryIcon = (category: Asset['category']) => {
    switch (category) {
      case 'computer':
        return <Laptop size={18} color="#38bdf8" />;
      case 'factory_machine':
        return <Settings size={18} color="#f59e0b" />;
      default:
        return <Cpu size={18} color="#a855f7" />;
    }
  };

  const getStatusBadge = (status: AssetStatus) => {
    switch (status) {
      case 'operational':
        return <span className="badge badge-operational">● Operational</span>;
      case 'maintenance':
        return <span className="badge badge-maintenance">▲ In Maintenance</span>;
      case 'faulty':
        return <span className="badge badge-faulty">✖ Faulty</span>;
      case 'retired':
        return <span className="badge badge-retired">○ Retired</span>;
    }
  };

  return (
    <div className="card" id="asset-list-panel" style={{ padding: '20px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-bright)' }}>
            Tracked Equipment &amp; Assets
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {assets.length} active registered machines &amp; workstations
          </p>
        </div>
        <button
          id="btn-add-asset"
          onClick={() => {
            setEditingAsset(null);
            setIsModalOpen(true);
          }}
          className="btn-secondary"
          style={{ fontSize: '12px', padding: '6px 12px' }}
        >
          <Plus size={14} /> Add Asset
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {assets.map((asset) => {
          const isSelected = asset.id === selectedAssetId;
          return (
            <div
              key={asset.id}
              id={`asset-item-${asset.id}`}
              onClick={() => onSelectAsset(asset)}
              style={{
                backgroundColor: isSelected ? 'rgba(14, 165, 233, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                border: `1px solid ${isSelected ? 'var(--brand-cyan)' : 'var(--border-subtle)'}`,
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {getCategoryIcon(asset.category)}
                  </div>
                  <div>
                    <strong style={{ fontSize: '14px', color: 'var(--text-bright)' }}>
                      {asset.name}
                    </strong>
                    <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px' }}>
                      {asset.manufacturer || 'Unknown Mfr'} • {asset.model || 'Standard Unit'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {getStatusBadge(asset.status)}
                  <button
                    id={`btn-edit-asset-${asset.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingAsset(asset);
                      setIsModalOpen(true);
                    }}
                    style={{
                      padding: '4px',
                      color: 'var(--text-dim)',
                      borderRadius: '4px',
                    }}
                    title="Edit asset status or details"
                  >
                    <Edit2 size={14} />
                  </button>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: '10px',
                  paddingTop: '8px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.04)',
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                }}
              >
                <span>ID: <code style={{ fontFamily: 'var(--font-mono)' }}>{asset.id}</code></span>
                <span>
                  Physical Mass:{' '}
                  <strong style={{ color: asset.mass_kg ? '#cbd5e1' : '#f59e0b' }}>
                    {asset.mass_kg ? `${asset.mass_kg} kg` : 'Unspecified'}
                  </strong>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <AssetModal
          initialAsset={editingAsset}
          onClose={() => {
            setIsModalOpen(false);
            setEditingAsset(null);
          }}
          onSave={async (data) => {
            if (editingAsset) {
              await onUpdateAsset(editingAsset.id, data);
            } else {
              await onCreateAsset(data as CreateAssetInput);
            }
            setIsModalOpen(false);
            setEditingAsset(null);
          }}
        />
      )}
    </div>
  );
};

interface AssetModalProps {
  initialAsset: Asset | null;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}

export const AssetModal: React.FC<AssetModalProps> = ({ initialAsset, onClose, onSave }) => {
  const [name, setName] = useState(initialAsset?.name || '');
  const [category, setCategory] = useState<Asset['category']>(initialAsset?.category || 'computer');
  const [manufacturer, setManufacturer] = useState(initialAsset?.manufacturer || '');
  const [model, setModel] = useState(initialAsset?.model || '');
  const [status, setStatus] = useState<AssetStatus>(initialAsset?.status || 'operational');
  const [massKg, setMassKg] = useState<string>(initialAsset?.mass_kg?.toString() || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Asset name is required');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSave({
        name: name.trim(),
        category,
        manufacturer: manufacturer.trim() || null,
        model: model.trim() || null,
        status,
        mass_kg: massKg ? parseFloat(massKg) : null,
      });
    } catch (err: any) {
      setError(err?.error?.message || 'Failed to save asset');
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
      <div
        className="card"
        style={{ width: '100%', maxWidth: '460px', padding: '24px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>
          {initialAsset ? 'Edit Equipment / Asset' : 'Register New Asset'}
        </h3>

        {error && (
          <div style={{ color: '#fb7185', fontSize: '13px', marginBottom: '12px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              Asset Name *
            </label>
            <input
              id="input-asset-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. ThinkPad Diagnostic Station"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                Category *
              </label>
              <select
                id="select-asset-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
              >
                <option value="computer">Computer</option>
                <option value="factory_machine">Factory Machine</option>
                <option value="appliance">Appliance</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                Status *
              </label>
              <select
                id="select-asset-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
              >
                <option value="operational">Operational</option>
                <option value="maintenance">Maintenance</option>
                <option value="faulty">Faulty</option>
                <option value="retired">Retired</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                Manufacturer
              </label>
              <input
                id="input-asset-manufacturer"
                type="text"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                placeholder="e.g. Lenovo, Haas"
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                Model
              </label>
              <input
                id="input-asset-model"
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. T480, VF-2"
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              Mass (kg) — for retained mass calculation
            </label>
            <input
              id="input-asset-mass"
              type="number"
              step="0.01"
              value={massKg}
              onChange={(e) => setMassKg(e.target.value)}
              placeholder="e.g. 1.65 or 3500"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button
              id="btn-save-asset"
              type="submit"
              disabled={submitting}
              className="btn-primary"
            >
              {submitting ? 'Saving...' : 'Save Asset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
