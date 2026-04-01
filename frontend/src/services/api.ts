// ============================================================
// HTTP Client — instância configurada do Axios
// Analogia Angular: HttpClient + interceptors
// ============================================================

import axios, { AxiosError, AxiosResponse } from 'axios';
import type { ApiResponse } from '@/types';

const apiClient = axios.create({
  baseURL : '/api',
  timeout : 10_000,
  headers : {
    'Content-Type': 'application/json',
  },
});

// Interceptor de resposta — normaliza erros
// Analogia Angular: HttpInterceptor
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
