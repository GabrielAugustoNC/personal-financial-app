// ============================================================
// Tipos relacionados à carteira e ao seletor de período.
// Centraliza as definições usadas pelo WalletWidget, useWallet e PeriodSelector.
// ============================================================

// Wallet representa o saldo manual da carteira do usuário.
// Persistido como documento singleton na collection "settings" do MongoDB.
export interface Wallet {
  id?        : string;  // ObjectID gerado pelo MongoDB (opcional na leitura inicial)
  balance    : number;  // Saldo atual em reais
  updated_at?: string;  // Timestamp da última atualização
}

// UpdateWalletInput é o DTO de entrada para atualizar o saldo da carteira.
// Contém apenas o campo balance — os demais são gerados pelo backend.
export interface UpdateWalletInput {
  balance: number;
}

// Period representa os períodos de visualização disponíveis nos gráficos.
// Usado pelo PeriodSelector e pelos hooks de analytics e dashboard.
export type Period = '1w' | '1m' | '1y';

// PeriodOption define a configuração completa de cada opção de período.
// O campo months indica quantos meses enviar ao backend para cálculos de aggregation.
export interface PeriodOption {
  value : Period;  // Identificador interno do período
  label : string;  // Rótulo exibido no botão
  months: number;  // Meses equivalentes para parâmetro da API
}

// PERIOD_OPTIONS é a lista completa de períodos disponíveis no sistema.
// O campo months é usado pelo Analytics (granularidade mensal) para solicitar ao backend.
// No Dashboard, o filtro é feito no frontend sobre os dados já carregados.
//   '1w' → Analytics solicita 2 meses (mês atual + anterior como contexto)
//   '1m' → Analytics solicita 3 meses
//   '1y' → Analytics solicita 12 meses
export const PERIOD_OPTIONS: PeriodOption[] = [
  // months=1: backend retorna apenas o mês corrente (contém os últimos 7 dias)
  { value: '1w', label: '7 dias',   months: 1  },
  // months=2: backend retorna mês atual + anterior (abrange os últimos 30 dias)
  { value: '1m', label: '30 dias',  months: 2  },
  // months=12: backend retorna os últimos 12 meses com dados
  { value: '1y', label: '12 meses', months: 12 },
];

// PERIOD_DAYS mapeia cada período ao número de dias correspondente para filtro no frontend.
// Usado pelo Dashboard para filtrar transações e calcular o resumo do período.
export const PERIOD_DAYS: Record<Period, number> = {
  '1w': 7,
  '1m': 30,
  '1y': 365,
};
