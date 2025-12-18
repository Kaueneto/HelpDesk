import { redirect } from 'next/navigation';

/**
 * Página inicial - Redireciona para o login
 */
export default function Home() {
  redirect('/auth/login');
}
