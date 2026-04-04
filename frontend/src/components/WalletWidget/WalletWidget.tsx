import { useRef, useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { formatCurrency } from '@/utils/format';
import styles from './WalletWidget.module.scss';
import { Wallet, Check, X } from 'lucide-react';

export function WalletWidget() {
  const { wallet, isLoading, updateWallet } = useWallet();
  const [editing, setEditing]   = useState<boolean>(false);
  const [inputVal, setInputVal] = useState<string>('');
  const [saving, setSaving]     = useState<boolean>(false);
  const inputRef                = useRef<HTMLInputElement>(null);

  function openEdit(): void {
    setInputVal(String(wallet.balance));
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 50);
  }

  function cancelEdit(): void {
    setEditing(false);
  }

  async function confirmEdit(): Promise<void> {
    const parsed = parseFloat(inputVal.replace(',', '.'));
    if (isNaN(parsed)) { cancelEdit(); return; }
    setSaving(true);
    try {
      await updateWallet(parsed);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent): void {
    if (e.key === 'Enter')  confirmEdit();
    if (e.key === 'Escape') cancelEdit();
  }

  return (
    <div className={styles.widget}>
      <div className={styles.walletIcon}>
        <Wallet size={14} />
      </div>

      <div className={styles.content}>
        <span className={styles.label}>Carteira</span>

        {editing ? (
          <div className={styles.editRow}>
            <span className={styles.prefix}>R$</span>
            <input
              ref={inputRef}
              type="number"
              className={styles.input}
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={handleKeyDown}
              step="0.01"
              disabled={saving}
            />
            <button className={styles.iconBtn} onClick={confirmEdit} disabled={saving}>
              <Check size={13} />
            </button>
            <button className={styles.iconBtn} onClick={cancelEdit}>
              <X size={13} />
            </button>
          </div>
        ) : (
          <button className={styles.valueBtn} onClick={openEdit} title="Clique para editar">
            <span className={`${styles.value} mono`}>
              {isLoading ? '—' : formatCurrency(wallet.balance)}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
