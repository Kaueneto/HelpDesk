'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import RedefinirSenha from '../RedefinirSenha';
import api from '@/services/api';

export default function RedefinirSenhaPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [error, setError] = useState('');

  const email = searchParams.get('email');
  const token = searchParams.get('key');

  useEffect(() => {
    const validateToken = async () => {
      if (!email || !token) {
        setError('Link inválido. Parâmetros ausentes.');
        setIsValidating(false);
        return;
      }

      try {
        console.log('Validando token para:', email);
        
        const response = await api.post('/validate-recover-password', {
          email,
          recoverPassword: token,
        });

        console.log('Token válido:', response.data);
        setIsValid(true);
      } catch (err: any) {
        console.error('Erro ao validar token:', err);
        const mensagem = err.response?.data?.mensagem;
        
        if (mensagem === 'a chave de recuperação é inválida') {
          setError('Link de recuperação inválido ou expirado.');
        } else {
          setError(mensagem || 'Erro ao validar link de recuperação.');
        }
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, [email, token]);

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-700">Validando link de recuperação...</p>
        </div>
      </div>
    );
  }

  if (!isValid || error) {
    return (
      <div className="min-h-screen flex items-start justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="mt-24 w-full max-w-md px-4">
          <h1 className="text-xl font-bold text-center text-gray-900 mb-3 font-mono">
            HelpDesk
          </h1>

          <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-6">
            <div className="text-center space-y-4">
              <div className="text-5xl text-red-600">✕</div>
              <h2 className="text-xl font-bold text-gray-900">
                Link Inválido
              </h2>
              <p className="text-gray-700">
                {error || 'O link de recuperação é inválido ou já foi utilizado.'}
              </p>
              <button
                onClick={() => router.push('/auth/login')}
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 bg-blue-600 text-white shadow hover:bg-blue-700 hover:shadow-md hover:-translate-y-px focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 h-10 px-4 py-2 w-full"
              >
                Voltar para o Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <RedefinirSenha email={email!} token={token!} />;
}
