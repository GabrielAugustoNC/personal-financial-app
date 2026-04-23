import { useState } from 'react';
import { useCategories } from '@/hooks/useCategories';
import { categoryService } from '@/services/categoryService';
import type { CategoryType } from '@/types/category';
import { Plus, Trash2, Tag, Check, X } from 'lucide-react';

// SettingsPage — sem dependência de variáveis SCSS externas.
// Usa CSS custom properties (var(--...)) diretamente para garantir
// que funciona independente da configuração do vite.config.ts.

function NewCategoryForm({ type, onCreated }: { type: CategoryType; onCreated: () => void }) {
  const [name, setName]     = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [open, setOpen]     = useState(false);

  async function handleSave() {
    if (name.trim().length < 2) { setError('Mínimo de 2 caracteres.'); return; }
    setSaving(true); setError(null);
    try {
      await categoryService.create({ name: name.trim(), type });
      setName(''); setOpen(false); onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar');
    } finally { setSaving(false); }
  }

  if (!open) return (
    <button onClick={() => setOpen(true)} style={{
      display: 'flex', alignItems: 'center', gap: 6,
      width: '100%', padding: '12px 16px',
      background: 'rgba(255,255,255,0.03)',
      border: '1.5px dashed var(--color-border-medium)',
      borderRadius: 10, color: 'var(--color-text-muted)',
      fontSize: '0.82rem', cursor: 'pointer', justifyContent: 'center',
    }}>
      <Plus size={14} /> Nova categoria
    </button>
  );

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 8,
      padding: '12px 16px', borderRadius: 10,
      border: '1.5px dashed var(--color-border-active)',
      background: 'var(--color-accent-dim)',
    }}>
      <input
        type="text"
        placeholder="Nome da categoria..."
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setOpen(false); }}
        autoFocus maxLength={60}
        style={{
          width: '100%', padding: '10px 14px',
          background: 'var(--color-bg-input)',
          border: '1px solid var(--color-border-medium)',
          borderRadius: 8, color: 'var(--color-text-primary)',
          fontSize: '0.875rem', outline: 'none',
        }}
      />
      {error && <p style={{ fontSize: '0.75rem', color: 'var(--color-expense)', margin: 0 }}>{error}</p>}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={() => { setOpen(false); setName(''); setError(null); }}
          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px',
            background: 'rgba(255,255,255,0.04)', border: '1px solid var(--color-border)',
            borderRadius: 8, color: 'var(--color-text-muted)', fontSize: '0.78rem', cursor: 'pointer' }}>
          <X size={13} /> Cancelar
        </button>
        <button onClick={handleSave} disabled={saving}
          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px',
            background: 'var(--color-accent)', border: 'none',
            borderRadius: 8, color: '#fff', fontSize: '0.78rem', cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.6 : 1 }}>
          <Check size={13} /> {saving ? 'Salvando...' : 'Criar'}
        </button>
      </div>
    </div>
  );
}

export function SettingsPage() {
  const { categories, isLoading, refetch } = useCategories();
  const [activeTab, setActiveTab] = useState<CategoryType>('expense');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const displayed = categories.filter(c => c.type === activeTab);

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Remover a categoria "${name}"? As transações existentes não serão alteradas.`)) return;
    setDeletingId(id);
    try { await categoryService.delete(id); await refetch(); }
    finally { setDeletingId(null); }
  }

  const tabBase: React.CSSProperties = {
    flex: 1, padding: '8px', borderRadius: 6,
    fontSize: '0.82rem', fontWeight: 500, cursor: 'pointer', border: 'none',
    transition: 'all 0.15s ease', textAlign: 'center',
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', flex: 1,
      gap: 24, padding: 32, width: '100%',
      color: 'var(--color-text-primary)',
    }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.02em',
          color: 'var(--color-text-primary)', margin: 0 }}>
          Configurações
        </h1>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
          Gerencie as categorias do sistema
        </p>
      </div>

      {/* Card de categorias */}
      <div style={{
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 14, padding: '24px',
        display: 'flex', flexDirection: 'column', gap: 16,
        maxWidth: 800,
      }}>
        {/* Card header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Tag size={16} style={{ color: 'var(--color-accent-light)' }} />
          <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0,
            color: 'var(--color-text-primary)' }}>
            Categorias
          </h2>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid var(--color-border-medium)',
          borderRadius: 10, padding: 3,
        }}>
          {(['expense', 'income'] as CategoryType[]).map(t => (
            <button key={t} onClick={() => setActiveTab(t)} style={{
              ...tabBase,
              background: activeTab === t ? 'var(--color-accent-dim)' : 'transparent',
              color: activeTab === t ? 'var(--color-accent-light)' : 'var(--color-text-muted)',
              border: activeTab === t ? '1px solid rgba(124,106,247,0.25)' : '1px solid transparent',
            }}>
              {t === 'expense' ? 'Despesas' : 'Receitas'}
            </button>
          ))}
        </div>

        {/* Lista */}
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 48, borderRadius: 10,
                animationDelay: `${i * 0.06}s` }} />
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {displayed.length === 0 && (
              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)',
                textAlign: 'center', padding: '24px 0', margin: 0 }}>
                Nenhuma categoria de {activeTab === 'expense' ? 'despesa' : 'receita'} encontrada.
              </p>
            )}
            {displayed.map(cat => (
              <div key={cat.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px', borderRadius: 10,
                border: '1px solid var(--color-border)',
                background: 'rgba(255,255,255,0.02)',
              }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border-medium)';
                  const btn = (e.currentTarget as HTMLElement).querySelector('button') as HTMLElement;
                  if (btn) btn.style.opacity = '1';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)';
                  const btn = (e.currentTarget as HTMLElement).querySelector('button') as HTMLElement;
                  if (btn) btn.style.opacity = '0';
                }}
              >
                <span style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: activeTab === 'expense'
                    ? 'var(--color-expense)' : 'var(--color-income)',
                }} />
                <span style={{ flex: 1, fontSize: '0.875rem', fontWeight: 500,
                  color: 'var(--color-text-primary)' }}>
                  {cat.name}
                </span>
                <button
                  onClick={() => handleDelete(cat.id, cat.name)}
                  disabled={deletingId === cat.id}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 26, height: 26, borderRadius: 6,
                    color: 'var(--color-text-muted)', border: 'none',
                    background: 'transparent', cursor: 'pointer',
                    opacity: 0, transition: 'all 0.15s ease',
                    fontSize: '0.75rem',
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.background = 'var(--color-expense-bg)';
                    el.style.color = 'var(--color-expense)';
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.background = 'transparent';
                    el.style.color = 'var(--color-text-muted)';
                  }}
                >
                  {deletingId === cat.id ? '...' : <Trash2 size={13} />}
                </button>
              </div>
            ))}
          </div>
        )}

        <NewCategoryForm type={activeTab} onCreated={refetch} />

        <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.5 }}>
          ⚠️ Remover uma categoria não altera as transações já classificadas com ela.
        </p>
      </div>
    </div>
  );
}
