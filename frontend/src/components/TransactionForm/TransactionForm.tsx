import { useEffect, useRef, useState } from 'react';
import type {
  CreateTransactionInput,
  Transaction,
  TransactionType,
  UpdateTransactionInput,
  ImportTransactionItem,
  BulkImportResponse,
  RecurringFrequency,
} from '@/types';
import { useCategories } from '@/hooks/useCategories';
import { transactionService } from '@/services/transactionService';
import { formatDateInput, formatCurrency } from '@/utils/format';
import styles from './TransactionForm.module.scss';
import {
  X, Upload, FileJson, CheckCircle,
  AlertCircle, Download, Sparkles, RefreshCw,
} from 'lucide-react';

// ---- Tipos ----

type ModalTab    = 'manual' | 'suggestions' | 'import';
type ImportStatus = 'idle' | 'parsing' | 'importing' | 'success' | 'error';

interface TransactionFormProps {
  onSubmit  : (input: CreateTransactionInput | UpdateTransactionInput) => Promise<void>;
  onClose   : () => void;
  onRefetch : () => Promise<void>;
  editData? : Transaction | null;
}

interface FormState {
  title      : string;
  amount     : string;
  type       : TransactionType;
  category   : string;
  description: string;
  date       : string;
  recurring  : boolean;
  frequency  : RecurringFrequency;
}

interface ImportState {
  status  : ImportStatus; fileName: string;
  items   : ImportTransactionItem[];
  result  : BulkImportResponse | null; error: string | null;
}

// Sugestão editável do mês anterior
interface SuggestionRow {
  original : Transaction;
  amount   : string;      // valor editável
  date     : string;      // data editável (padrão = hoje)
  selected : boolean;
}

// ---- Constantes ----

const DEFAULT_FORM: FormState = {
  title      : '',
  amount     : '',
  type       : 'expense',
  category   : '',
  description: '',
  date       : new Date().toISOString().substring(0, 10),
  recurring  : false,
  frequency  : 'monthly',
};

const DEFAULT_IMPORT: ImportState = {
  status: 'idle', fileName: '', items: [], result: null, error: null,
};

const TODAY = new Date().toISOString().substring(0, 10);

function normalizeDate(raw: ImportTransactionItem['date']): string {
  if (typeof raw === 'string') return raw;
  if (raw && typeof raw === 'object' && '$date' in raw) return raw.$date;
  return new Date().toISOString();
}

// ---- Componente ----

export function TransactionForm({ onSubmit, onClose, onRefetch, editData }: TransactionFormProps) {
  const isEditing = Boolean(editData);

  const [tab, setTab]                   = useState<ModalTab>('manual');
  const [form, setForm]                 = useState<FormState>(DEFAULT_FORM);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError]       = useState<string | null>(null);
  const [importState, setImportState]   = useState<ImportState>(DEFAULT_IMPORT);
  const fileInputRef                    = useRef<HTMLInputElement>(null);

  // ---- Sugestões ----
  const [suggestions, setSuggestions]     = useState<SuggestionRow[]>([]);
  const [loadingSug, setLoadingSug]       = useState<boolean>(false);
  const [savingSug, setSavingSug]         = useState<boolean>(false);
  const [sugError, setSugError]           = useState<string | null>(null);
  const [sugSuccess, setSugSuccess]       = useState<number>(0);

  useEffect(() => {
    if (editData) {
      setForm({
        title      : editData.title,
        amount     : String(editData.amount),
        type       : editData.type,
        category   : editData.category,
        description: editData.description,
        date       : formatDateInput(editData.date),
        recurring  : editData.recurring ?? false,
        frequency  : (editData.frequency as RecurringFrequency) ?? 'monthly',
      });
    }
  }, [editData]);

  // Carrega sugestões ao entrar na aba
  useEffect(() => {
    if (tab !== 'suggestions' || suggestions.length > 0) return;

    setLoadingSug(true);
    setSugError(null);

    transactionService.getLastMonth()
      .then(data => {
        setSuggestions(
          data.map(t => ({
            original : t,
            amount   : String(t.amount),
            date     : TODAY,
            selected : true,
          }))
        );
      })
      .catch(() => setSugError('Não foi possível carregar as transações do mês anterior.'))
      .finally(() => setLoadingSug(false));
  }, [tab, suggestions.length]);

  const { incomeCategories, expenseCategories } = useCategories();
  const categories = form.type === 'income' ? incomeCategories : expenseCategories;

  // ---- Handlers: formulário manual ----

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ): void {
    const { name, value, type: inputType } = e.target as HTMLInputElement;
    if (name === 'type') {
      setForm(prev => ({ ...prev, type: value as TransactionType, category: '' }));
    } else if (inputType === 'checkbox') {
      // checkbox usa checked em vez de value
      const checked = (e.target as HTMLInputElement).checked;
      setForm(prev => ({ ...prev, [name]: checked }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setFormError(null);
    const parsedAmount = parseFloat(form.amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) { setFormError('Informe um valor válido maior que zero.'); return; }
    if (!form.category) { setFormError('Selecione uma categoria.'); return; }
    const payload: CreateTransactionInput = {
      title      : form.title.trim(),
      amount     : parsedAmount,
      type       : form.type,
      category   : form.category,
      description: form.description.trim(),
      date       : new Date(form.date).toISOString(),
      recurring  : form.recurring,
      frequency  : form.recurring ? form.frequency : undefined,
    };
    setIsSubmitting(true);
    try { await onSubmit(payload); onClose(); }
    catch (err) { setFormError(err instanceof Error ? err.message : 'Erro ao salvar'); }
    finally { setIsSubmitting(false); }
  }

  // ---- Handlers: sugestões ----

  function toggleSuggestion(index: number): void {
    setSuggestions(prev =>
      prev.map((s, i) => i === index ? { ...s, selected: !s.selected } : s)
    );
  }

  function toggleAll(selected: boolean): void {
    setSuggestions(prev => prev.map(s => ({ ...s, selected })));
  }

  function updateSuggestionField(
    index: number,
    field: 'amount' | 'date',
    value: string
  ): void {
    setSuggestions(prev =>
      prev.map((s, i) => i === index ? { ...s, [field]: value } : s)
    );
  }

  async function saveSelectedSuggestions(): Promise<void> {
    const selected = suggestions.filter(s => s.selected);
    if (selected.length === 0) { setSugError('Selecione pelo menos uma transação.'); return; }

    setSavingSug(true);
    setSugError(null);
    let saved = 0;

    for (const row of selected) {
      const amount = parseFloat(row.amount);
      if (isNaN(amount) || amount <= 0) continue;
      try {
        await transactionService.create({
          title      : row.original.title,
          amount,
          type       : row.original.type,
          category   : row.original.category,
          description: row.original.description,
          date       : new Date(row.date).toISOString(),
        });
        saved++;
      } catch { /* continua para o próximo */ }
    }

    await onRefetch();
    setSavingSug(false);
    setSugSuccess(saved);
  }

  // ---- Handlers: importação ----

  function downloadTemplate(): void {
    const template = [
      { title: 'Salário', amount: 5000.00, type: 'income', category: 'Salário', description: 'Salário mensal', date: new Date().toISOString() },
      { title: 'Aluguel', amount: 1500.00, type: 'expense', category: 'Moradia', description: 'Aluguel mensal', date: new Date().toISOString() },
      { title: 'Supermercado', amount: 450.00, type: 'expense', category: 'Alimentação', description: '', date: new Date().toISOString() },
    ];
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'modelo-importacao.json'; link.click();
    URL.revokeObjectURL(url);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.json')) {
      setImportState(prev => ({ ...prev, error: 'Apenas arquivos .json são aceitos.', status: 'error' }));
      return;
    }
    setImportState(prev => ({ ...prev, status: 'parsing', fileName: file.name, error: null }));
    const reader = new FileReader();
    reader.onload = (event: ProgressEvent<FileReader>) => {
      try {
        const raw       = event.target?.result as string;
        const sanitized = raw.replace(/,(\s*[}\]])/g, '$1');
        const parsed    = JSON.parse(sanitized) as ImportTransactionItem[];
        if (!Array.isArray(parsed)) throw new Error('O arquivo deve conter um array JSON.');
        if (parsed.length === 0)   throw new Error('O arquivo está vazio.');
        setImportState(prev => ({ ...prev, status: 'idle', items: parsed }));
      } catch (err) {
        setImportState(prev => ({ ...prev, status: 'error', error: err instanceof Error ? err.message : 'Erro ao ler o arquivo' }));
      }
    };
    reader.onerror = () => setImportState(prev => ({ ...prev, status: 'error', error: 'Erro ao ler o arquivo.' }));
    reader.readAsText(file);
  }

  async function handleImport(): Promise<void> {
    if (importState.items.length === 0) return;
    const normalized = importState.items.map(item => ({ ...item, date: normalizeDate(item.date) }));
    setImportState(prev => ({ ...prev, status: 'importing', error: null }));
    try {
      const result = await transactionService.bulkImport(normalized);
      setImportState(prev => ({ ...prev, status: 'success', result }));
      await onRefetch();
    } catch (err) {
      setImportState(prev => ({ ...prev, status: 'error', error: err instanceof Error ? err.message : 'Erro na importação' }));
    }
  }

  function resetImport(): void {
    setImportState(DEFAULT_IMPORT);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // ---- Render ----

  const selectedCount = suggestions.filter(s => s.selected).length;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={`${styles.modal} fade-in-scale`} onClick={e => e.stopPropagation()}>

        {/* Header com abas */}
        <div className={styles.modalHeader}>
          <div className={styles.tabs}>
            <button className={`${styles.tab} ${tab === 'manual' ? styles.tabActive : ''}`} onClick={() => setTab('manual')}>
              {isEditing ? 'Editar' : 'Manual'}
            </button>
            {!isEditing && (
              <>
                <button className={`${styles.tab} ${tab === 'suggestions' ? styles.tabActive : ''}`} onClick={() => setTab('suggestions')}>
                  <Sparkles size={12} />
                  Sugestões
                </button>
                <button className={`${styles.tab} ${tab === 'import' ? styles.tabActive : ''}`} onClick={() => setTab('import')}>
                  <Upload size={12} />
                  Importar
                </button>
              </>
            )}
          </div>
          <button className={styles.closeBtn} onClick={onClose}><X size={18} /></button>
        </div>

        {/* ---- Aba Manual ---- */}
        {tab === 'manual' && (
          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            <div className={styles.typeToggle}>
              {(['expense', 'income'] as TransactionType[]).map(t => (
                <label key={t} className={`${styles.typeOption} ${styles[t]} ${form.type === t ? styles.typeActive : ''}`}>
                  <input type="radio" name="type" value={t} checked={form.type === t} onChange={handleChange} />
                  {t === 'income' ? '↑ Receita' : '↓ Despesa'}
                </label>
              ))}
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="title">Título</label>
              <input id="title" name="title" type="text" className={styles.input} value={form.title} onChange={handleChange} placeholder="Ex: Salário, Mercado..." required minLength={3} />
            </div>
            <div className={styles.row}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="amount">Valor (R$)</label>
                <input id="amount" name="amount" type="number" className={`${styles.input} mono`} value={form.amount} onChange={handleChange} placeholder="0,00" min="0.01" step="0.01" required />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="category">Categoria</label>
                <select id="category" name="category" className={styles.select} value={form.category} onChange={handleChange} required>
                  <option value="" disabled>Selecione...</option>
                  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="date">Data</label>
              <input id="date" name="date" type="date" className={styles.input} value={form.date} onChange={handleChange} required />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="description">
                Descrição <span className={styles.optional}>(opcional)</span>
              </label>
              <textarea id="description" name="description" className={styles.textarea} value={form.description} onChange={handleChange} placeholder="Detalhes adicionais..." rows={2} />
            </div>

            {/* ---- Recorrência ---- */}
            <div className={styles.recurringBlock}>
              <label className={styles.recurringToggle}>
                <input
                  type="checkbox"
                  name="recurring"
                  className={styles.recurringCheckbox}
                  checked={form.recurring}
                  onChange={handleChange}
                />
                <span className={styles.recurringToggleLabel}>
                  <RefreshCw size={13} />
                  Transação recorrente
                </span>
              </label>

              {form.recurring && (
                <div className={styles.recurringOptions}>
                  <span className={styles.recurringHint}>Repetir automaticamente:</span>
                  <div className={styles.frequencyBtns}>
                    {(['weekly', 'monthly', 'yearly'] as RecurringFrequency[]).map(freq => (
                      <button
                        key={freq}
                        type="button"
                        className={`${styles.freqBtn} ${form.frequency === freq ? styles.freqActive : ''}`}
                        onClick={() => setForm(prev => ({ ...prev, frequency: freq }))}
                      >
                        {freq === 'weekly' ? 'Semanal' : freq === 'monthly' ? 'Mensal' : 'Anual'}
                      </button>
                    ))}
                  </div>
                  <p className={styles.recurringInfo}>
                    {form.frequency === 'weekly'
                      ? 'Um novo lançamento será criado automaticamente a cada 7 dias.'
                      : form.frequency === 'monthly'
                      ? 'Um novo lançamento será criado automaticamente todo mês.'
                      : 'Um novo lançamento será criado automaticamente todo ano.'}
                  </p>
                </div>
              )}
            </div>

            {formError && <p className={styles.error}>{formError}</p>}
            <div className={styles.formActions}>
              <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancelar</button>
              <button type="submit" className={`${styles.submitBtn} ${form.type === 'income' ? styles.income : styles.expense}`} disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : isEditing ? 'Salvar' : 'Adicionar'}
              </button>
            </div>
          </form>
        )}

        {/* ---- Aba Sugestões ---- */}
        {tab === 'suggestions' && (
          <div className={styles.suggestionsPanel}>
            {sugSuccess > 0 ? (
              <div className={styles.importSuccess}>
                <CheckCircle size={32} className={styles.successIcon} />
                <p className={styles.successTitle}>Transações cadastradas!</p>
                <p className={styles.successSub}><strong>{sugSuccess}</strong> transações do mês anterior foram relançadas.</p>
                <div className={styles.importActionsCenter}>
                  <button className={styles.cancelBtn} onClick={() => { setSugSuccess(0); setSuggestions([]); }}>
                    <RefreshCw size={13} /> Recarregar
                  </button>
                  <button className={styles.applyBtn} onClick={onClose}>Fechar</button>
                </div>
              </div>
            ) : loadingSug ? (
              <div className={styles.sugLoading}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className={`skeleton ${styles.sugSkeleton}`} style={{ animationDelay: `${i * 0.08}s` }} />
                ))}
              </div>
            ) : suggestions.length === 0 ? (
              <div className={styles.sugEmpty}>
                <Sparkles size={28} opacity={0.3} />
                <p>Nenhuma transação encontrada no mês anterior.</p>
              </div>
            ) : (
              <>
                <div className={styles.sugHeader}>
                  <p className={styles.sugDesc}>
                    Transações do mês anterior. Ajuste os valores e datas, selecione as que deseja relançar.
                  </p>
                  <div className={styles.sugSelectAll}>
                    <button className={styles.selectAllBtn} onClick={() => toggleAll(true)}>Marcar todos</button>
                    <button className={styles.selectAllBtn} onClick={() => toggleAll(false)}>Desmarcar</button>
                  </div>
                </div>

                <div className={`${styles.sugList} scrollable`}>
                  {suggestions.map((row, i) => (
                    <div
                      key={row.original.id}
                      className={`${styles.sugRow} ${styles[row.original.type]} ${row.selected ? styles.sugSelected : styles.sugUnselected}`}
                    >
                      {/* Checkbox */}
                      <label className={styles.sugCheckbox}>
                        <input
                          type="checkbox"
                          checked={row.selected}
                          onChange={() => toggleSuggestion(i)}
                        />
                        <span className={styles.checkmark} />
                      </label>

                      {/* Info */}
                      <div className={styles.sugInfo}>
                        <span className={styles.sugTitle}>{row.original.title}</span>
                        <span className={styles.sugCategory}>{row.original.category}</span>
                      </div>

                      {/* Campos editáveis */}
                      <div className={styles.sugFields}>
                        <div className={styles.sugFieldGroup}>
                          <span className={styles.sugFieldLabel}>Valor</span>
                          <div className={styles.sugAmountWrapper}>
                            <span className={styles.sugPrefix}>R$</span>
                            <input
                              type="number"
                              className={`${styles.sugInput} mono`}
                              value={row.amount}
                              onChange={e => updateSuggestionField(i, 'amount', e.target.value)}
                              min="0.01" step="0.01"
                              disabled={!row.selected}
                            />
                          </div>
                        </div>
                        <div className={styles.sugFieldGroup}>
                          <span className={styles.sugFieldLabel}>Data</span>
                          <input
                            type="date"
                            className={styles.sugInput}
                            value={row.date}
                            onChange={e => updateSuggestionField(i, 'date', e.target.value)}
                            disabled={!row.selected}
                          />
                        </div>
                      </div>

                      {/* Valor original como referência */}
                      <span className={`${styles.sugOriginal} mono`}>
                        orig. {formatCurrency(row.original.amount)}
                      </span>
                    </div>
                  ))}
                </div>

                {sugError && <p className={styles.sugErrorMsg}>{sugError}</p>}

                <div className={styles.formActions}>
                  <button className={styles.cancelBtn} onClick={onClose}>Cancelar</button>
                  <button
                    className={styles.applyBtn}
                    onClick={saveSelectedSuggestions}
                    disabled={savingSug || selectedCount === 0}
                  >
                    {savingSug ? 'Cadastrando...' : `Cadastrar ${selectedCount > 0 ? selectedCount : ''} selecionadas`}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ---- Aba Importar JSON ---- */}
        {tab === 'import' && (
          <div className={styles.importPanel}>
            {importState.status === 'success' && importState.result ? (
              <div className={styles.importSuccess}>
                <CheckCircle size={32} className={styles.successIcon} />
                <p className={styles.successTitle}>Importação concluída!</p>
                <p className={styles.successSub}>
                  <strong>{importState.result.imported}</strong> de{' '}
                  <strong>{importState.result.total}</strong> transações importadas
                </p>
                <div className={styles.importActionsCenter}>
                  <button className={styles.cancelBtn} onClick={resetImport}>Importar outro</button>
                  <button className={styles.applyBtn} onClick={onClose}>Fechar</button>
                </div>
              </div>
            ) : (
              <>
                <div
                  className={`${styles.dropzone} ${importState.items.length > 0 ? styles.dropzoneLoaded : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input ref={fileInputRef} type="file" accept=".json" className={styles.fileInput} onChange={handleFileChange} />
                  <FileJson size={28} className={styles.dropzoneIcon} />
                  {importState.items.length > 0 ? (
                    <>
                      <p className={styles.dropzoneTitle}>{importState.fileName}</p>
                      <p className={styles.dropzoneSub}>{importState.items.length} transações — clique para trocar</p>
                    </>
                  ) : (
                    <>
                      <p className={styles.dropzoneTitle}>Clique para selecionar o arquivo</p>
                      <p className={styles.dropzoneSub}>Formato: .json</p>
                    </>
                  )}
                </div>

                {importState.items.length === 0 && (
                  <div className={styles.formatHint}>
                    <div className={styles.hintHeader}>
                      <p className={styles.hintTitle}>Formato esperado</p>
                      <button className={styles.downloadBtn} onClick={e => { e.stopPropagation(); downloadTemplate(); }} type="button">
                        <Download size={13} />Baixar modelo
                      </button>
                    </div>
                    <pre className={styles.hintCode}>{`[{ "title": "Salário", "amount": 5000,\n   "type": "income", "category": "Salário",\n   "date": "2026-04-01" }]`}</pre>
                  </div>
                )}

                {importState.items.length > 0 && (
                  <div className={`${styles.previewList} scrollable`}>
                    {importState.items.slice(0, 5).map((item, i) => (
                      <div key={i} className={`${styles.previewItem} ${styles[item.type]}`}>
                        <span className={styles.previewDot} />
                        <div className={styles.previewInfo}>
                          <span className={styles.previewTitle}>{item.title}</span>
                          <span className={styles.previewMeta}>{item.category}</span>
                        </div>
                        <span className={`${styles.previewAmount} mono`}>
                          {item.type === 'expense' ? '−' : '+'} R$ {Number(item.amount).toFixed(2)}
                        </span>
                      </div>
                    ))}
                    {importState.items.length > 5 && (
                      <p className={styles.previewMore}>+ {importState.items.length - 5} itens não exibidos</p>
                    )}
                  </div>
                )}

                {importState.status === 'error' && importState.error && (
                  <div className={styles.importError}><AlertCircle size={14} />{importState.error}</div>
                )}

                <div className={styles.formActions}>
                  <button className={styles.cancelBtn} onClick={onClose}>Cancelar</button>
                  <button
                    className={styles.applyBtn}
                    onClick={handleImport}
                    disabled={importState.items.length === 0 || importState.status === 'importing'}
                  >
                    {importState.status === 'importing' ? 'Importando...' : `Importar ${importState.items.length > 0 ? importState.items.length : ''} transações`}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
