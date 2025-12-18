import axios from 'axios';

/**
 * Instância configurada do Axios para comunicação com a API
 * - baseURL: URL base da API definida nas variáveis de ambiente
 * - timeout: Tempo máximo de 10 segundos para requisições
 */
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Interceptor de requisição
 * Adiciona automaticamente o token JWT no header Authorization de todas as requisições
 */
api.interceptors.request.use(
  (config) => {
    // Busca o token armazenado no localStorage
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    
    // Se o token existir, adiciona no header Authorization
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Interceptor de resposta
 * Trata erros globalmente (ex: token expirado, erro de servidor)
 */
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Se o token estiver inválido ou expirado (401), redireciona para login
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Redireciona para login apenas no cliente
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
