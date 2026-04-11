// ============================================================
// LoginPage — tela de autenticação com alternância entre login e cadastro.
// Exibida quando o usuário não está autenticado (PrivateRoute redireciona para cá).
// ============================================================

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import styles from './LoginPage.module.scss';
import { LogIn, UserPlus, Eye, EyeOff } from 'lucide-react';

type AuthMode = 'login' | 'register';

export function LoginPage() {
  const { login, register } = useAuth();

  const [mode, setMode]         = useState<AuthMode>('login');
  const [name, setName]         = useState<string>('');
  const [email, setEmail]       = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPass, setShowPass] = useState<boolean>(false);
  const [loading, setLoading]   = useState<boolean>(false);
  const [error, setError]       = useState<string | null>(null);

  function switchMode(newMode: AuthMode): void {
    setMode(newMode);
    setError(null);
    setName('');
    setEmail('');
    setPassword('');
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        await login({ email, password });
      } else {
        if (name.trim().length < 2) {
          setError('O nome deve ter pelo menos 2 caracteres.');
          return;
        }
        await register({ name: name.trim(), email, password });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocorreu um erro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      {/* Card central */}
      <div className={`${styles.card} fade-in-scale`}>

        {/* Logo */}
        <div className={styles.logo}>
          <span className={styles.logoIcon}>₿</span>
          <span className={styles.logoText}>Finanças</span>
        </div>

        {/* Tabs de modo */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${mode === 'login' ? styles.tabActive : ''}`}
            onClick={() => switchMode('login')}
          >
            <LogIn size={14} /> Entrar
          </button>
          <button
            className={`${styles.tab} ${mode === 'register' ? styles.tabActive : ''}`}
            onClick={() => switchMode('register')}
          >
            <UserPlus size={14} /> Criar conta
          </button>
        </div>

        <p className={styles.subtitle}>
          {mode === 'login'
            ? 'Bem-vindo de volta! Entre com suas credenciais.'
            : 'Crie sua conta para começar a controlar suas finanças.'}
        </p>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          {mode === 'register' && (
            <div className={styles.field}>
              <label className={styles.label} htmlFor="name">Nome</label>
              <input
                id="name"
                type="text"
                className={styles.input}
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Seu nome completo"
                required
                autoComplete="name"
              />
            </div>
          )}

          <div className={styles.field}>
            <label className={styles.label} htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              className={styles.input}
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              autoComplete="email"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="password">Senha</label>
            <div className={styles.passwordWrapper}>
              <input
                id="password"
                type={showPass ? 'text' : 'password'}
                className={`${styles.input} ${styles.passwordInput}`}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={mode === 'register' ? 'Mínimo 6 caracteres' : '••••••••'}
                required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowPass(v => !v)}
                tabIndex={-1}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && <p className={styles.errorMsg}>{error}</p>}

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={loading}
          >
            {loading
              ? 'Aguarde...'
              : mode === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>
      </div>
    </div>
  );
}
