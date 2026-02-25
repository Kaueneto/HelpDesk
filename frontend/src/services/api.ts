import axios from 'axios';

/**
 * Instância configurada do Axios para comunicação com a API
 * - baseURL: URL base da API definida nas variáveis de ambiente
 * - timeout: Tempo máximo de 10 segundos para requisições
 * - withCredentials: Inclui cookies em todas as requisições
 */
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  timeout: 10000,
  withCredentials: true, // inclui cookies automaticamente
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Interceptor de requisição  
 * via via cookies
 */
api.interceptors.request.use(
  (config) => {
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
    //se o token estiver invalido ou expirado limpa os dados e redireciona
    if (error.response?.status === 401) {
      //remove dados do localstorage
      localStorage.removeItem('user');
      
      // Redireciona para login apenas no cliente
      if (typeof window !== 'undefined') {
        window.location.replace('/auth/login');
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
