// ============================================================
// AuthContext — contexto global de autenticação.
// Disponibiliza o estado de autenticação e as ações (login, register, logout)
// para toda a árvore de componentes via useAuth().
// Analogia Angular: AuthService singleton com BehaviorSubject<User | null>.
// ============================================================

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { UserInfo, LoginInput, RegisterInput } from '@/types/auth';
import { authService } from '@/services/authService';

// ---- Tipos do contexto ----

interface AuthContextValue {
  user         : UserInfo | null;  // usuário autenticado ou null
  isLoading    : boolean;          // true durante verificação inicial
  isAuthenticated: boolean;        // atalho para user !== null
  login        : (input: LoginInput)    => Promise<void>;
  register     : (input: RegisterInput) => Promise<void>;
  logout       : () => void;
}

// ---- Criação do contexto ----

const AuthContext = createContext<AuthContextValue | null>(null);

// ---- Provider ----

interface AuthProviderProps {
  children: React.ReactNode;
}

// AuthProvider envolve toda a aplicação e gerencia o estado de autenticação.
// Na montagem, restaura a sessão do localStorage se houver token válido.
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser]         = useState<UserInfo | null>(null);
  const [isLoading, setLoading] = useState<boolean>(true);

  // Restaura a sessão ao carregar a aplicação — sem nova chamada à API.
  // O token é validado na primeira requisição protegida automaticamente.
  useEffect(() => {
    const savedUser = authService.getUser();
    if (savedUser && authService.isAuthenticated()) {
      setUser(savedUser);
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (input: LoginInput): Promise<void> => {
    const response = await authService.login(input);
    setUser(response.user);
  }, []);

  const register = useCallback(async (input: RegisterInput): Promise<void> => {
    const response = await authService.register(input);
    setUser(response.user);
  }, []);

  const logout = useCallback((): void => {
    authService.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated: Boolean(user),
      login,
      register,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// ---- Hook de consumo ----

// useAuth retorna o contexto de autenticação.
// Lança erro se usado fora do AuthProvider — facilita diagnóstico em desenvolvimento.
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}
