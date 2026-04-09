'use client';

import { useState, FormEvent } from 'react';
import api from '@/services/api';
import { useTheme } from '@/contexts/ThemeContext';

interface EsqueceuSenhaProps {
  onVoltarClick: () => void;
}

export default function EsqueceuSenha({ onVoltarClick }: EsqueceuSenhaProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailEnviado, setEmailEnviado] = useState(false);
  const { theme } = useTheme();

  const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL;


  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
       const urlRecoverPassword = `${baseUrl}/auth/redefinir-senha`;
      
      const response = await api.post('/recoverPassword', {
        email,
        urlRecoverPassword,
      });

      setEmailEnviado(true);
    } catch (err: any) {
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
          <div className="text-5xl" style={{ color: theme.brand.primary }}>✓</div>
          <h2 className="text-xl font-bold transition-colors" style={{ color: theme.text.primary }}>
            Verifique sua caixa de entrada :)
          </h2>
          <p className="transition-colors" style={{ color: theme.text.secondary }}>
            Um link foi enviado para seu email:
          </p>
          <p className="font-medium text-lg transition-colors" style={{ color: theme.brand.primary }}>
            {email}
          </p>
        </div>

        <div className="text-center pt-10">
          <button
            type="button"
            onClick={onVoltarClick}
            className="text-lg hover:opacity-80 hover:underline transition-colors font-semibold"
            style={{ color: theme.brand.primary }}
          >
            Voltar a tela de Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 pt-11 space-y-7 transition-colors">
      <div className="space-y-0">
        <h2 className="text-lg font-regular transition-colors" style={{ color: theme.text.primary }}>
          Digite o seu e-mail para que você
        </h2>
        <h2 className="text-lg font-regular transition-colors" style={{ color: theme.text.primary }}>
          possa recuperar sua senha:
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label
            htmlFor="recover-email"
            className="text-base font-medium leading-none transition-colors"
            style={{ color: theme.text.primary }}
          >
            E-mail
          </label>
          <input
            id="recover-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="flex h-10 w-full rounded-md border px-3 py-4 text-sm focus:outline-none focus:ring-1 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
            style={{
              backgroundColor: theme.background.surface,
              borderColor: theme.border.secondary,
              color: theme.text.primary,
              caretColor: theme.brand.primary
            }}
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
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-base transition-all duration-200 shadow hover:shadow-md hover:-translate-y-px focus:outline-none focus:ring-1 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-6 w-full mt-5 font-medium"
          style={{
            backgroundColor: theme.buttonsExclusivos.btDark,
            color: '#fff',
          }}
        >
          {isLoading ? 'Enviando...' : 'Enviar Link de recuperação'}
        </button>

        <div className="text-center">
          <button
            type="button"
            onClick={onVoltarClick}
            className="text-sm hover:opacity-80 hover:underline transition-colors font-semibold"
            style={{ color: theme.brand.primary }}
          >
            Voltar a tela Inicial
          </button>
        </div>
      </form>
    </div>
  );
}
