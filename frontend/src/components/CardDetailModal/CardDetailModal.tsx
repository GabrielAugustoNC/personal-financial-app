import { useEffect, useRef, useState } from 'react';
import type { CardDetail, CardDetailItem, ImportCardDetailInput } from '@/types/category';
import type { Transaction } from '@/types';
import { cardDetailService } from '@/services/categoryService';
import { formatCurrency } from '@/utils/format';
import styles from './CardDetailModal.module.scss';
import { X, Upload, Plus, Trash2, AlertCircle, CheckCircle } from 'lucide-react';

interface CardDetailModalProps {
  transaction : Transaction;  // fatura de cartão selecionada
  onClose     : () => void;
}

// Item editável no formulário — inclui id local para controle de chaves React
interface EditableItem extends CardDetailItem {
  localId: string;
}

type ImportMode = 'manual' | 'csv' | 'json';

// CardDetailModal permite subcategorizar uma fatura de cartão de crédito.
// O usuário pode adicionar itens manualmente, importar via CSV ou JSON.
// A soma dos itens não pode ultrapassar o valor da fatura — o restante vira "Outros".
export function CardDetailModal({ transaction, onClose }: CardDetailModalProps) {
  const [mode, setMode]         = useState<ImportMode>('manual');
  const [items, setItems]       = useState<EditableItem[]>([]);
  const [existing, setExisting] = useState<CardDetail | null>(null);
  const [loading, setLoading]   = useState<boolean>(true);
  const [saving, setSaving]     = useState<boolean>(false);
  const [error, setError]       = useState<string | null>(null);
  const [success, setSuccess]   = useState<boolean>(false);
  const fileRef                 = useRef<HTMLInputElement>(null);

  const invoiceTotal = transaction.amount;
  const allocatedSum = items.reduce((s, i) => s + (parseFloat(String(i.amount)) || 0), 0);
  const remaining    = invoiceTotal - allocatedSum;

  // Carrega detalhes existentes ao abrir o modal
  useEffect(() => {
    cardDetailService.getByTransaction(transaction.id)
      .then(data => {
        if (data) {
          setExisting(data);
          // Pré-preenche os itens existentes (exclui "Outros" que é gerado automaticamente)
          const editable = data.items
            .filter(i => i.name !== 'Outros')
            .map(i => ({ ...i, localId: Math.random().toString(36).slice(2) }));
          setItems(editable);
        }
      })
      .finally(() => setLoading(false));
  }, [transaction.id]);

  function addItem(): void {
    setItems(prev => [...prev, {
      localId : Math.random().toString(36).slice(2),
      name    : '',
      amount  : 0,
      category: 'Outros',
    }]);
  }

  function removeItem(localId: string): void {
    setItems(prev => prev.filter(i => i.localId !== localId));
  }

  function updateItem(localId: string, field: keyof CardDetailItem, value: string | number): void {
    setItems(prev =>
      prev.map(i => i.localId === localId ? { ...i, [field]: value } : i)
    );
  }

  // Parseia CSV com colunas: nome,valor,categoria
  function parseCSV(text: string): EditableItem[] {
    return text.split('\n')
      .slice(1) // pula header
      .filter(l => l.trim())
      .map(line => {
        const [name, amount, category] = line.split(',').map(s => s.trim().replace(/"/g, ''));
        return {
          localId : Math.random().toString(36).slice(2),
          name    : name ?? '',
          amount  : parseFloat(amount) || 0,
          category: category ?? 'Outros',
        };
      })
      .filter(i => i.name && i.amount > 0);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const raw = ev.target?.result as string;
      try {
        if (file.name.endsWith('.csv')) {
          setItems(parseCSV(raw));
        } else {
          // JSON: aceita array de { name, amount, category }
          const parsed = JSON.parse(raw.replace(/,(\s*[}\]])/g, '$1')) as CardDetailItem[];
          setItems(parsed.map(i => ({ ...i, localId: Math.random().toString(36).slice(2) })));
        }
        setError(null);
      } catch {
        setError('Erro ao ler o arquivo. Verifique o formato.');
      }
    };
    reader.readAsText(file);
  }

  async function handleSave(): Promise<void> {
    setError(null);

    const validItems = items.filter(i => i.name.trim() && parseFloat(String(i.amount)) > 0);
    if (validItems.length === 0) {
      setError('Adicione pelo menos um item com nome e valor válido.');
      return;
    }

    const sum = validItems.reduce((s, i) => s + parseFloat(String(i.amount)), 0);
    if (sum > invoiceTotal + 0.01) {
      setError(`A soma dos itens (${formatCurrency(sum)}) ultrapassa o valor da fatura (${formatCurrency(invoiceTotal)}).`);
      return;
    }

    const input: ImportCardDetailInput = {
      items: validItems.map(({ name, amount, category }) => ({
        name,
        amount: parseFloat(String(amount)),
        category,
      })),
    };

    setSaving(true);
    try {
      await cardDetailService.import(transaction.id, input);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  const EXPENSE_CATS = [
    'Moradia','Alimentação','Transporte','Saúde','Educação',
    'Lazer','Vestuário','Assinaturas','Outros',
  ];

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={`${styles.modal} fade-in-scale`} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Detalhes da Fatura</h2>
            <p className={styles.subtitle}>{transaction.title} · {formatCurrency(invoiceTotal)}</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose}><X size={18} /></button>
        </div>

        {success ? (
          <div className={styles.successState}>
            <CheckCircle size={36} className={styles.successIcon} />
            <p className={styles.successTitle}>Detalhes salvos!</p>
            <p className={styles.successSub}>
              O restante de {formatCurrency(remaining < 0 ? 0 : remaining)} foi registrado como "Outros".
            </p>
            <button className={styles.doneBtn} onClick={onClose}>Fechar</button>
          </div>
        ) : (
          <>
            {/* Barra de progresso da fatura */}
            <div className={styles.progressBar}>
              <div className={styles.progressLabels}>
                <span>Alocado: <strong className="mono">{formatCurrency(allocatedSum)}</strong></span>
                <span className={remaining < 0 ? styles.overLimit : ''}>
                  Restante: <strong className="mono">{formatCurrency(Math.max(0, remaining))}</strong>
                </span>
              </div>
              <div className={styles.progressTrack}>
                <div
                  className={`${styles.progressFill} ${remaining < 0 ? styles.progressOver : ''}`}
                  style={{ width: `${Math.min(100, (allocatedSum / invoiceTotal) * 100)}%` }}
                />
              </div>
            </div>

            {/* Modo de entrada */}
            <div className={styles.modeRow}>
              <div className={styles.modeTabs}>
                {(['manual', 'csv', 'json'] as ImportMode[]).map(m => (
                  <button
                    key={m}
                    className={`${styles.modeTab} ${mode === m ? styles.modeActive : ''}`}
                    onClick={() => setMode(m)}
                  >
                    {m === 'manual' ? 'Manual' : m.toUpperCase()}
                  </button>
                ))}
              </div>
              {(mode === 'csv' || mode === 'json') && (
                <button className={styles.uploadBtn} onClick={() => fileRef.current?.click()}>
                  <Upload size={14} /> Selecionar arquivo
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.json"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </div>

            {mode === 'csv' && items.length === 0 && (
              <div className={styles.formatHint}>
                <p className={styles.hintLabel}>Formato CSV esperado</p>
                <pre className={styles.hintCode}>{`nome,valor,categoria\nMercado,250.00,Alimentação\nFarmácia,80.50,Saúde`}</pre>
              </div>
            )}

            {mode === 'json' && items.length === 0 && (
              <div className={styles.formatHint}>
                <p className={styles.hintLabel}>Formato JSON esperado</p>
                <pre className={styles.hintCode}>{`[\n  { "name": "Mercado", "amount": 250, "category": "Alimentação" },\n  { "name": "Farmácia", "amount": 80.5, "category": "Saúde" }\n]`}</pre>
              </div>
            )}

            {/* Lista de itens editáveis */}
            {loading ? (
              <div className={styles.loadingItems}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className={`skeleton ${styles.itemSkeleton}`} />
                ))}
              </div>
            ) : (
              <div className={`${styles.itemList} scrollable`}>
                {existing && items.length === 0 && (
                  <p className={styles.emptyHint}>Fatura sem detalhes — adicione itens acima ou importe um arquivo.</p>
                )}
                {items.map(item => (
                  <div key={item.localId} className={styles.itemRow}>
                    <input
                      type="text"
                      className={styles.itemInput}
                      placeholder="Nome do gasto"
                      value={item.name}
                      onChange={e => updateItem(item.localId, 'name', e.target.value)}
                    />
                    <div className={styles.itemAmount}>
                      <span className={styles.amountPrefix}>R$</span>
                      <input
                        type="number"
                        className={`${styles.itemInput} ${styles.amountInput} mono`}
                        placeholder="0,00"
                        value={item.amount || ''}
                        onChange={e => updateItem(item.localId, 'amount', e.target.value)}
                        min="0.01" step="0.01"
                      />
                    </div>
                    <select
                      className={styles.itemSelect}
                      value={item.category}
                      onChange={e => updateItem(item.localId, 'category', e.target.value)}
                    >
                      {EXPENSE_CATS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <button className={styles.removeBtn} onClick={() => removeItem(item.localId)}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {mode === 'manual' && (
              <button className={styles.addItemBtn} onClick={addItem}>
                <Plus size={14} /> Adicionar item
              </button>
            )}

            {error && (
              <div className={styles.errorMsg}>
                <AlertCircle size={14} />{error}
              </div>
            )}

            <div className={styles.footer}>
              <button className={styles.cancelBtn} onClick={onClose}>Cancelar</button>
              <button
                className={styles.saveBtn}
                onClick={handleSave}
                disabled={saving || items.length === 0 || remaining < -0.01}
              >
                {saving ? 'Salvando...' : 'Salvar detalhes'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
