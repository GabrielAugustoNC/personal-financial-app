import { useEffect, useRef, useState } from 'react';
import type {
  CreateTransactionInput,
  Transaction,
  TransactionType,
  UpdateTransactionInput,
  ImportTransactionItem,
  BulkImportResponse,
} from '@/types';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/types';
import { transactionService } from '@/services/transactionService';
import { formatDateInput } from '@/utils/format';
import styles from './TransactionForm.module.scss';
import { X, Upload, FileJson, CheckCircle, AlertCircle, Download } from 'lucide-react';

// ---- Tipos internos ----

type ModalTab = 'manual' | 'import';

interface TransactionFormProps {
  onSubmit  : (input: CreateTransactionInput | UpdateTransactionInput) => Promise<void>;
  onClose   : () => void;
  onRefetch : () => Promise<void>;
  editData? : Transaction | null;
}

interface FormState {
  title       : string;
  amount      : string;
  type        : TransactionType;
  category    : string;
  description : string;
  date        : string;
}

type ImportStatus = 'idle' | 'parsing' | 'importing' | 'success' | 'error';

interface ImportState {
  status   : ImportStatus;
  fileName : string;
  items    : ImportTransactionItem[];
  result   : BulkImportResponse | null;
  error    : string | null;
}

// ---- Constantes ----

const DEFAULT_FORM: FormState = {
  title       : '',
  amount      : '',
  type        : 'expense',
  category    : '',
  description : '',
  date        : new Date().toISOString().substring(0, 10),
};

const DEFAULT_IMPORT: ImportState = {
  status   : 'idle',
  fileName : '',
  items    : [],
  result   : null,
  error    : null,
};

// ---- Helpers ----

// Normaliza a data — aceita tanto string plana quanto { $date: "..." }
function normalizeDate(raw: ImportTransactionItem['date']): string {
  if (typeof raw === 'string') return raw;
  if (raw && typeof raw === 'object' && '$date' in raw) return raw.$date;
  return new Date().toISOString();
}

export function TransactionForm({
  onSubmit,
  onClose,
  onRefetch,
  editData,
}: TransactionFormProps) {
  const [tab, setTab]               = useState<ModalTab>('manual');
  const [form, setForm]             = useState<FormState>(DEFAULT_FORM);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError]   = useState<string | null>(null);
  const [importState, setImportState] = useState<ImportState>(DEFAULT_IMPORT);
  const fileInputRef                = useRef<HTMLInputElement>(null);

  const isEditing = Boolean(editData);

  useEffect(() => {
    if (editData) {
      setForm({
        title       : editData.title,
        amount      : String(editData.amount),
        type        : editData.type,
        category    : editData.category,
        description : editData.description,
        date        : formatDateInput(editData.date),
      });
    }
  }, [editData]);

  const categories = form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  // ---- Handlers do formulário manual ----

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ): void {
    const { name, value } = e.target;
    if (name === 'type') {
      setForm(prev => ({ ...prev, type: value as TransactionType, category: '' }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setFormError(null);

    const parsedAmount = parseFloat(form.amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError('Informe um valor válido maior que zero.');
      return;
    }
    if (!form.category) {
      setFormError('Selecione uma categoria.');
      return;
    }

    const payload: CreateTransactionInput = {
      title       : form.title.trim(),
      amount      : parsedAmount,
      type        : form.type,
      category    : form.category,
      description : form.description.trim(),
      date        : new Date(form.date).toISOString(),
    };

    setIsSubmitting(true);
    try {
      await onSubmit(payload);
      onClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setIsSubmitting(false);
    }
  }

  // ---- Handlers de importação ----

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      setImportState(prev => ({
        ...prev,
        error: 'Apenas arquivos .json são aceitos.',
        status: 'error',
      }));
      return;
    }

    setImportState(prev => ({ ...prev, status: 'parsing', fileName: file.name, error: null }));

    const reader = new FileReader();

    reader.onload = (event: ProgressEvent<FileReader>) => {
      try {
        const raw = event.target?.result as string;
        const sanitized = raw.replace(/,(\s*[}\]])/g, '$1');
        const parsed = JSON.parse(sanitized) as ImportTransactionItem[];

        if (!Array.isArray(parsed)) {
          throw new Error('O arquivo deve conter um array JSON de transações.');
        }
        if (parsed.length === 0) {
          throw new Error('O arquivo está vazio.');
        }

        setImportState(prev => ({
          ...prev,
          status: 'idle',
          items : parsed,
        }));
      } catch (err) {
        setImportState(prev => ({
          ...prev,
          status: 'error',
          error : err instanceof Error ? err.message : 'Erro ao ler o arquivo',
        }));
      }
    };

    reader.onerror = () => {
      setImportState(prev => ({
        ...prev,
        status: 'error',
        error : 'Erro ao ler o arquivo.',
      }));
    };

    reader.readAsText(file);
  }

  // Gera e faz download de um arquivo JSON de exemplo.
  // Usa a API nativa do navegador: Blob → URL temporária → click automático.
  // Analogia .NET: File(content, "application/json", "modelo.json")
  function downloadTemplate(): void {
    const template = [
      {
        title      : 'Salário',
        amount     : 5000.00,
        type       : 'income',
        category   : 'Salário',
        description: 'Salário mensal',
        date       : new Date().toISOString(),
      },
      {
        title      : 'Aluguel',
        amount     : 1500.00,
        type       : 'expense',
        category   : 'Moradia',
        description: 'Aluguel mensal',
        date       : new Date().toISOString(),
      },
      {
        title      : 'Supermercado',
        amount     : 450.00,
        type       : 'expense',
        category   : 'Alimentação',
        description: '',
        date       : new Date().toISOString(),
      },
    ];

    const blob = new Blob(
      [JSON.stringify(template, null, 2)],
      { type: 'application/json' }
    );
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href     = url;
    link.download = 'modelo-importacao.json';
    link.click();

    URL.revokeObjectURL(url);
  }

    async function handleImport(): Promise<void> {
    if (importState.items.length === 0) return;

    // Normaliza datas antes de enviar
    const normalized: ImportTransactionItem[] = importState.items.map(item => ({
      ...item,
      date: normalizeDate(item.date),
    }));

    setImportState(prev => ({ ...prev, status: 'importing', error: null }));

    try {
      const result = await transactionService.bulkImport(normalized);
      setImportState(prev => ({ ...prev, status: 'success', result }));
      await onRefetch();
    } catch (err) {
      setImportState(prev => ({
        ...prev,
        status: 'error',
        error : err instanceof Error ? err.message : 'Erro na importação',
      }));
    }
  }

  function resetImport(): void {
    setImportState(DEFAULT_IMPORT);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // ---- Render ----

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={`${styles.modal} fade-in-scale`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header com abas */}
        <div className={styles.modalHeader}>
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${tab === 'manual' ? styles.tabActive : ''}`}
              onClick={() => setTab('manual')}
            >
              {isEditing ? 'Editar' : 'Manual'}
            </button>
            {!isEditing && (
              <button
                className={`${styles.tab} ${tab === 'import' ? styles.tabActive : ''}`}
                onClick={() => setTab('import')}
              >
                <Upload size={13} />
                Importar JSON
              </button>
            )}
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* ---- Aba Manual ---- */}
        {tab === 'manual' && (
          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            <div className={styles.typeToggle}>
              {(['expense', 'income'] as TransactionType[]).map((t) => (
                <label
                  key={t}
                  className={`${styles.typeOption} ${styles[t]} ${form.type === t ? styles.typeActive : ''}`}
                >
                  <input
                    type="radio"
                    name="type"
                    value={t}
                    checked={form.type === t}
                    onChange={handleChange}
                  />
                  {t === 'income' ? '↑ Receita' : '↓ Despesa'}
                </label>
              ))}
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="title">Título</label>
              <input
                id="title" name="title" type="text"
                className={styles.input}
                value={form.title}
                onChange={handleChange}
                placeholder="Ex: Salário, Mercado..."
                required minLength={3}
              />
            </div>

            <div className={styles.row}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="amount">Valor (R$)</label>
                <input
                  id="amount" name="amount" type="number"
                  className={`${styles.input} mono`}
                  value={form.amount}
                  onChange={handleChange}
                  placeholder="0,00"
                  min="0.01" step="0.01" required
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="category">Categoria</label>
                <select
                  id="category" name="category"
                  className={styles.select}
                  value={form.category}
                  onChange={handleChange}
                  required
                >
                  <option value="" disabled>Selecione...</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="date">Data</label>
              <input
                id="date" name="date" type="date"
                className={styles.input}
                value={form.date}
                onChange={handleChange}
                required
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="description">
                Descrição <span className={styles.optional}>(opcional)</span>
              </label>
              <textarea
                id="description" name="description"
                className={styles.textarea}
                value={form.description}
                onChange={handleChange}
                placeholder="Detalhes adicionais..."
                rows={2}
              />
            </div>

            {formError && <p className={styles.error}>{formError}</p>}

            <div className={styles.formActions}>
              <button type="button" className={styles.cancelBtn} onClick={onClose}>
                Cancelar
              </button>
              <button
                type="submit"
                className={`${styles.submitBtn} ${form.type === 'income' ? styles.income : styles.expense}`}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Salvando...' : isEditing ? 'Salvar' : 'Adicionar'}
              </button>
            </div>
          </form>
        )}

        {/* ---- Aba Importar JSON ---- */}
        {tab === 'import' && (
          <div className={styles.importPanel}>

            {/* Sucesso */}
            {importState.status === 'success' && importState.result && (
              <div className={styles.importSuccess}>
                <CheckCircle size={32} className={styles.successIcon} />
                <p className={styles.successTitle}>Importação concluída!</p>
                <p className={styles.successSub}>
                  <strong>{importState.result.imported}</strong> de{' '}
                  <strong>{importState.result.total}</strong> transações importadas
                </p>
                <div className={styles.importActionsCenter}>
                  <button className={styles.cancelBtn} onClick={resetImport}>
                    Importar outro arquivo
                  </button>
                  <button className={styles.applyBtn} onClick={onClose}>
                    Fechar
                  </button>
                </div>
              </div>
            )}

            {/* Idle / Parsing / Error */}
            {importState.status !== 'success' && (
              <>
                {/* Drop zone */}
                <div
                  className={`${styles.dropzone} ${importState.items.length > 0 ? styles.dropzoneLoaded : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    className={styles.fileInput}
                    onChange={handleFileChange}
                  />
                  <FileJson size={28} className={styles.dropzoneIcon} />
                  {importState.items.length > 0 ? (
                    <>
                      <p className={styles.dropzoneTitle}>{importState.fileName}</p>
                      <p className={styles.dropzoneSub}>
                        {importState.items.length} transações encontradas — clique para trocar
                      </p>
                    </>
                  ) : (
                    <>
                      <p className={styles.dropzoneTitle}>Clique para selecionar o arquivo</p>
                      <p className={styles.dropzoneSub}>Formato suportado: .json</p>
                    </>
                  )}
                </div>

                {/* Formato esperado + botão de download do modelo */}
                {importState.items.length === 0 && (
                  <div className={styles.formatHint}>
                    <div className={styles.hintHeader}>
                      <p className={styles.hintTitle}>Formato esperado</p>
                      <button
                        className={styles.downloadBtn}
                        onClick={(e) => { e.stopPropagation(); downloadTemplate(); }}
                        title="Baixar modelo .json"
                        type="button"
                      >
                        <Download size={13} />
                        Baixar modelo
                      </button>
                    </div>
                    <pre className={styles.hintCode}>{`[
  {
    "title": "Salário",
    "amount": 5000,
    "type": "income",
    "category": "Salário",
    "description": "",
    "date": "2026-03-01T00:00:00.000Z"
    // ou { "$date": "2026-03-01T..." }
  }
]`}</pre>
                  </div>
                )}

                {/* Preview dos itens */}
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
                          {item.type === 'expense' ? '−' : '+'} R$ {item.amount.toFixed(2)}
                        </span>
                      </div>
                    ))}
                    {importState.items.length > 5 && (
                      <p className={styles.previewMore}>
                        + {importState.items.length - 5} itens não exibidos
                      </p>
                    )}
                  </div>
                )}

                {/* Erro */}
                {importState.status === 'error' && importState.error && (
                  <div className={styles.importError}>
                    <AlertCircle size={14} />
                    {importState.error}
                  </div>
                )}

                {/* Ações */}
                <div className={styles.formActions}>
                  <button className={styles.cancelBtn} onClick={onClose}>
                    Cancelar
                  </button>
                  <button
                    className={styles.applyBtn}
                    onClick={handleImport}
                    disabled={
                      importState.items.length === 0 ||
                      importState.status === 'importing'
                    }
                  >
                    {importState.status === 'importing'
                      ? 'Importando...'
                      : `Importar ${importState.items.length > 0 ? importState.items.length : ''} transações`}
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
