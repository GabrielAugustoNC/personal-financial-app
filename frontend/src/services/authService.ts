// ============================================================
// AuthService — chamadas de login, registro e validação de token.
// O token JWT é armazenado no localStorage e enviado em todo request via apiClient.
// ============================================================

import type { AuthResponse, LoginInput, RegisterInput, UserInfo } from '@/types/auth';
import type { ApiResponse } from '@/types';
import apiClient from './api';

const TOKEN_KEY = 'financas_token';
const USER_KEY  = 'financas_user';

class AuthService {
  // Registra um novo usuário e armazena o token retornado.
  async register(input: RegisterInput): Promise<AuthResponse> {
    const response = await apiClient.post<ApiResponse<AuthResponse>>('/auth/register', input);
    if (!response.data.data) throw new Error('Erro ao criar conta');
    this.saveSession(response.data.data);
    return response.data.data;
  }

  // Autentica um usuário existente e armazena o token retornado.
  async login(input: LoginInput): Promise<AuthResponse> {
    const response = await apiClient.post<ApiResponse<AuthResponse>>('/auth/login', input);
    if (!response.data.data) throw new Error('Credenciais inválidas');
    this.saveSession(response.data.data);
    return response.data.data;
  }

  // Remove o token e os dados de sessão do localStorage.
  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  // Retorna o token JWT armazenado localmente.
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  // Retorna os dados do usuário autenticado, se houver sessão ativa.
  getUser(): UserInfo | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as UserInfo;
    } catch {
      return null;
    }
  }

  // Retorna true se há um token armazenado (sessão possivelmente válida).
  isAuthenticated(): boolean {
    return Boolean(this.getToken());
  }

  // Persiste o token e os dados do usuário no localStorage.
  private saveSession(data: AuthResponse): void {
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  }
}

export const authService = new AuthService();
