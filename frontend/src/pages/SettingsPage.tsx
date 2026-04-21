// ============================================================
// SettingsPage — tela de configurações com gerenciamento de categorias.
// Permite criar, visualizar e excluir categorias de receitas e despesas.
// O backend já possui os endpoints — esta tela conecta a UI a eles.
// ============================================================

import { useState } from 'react';
import { useCategories } from '@/hooks/useCategories';
import { categoryService } from '@/services/categoryService';
import type { CategoryType } from '@/types/category';
import styles from './SettingsPage.module.scss';
import { Plus, Trash2, Tag, Check, X } from 'lucide-react';

type ActiveTab = 'expense' | 'income';

// Formulário inline para criação de nova categoria
function NewCategoryForm({
  type,
  onCreated,
}: {
  type     : CategoryType;
  onCreated: () => void;
}) {
  const [name, setName]     = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError]   = useState<string | null>(null);
  const [open, setOpen]     = useState<boolean>(false);

  async function handleSave(): Promise<void> {
    if (name.trim().length < 2) { setError('Mínimo de 2 caracteres.'); return; }
    setSaving(true);
    setError(null);
    try {
      await categoryService.create({ name: name.trim(), type });
      setName('');
      setOpen(false);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar');
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button className={styles.addBtn} onClick={() => setOpen(true)}>
        <Plus size={14} /> Nova categoria
      </button>
    );
  }

  return (
    <div className={styles.newForm}>
      <input
        type="text"
        className={styles.newInput}
        placeholder="Nome da categoria..."
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setOpen(false); }}
        autoFocus
        maxLength={60}
      />
      {error && <p className={styles.formError}>{error}</p>}
      <div className={styles.formBtns}>
        <button className={styles.cancelSmall} onClick={() => { setOpen(false); setName(''); setError(null); }}>
          <X size={13} /> Cancelar
        </button>
        <button className={styles.saveSmall} onClick={handleSave} disabled={saving}>
          <Check size={13} /> {saving ? 'Salvando...' : 'Criar'}
        </button>
      </div>
    </div>
  );
}

export function SettingsPage() {
  const { categories, isLoading, refetch } = useCategories();
  // Estado de erro explícito para diagnóstico em tela (não silenciado)
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeTab, setActiveTab]          = useState<ActiveTab>('expense');
  const [deletingId, setDeletingId]        = useState<string | null>(null);

  const displayed = categories.filter(c => c.type === activeTab);

  async function handleDelete(id: string, name: string): Promise<void> {
    if (!window.confirm(`Remover a categoria "${name}"? As transações existentes não serão alteradas.`)) return;
    setDeletingId(id);
    try {
      await categoryService.delete(id);
      await refetch();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>Configurações</h1>
        <p className={styles.pageSubtitle}>Gerencie as categorias do sistema</p>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <Tag size={16} className={styles.cardIcon} />
          <h2 className={styles.cardTitle}>Categorias</h2>
        </div>

        {/* Tabs receita/despesa */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'expense' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('expense')}
          >
            Despesas
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'income' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('income')}
          >
            Receitas
          </button>
        </div>

        {/* Lista de categorias */}
        {fetchError && <p style={{ color: 'red', fontSize: '0.8rem' }}>{fetchError}</p>}
        {isLoading ? (
          <div className={styles.loadingList}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={`skeleton ${styles.skeletonRow}`} style={{ animationDelay: `${i*0.06}s` }} />
            ))}
          </div>
        ) : (
          <div className={styles.list}>
            {displayed.length === 0 && (
              <p className={styles.empty}>Nenhuma categoria de {activeTab === 'expense' ? 'despesa' : 'receita'} encontrada.</p>
            )}
            {displayed.map(cat => (
              <div key={cat.id} className={styles.row}>
                <span className={`${styles.dot} ${activeTab === 'expense' ? styles.dotExpense : styles.dotIncome}`} />
                <span className={styles.catName}>{cat.name}</span>
                <button
                  className={styles.deleteBtn}
                  onClick={() => handleDelete(cat.id, cat.name)}
                  disabled={deletingId === cat.id}
                  title="Remover categoria"
                >
                  {deletingId === cat.id ? '...' : <Trash2 size={13} />}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Formulário de nova categoria */}
        <NewCategoryForm type={activeTab} onCreated={refetch} />

        <p className={styles.hint}>
          ⚠️ Remover uma categoria não altera as transações já classificadas com ela.
        </p>
      </div>
    </div>
  );
}
