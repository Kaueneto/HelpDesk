'use client';

import { useState, FormEvent } from 'react';
import api from '@/services/api';

interface EsqueceuSenhaProps {
  onVoltarClick: () => void;
}

export default function EsqueceuSenha({ onVoltarClick }: EsqueceuSenhaProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailEnviado, setEmailEnviado] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const urlRecoverPassword = `${window.location.origin}/auth/redefinir-senha`;
      
      console.log('Enviando requisição de recuperação para:', email);
      console.log('URL de recuperação:', urlRecoverPassword);
      
      const response = await api.post('/recoverPassword', {
        email,
        urlRecoverPassword,
      });

      console.log('Resposta da API:', response.data);
      setEmailEnviado(true);
    } catch (err: any) {
      console.error('Erro completo:', err);
      console.error('Resposta do erro:', err.response);
      console.error('Data do erro:', err.response?.data);
      
      const mensagem = err.response?.data?.mensagem;
      
      if (mensagem === 'Usuário não encontrado') {
        setError('E-mail não encontrado. Verifique o email e tente novamente.');
      } else {
        setError(mensagem || 'Erro ao enviar link de recuperação. Tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (emailEnviado) {
    return (
      <div className="p-6 pt-8 space-y-6">
        <div className="text-center space-y-4">
          <div className="text-5xl">✓</div>
          <h2 className="text-xl font-bold text-gray-800">
            Verifique sua caixa de entrada :)
          </h2>
          <p className="text-gray-700">
            Um link foi enviado para seu email:
          </p>
          <p className="text-blue-600 font-medium text-lg">
            {email}
          </p>
        </div>

        <div className="text-center pt-10">
          <button
            type="button"
            onClick={onVoltarClick}
            className="text-lg text-blue-600 hover:text-blue-700 hover:underline"
          >
            Voltar a tela de Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 pt-11 space-y-7">
      <div className="space-y-0">
        <h2 className="text-lg font-regular text-gray-900 ">
          Digite o seu e-mail para que você
        </h2>
        <h2 className="text-lg font-regular text-gray-900 ">
          possa recuperar sua senha:
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label
            htmlFor="recover-email"
            className="text-base font-medium leading-none text-gray-700"
          >
            E-mail
          </label>
          <input
            id="recover-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="flex h-10 w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="DigiteSeuEmail@email.com"
            disabled={isLoading}
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-6 rounded-md text-sm font-medium">
            {error}
          </div>
        )}
  
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-base transition-all duration-200 bg-blue-600 text-white shadow hover:bg-blue-700 hover:shadow-md hover:-translate-y-px focus:outline-none focus:ring-1 focus:ring-blue-500 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-6 w-full mt-5"
        >
          {isLoading ? 'Enviando...' : 'Enviar Link de recuperação'}
        </button>

        <div className="text-center">
          <button
            type="button"
            onClick={onVoltarClick}
            className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
          >
            Voltar a tela Inicial
          </button>
        </div>
      </form>
    </div>
  );
}
