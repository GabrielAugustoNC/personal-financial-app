// ============================================================
// Módulo de configuração do cliente HTTP Axios.
// Define a instância base com URL, timeout e interceptors globais.
// Todos os services da aplicação importam esta instância configurada.
// Analogia Angular: HttpClient configurado com interceptors via HTTP_INTERCEPTORS
// ============================================================

import axios, { AxiosError, AxiosResponse } from 'axios';
import type { ApiResponse } from '@/types';

// Instância do Axios configurada com base URL e timeout padrão.
// O prefixo /api é redirecionado pelo proxy do Vite para o backend Go em localhost:8080.
const apiClient = axios.create({
  baseURL : '/api',
  timeout : 10_000,
  headers : {
    'Content-Type': 'application/json',
  },
});

// Interceptor de resposta — normaliza os erros da API para um formato consistente.
// Em caso de erro, extrai a mensagem do campo error do envelope ApiResponse,
// ou usa a mensagem nativa do Axios como fallback.
// Analogia Angular: HttpInterceptor com catchError e throwError
apiClient.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => response,
  (error: AxiosError<ApiResponse<never>>) => {
    const message =
      error.response?.data?.error ??
      error.message ??
      'Erro desconhecido';

    return Promise.reject(new Error(message));
  }
);

export default apiClient;
