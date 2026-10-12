import React, { useState } from 'react';
import { Asset, AssetStatus, CreateAssetInput, UpdateAssetInput } from '../../types';
import { Plus, Edit2, Laptop, Settings, Cpu } from 'lucide-react';

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
        return <Laptop size={18} color="#0071ce" />;
      case 'factory_machine':
        return <Settings size={18} color="#f59e0b" />;
      default:
        return <Cpu size={18} color="#8b5cf6" />;
    }
  };

  const getStatusBadge = (status: AssetStatus) => {
    switch (status) {
      case 'operational':
        return <span className="badge badge-operational">Operational</span>;
      case 'maintenance':
        return <span className="badge badge-maintenance">In Maintenance</span>;
      case 'faulty':
        return <span className="badge badge-faulty">Faulty</span>;
      case 'retired':
        return <span className="badge badge-retired">Retired</span>;
    }
  };

  return (
    <div
      className="card"
      id="asset-list-panel"
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          borderBottom: '1px solid #f1f5f9',
          paddingBottom: '12px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
            Equipment & Device Fleet
          </h2>
          <p style={{ fontSize: '12px', color: '#64748b' }}>
            {assets.length} registered workstations & machines
          </p>
        </div>
        <button
          id="btn-add-asset"
          onClick={() => {
            setEditingAsset(null);
            setIsModalOpen(true);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            fontWeight: 700,
            color: '#0071ce',
            backgroundColor: '#ebf5ff',
            border: '1px solid #b9e1ff',
            padding: '6px 12px',
            borderRadius: '6px',
          }}
        >
          <Plus size={14} /> Add Device
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {assets.map((asset) => {
          const isSelected = asset.id === selectedAssetId;
          return (
            <div
              key={asset.id}
              id={`asset-item-${asset.id}`}
              onClick={() => onSelectAsset(asset)}
              style={{
                backgroundColor: isSelected ? '#ebf5ff' : '#ffffff',
                border: `1.5px solid ${isSelected ? '#0071ce' : '#e2e8f0'}`,
                borderRadius: '8px',
                padding: '12px 14px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '8px',
                      backgroundColor: isSelected ? '#ffffff' : '#f1f5f9',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {getCategoryIcon(asset.category)}
                  </div>
                  <div>
                    <strong style={{ fontSize: '14px', color: isSelected ? '#0071ce' : '#0f172a' }}>
                      {asset.name}
                    </strong>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                      {asset.manufacturer || 'Standard'} • {asset.model || 'OEM'}
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
                      color: '#64748b',
                      borderRadius: '4px',
                    }}
                    title="Edit asset status or details"
                  >
                    <Edit2 size={14} />
                  </button>
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <AssetModal
          initialAsset={editingAsset}
          onClose={() => setIsModalOpen(false)}
          onSave={async (data) => {
            if (editingAsset) {
              await onUpdateAsset(editingAsset.id, data);
            } else {
              await onCreateAsset(data as CreateAssetInput);
            }
            setIsModalOpen(false);
          }}
        />
      )}
    </div>
  );
};

interface AssetModalProps {
  initialAsset: Asset | null;
  onClose: () => void;
  onSave: (data: CreateAssetInput | UpdateAssetInput) => Promise<void>;
}

const AssetModal: React.FC<AssetModalProps> = ({ initialAsset, onClose, onSave }) => {
  const [name, setName] = useState(initialAsset?.name || '');
  const [category, setCategory] = useState<Asset['category']>(initialAsset?.category || 'computer');
  const [manufacturer, setManufacturer] = useState(initialAsset?.manufacturer || '');
  const [model, setModel] = useState(initialAsset?.model || '');
  const [status, setStatus] = useState<AssetStatus>(initialAsset?.status || 'operational');
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
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        backdropFilter: 'blur(3px)',
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
        style={{ width: '100%', maxWidth: '460px', padding: '28px', backgroundColor: '#ffffff', borderRadius: '12px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginBottom: '16px' }}>
          {initialAsset ? 'Edit Equipment Profile' : 'Register New Equipment'}
        </h3>

        {error && (
          <div style={{ color: '#b91c1c', backgroundColor: '#fef2f2', padding: '10px', borderRadius: '6px', fontSize: '13px', marginBottom: '14px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
              Equipment Name *
            </label>
            <input
              id="input-asset-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. ThinkPad T480 Workstation"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
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
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                Operating Status *
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
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                Manufacturer
              </label>
              <input
                id="input-asset-mfr"
                type="text"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                placeholder="e.g. Lenovo / Haas"
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                Model
              </label>
              <input
                id="input-asset-model"
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. T480 / VF-2SS"
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" id="btn-save-asset" className="btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Equipment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
