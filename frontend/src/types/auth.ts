// ============================================================
// Tipos de autenticação — espelham as structs Go do backend.
// ============================================================

// UserInfo contém os dados públicos do usuário autenticado.
export interface UserInfo {
  id    : string;
  name  : string;
  email : string;
}

// AuthResponse é retornado pelo backend após login/registro.
export interface AuthResponse {
  token: string;
  user : UserInfo;
}

// LoginInput é o DTO de entrada para o formulário de login.
export interface LoginInput {
  email   : string;
  password: string;
}

// RegisterInput é o DTO de entrada para o formulário de cadastro.
export interface RegisterInput {
  name    : string;
  email   : string;
  password: string;
}
