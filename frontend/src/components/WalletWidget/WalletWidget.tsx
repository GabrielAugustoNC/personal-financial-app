// ============================================================
// WalletWidget — exibe o saldo da carteira na sidebar com edição inline.
// O usuário pode clicar no valor para editar diretamente, sem abrir um modal.
// Teclas Enter (confirmar) e Escape (cancelar) são suportadas.
// O saldo é persistido no MongoDB via useWallet ao confirmar.
// ============================================================

import { useRef, useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { formatCurrency } from '@/utils/format';
import styles from './WalletWidget.module.scss';
import { Wallet, Check, X } from 'lucide-react';

// WalletWidget é um componente autossuficiente — gerencia seu próprio estado de edição
// e acessa o backend via useWallet. Não recebe props externas.
export function WalletWidget() {
  const { wallet, isLoading, updateWallet } = useWallet();

  // Estado de controle da edição inline
  const [editing, setEditing]   = useState<boolean>(false);
  const [inputVal, setInputVal] = useState<string>('');
  const [saving, setSaving]     = useState<boolean>(false);

  // Referência ao input para foco e seleção automática ao abrir edição
  const inputRef = useRef<HTMLInputElement>(null);

  // Abre o modo de edição, pré-preenchendo com o saldo atual e selecionando o texto.
  // O setTimeout garante que o focus ocorra após a renderização do input.
  function openEdit(): void {
    setInputVal(String(wallet.balance));
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 50);
  }

  // Cancela a edição e volta ao modo de exibição sem salvar nada.
  function cancelEdit(): void {
    setEditing(false);
  }

  // Valida o valor digitado e persiste no backend se válido.
  // Vírgula é convertida para ponto para compatibilidade com parseFloat.
  async function confirmEdit(): Promise<void> {
    const parsed = parseFloat(inputVal.replace(',', '.'));

    // Cancela silenciosamente se o valor não for um número válido
    if (isNaN(parsed)) { cancelEdit(); return; }

    setSaving(true);
    try {
      await updateWallet(parsed);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  // Suporte a atalhos de teclado: Enter confirma, Escape cancela.
  function handleKeyDown(e: React.KeyboardEvent): void {
    if (e.key === 'Enter')  confirmEdit();
    if (e.key === 'Escape') cancelEdit();
  }

  return (
    <div className={styles.widget}>
      {/* Ícone decorativo da carteira */}
      <div className={styles.walletIcon}>
        <Wallet size={14} />
      </div>

      <div className={styles.content}>
        <span className={styles.label}>Carteira</span>

        {/* Modo edição: input numérico com botões de confirmar/cancelar */}
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
          /* Modo exibição: valor formatado como botão clicável */
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
