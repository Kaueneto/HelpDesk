import axios from 'axios';


const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  timeout: 10000,
  withCredentials: true, // inclui cookies automaticamente
  headers: {
    'Content-Type': 'application/json',
  },
});


if (typeof window !== 'undefined') {
  console.log(' API URL:', api.defaults.baseURL);
}

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
