'use client';

import { useState, FormEvent } from 'react';
import api from '@/services/api';
import { validatePassword, getPasswordStrengthColor, getPasswordStrengthText } from '@/utils/passwordValidation';
import { FiEye, FiEyeOff } from "react-icons/fi";
interface CadastrarseProps {
  onLoginClick: () => void;
  onSuccess: () => void;
}

export default function Cadastrarse({ onLoginClick, onSuccess }: CadastrarseProps) {
  const [cadastroName, setCadastroName] = useState('');
  const [cadastroEmail, setCadastroEmail] = useState('');
  const [cadastroPassword, setCadastroPassword] = useState('');
  const [cadastroConfirmPassword, setCadastroConfirmPassword] = useState('');
  const [cadastroError, setCadastroError] = useState('');
  const [cadastroLoading, setCadastroLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setCadastroError('');

    if (cadastroPassword !== cadastroConfirmPassword) {
      setCadastroError('As senhas não coincidem.');
      return;
    }

    // validar força da senha
    const passwordValidation = validatePassword(cadastroPassword);
    if (!passwordValidation.isValid) {
      setCadastroError(passwordValidation.errors.join('\n'));
      return;
    }

    setCadastroLoading(true);

    try {
      await api.post('/users', {
        name: cadastroName,
        email: cadastroEmail,
        password: cadastroPassword,
        roleId: 2,
        ativo: true,
      });

      setCadastroName('');
      setCadastroEmail('');
      setCadastroPassword('');
      setCadastroConfirmPassword('');
      
      alert('Cadastro realizado com sucesso! Faça login para continuar.');
      onSuccess();
    } catch (err: any) {
      setCadastroError(err.response?.data?.mensagem || 'Erro ao criar conta. Tente novamente.');
    } finally {
      setCadastroLoading(false);
    }
  };

  return (
    <div className="p-6 pt-6 space-y-4 mb-20">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label
            htmlFor="register-name"
            className="text-sm font-medium leading-none text-gray-700"
          >
            Nome 
          </label>
          <input
            id="register-name"
            type="text"
            value={cadastroName}
            onChange={(e) => setCadastroName(e.target.value)}
            required
            minLength={3}
            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Nome"
            disabled={cadastroLoading}
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="register-email"
            className="text-sm font-medium leading-none text-gray-700"
          >
            E-mail
          </label>
          <input
            id="register-email"
            type="email"
            value={cadastroEmail}
            onChange={(e) => setCadastroEmail(e.target.value)}
            required
            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500  disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="seuemail@email.com"
            disabled={cadastroLoading}
          />
        </div>

<div className="space-y-1">
  <label
    htmlFor="register-password"
    className="text-sm font-medium leading-none text-gray-700"
  >
    Senha
  </label>

  <div className="relative">
    <input
      id="register-password"
      type={showPassword ? "text" : "password"}
      value={cadastroPassword}
      onChange={(e) => setCadastroPassword(e.target.value)}
      required
      minLength={6}
      className={`flex h-10 w-full rounded-md border ${getPasswordStrengthColor(cadastroPassword)} bg-white px-3 py-2 pr-10 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50`}
      placeholder="Digite uma Senha forte"
      disabled={cadastroLoading}
    />

    <button
      type="button"
      onClick={() => setShowPassword(!showPassword)}
      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
    >
      {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
    </button>
  </div>

  {cadastroPassword && (
    <div
      className={`text-xs mt-1 ${
        getPasswordStrengthColor(cadastroPassword) === 'border-green-500'
          ? 'text-green-600'
          : getPasswordStrengthColor(cadastroPassword) === 'border-yellow-500'
          ? 'text-yellow-600'
          : 'text-red-600'
      }`}
    >
      {getPasswordStrengthText(cadastroPassword)}
    </div>
  )}
</div>

        <div className="space-y-1">
          <label
            htmlFor="register-confirm"
            className="text-sm font-medium leading-none text-gray-700"
          >
            Confirmar senha
          </label>
        <div className="relative">
          <input
            id="register-confirm"
            type={showConfirmPassword ? "text" : "password"}
            value={cadastroConfirmPassword}
            onChange={(e) => setCadastroConfirmPassword(e.target.value)}
            required
            minLength={6}
            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500  disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Repita sua senha"
            disabled={cadastroLoading}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
          >
            {showConfirmPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
          </button>
        </div>
        </div>
        {cadastroError && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-md text-sm">
            {cadastroError}
          </div>
        )}

        <button
          type="submit"
          disabled={cadastroLoading}
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 bg-[#001960] text-white shadow hover:bg-blue-700 hover:shadow-md hover:-translate-y-px focus:outline-none focus:ring-1 focus:ring-blue-500  disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2 w-full"
        >
          {cadastroLoading ? 'Ccadastrando...' : 'Cadastrar'}
        </button>

        <div className="text-center text-sm text-gray-600">
          Já tem uma conta?{' '}
          <button
            type="button"
            onClick={onLoginClick}
            className="text-[#001960] hover:text-blue-700 hover:underline font-medium"
          >
            Faça login
          </button>
        </div>
      </form>
    </div>
  );
}
