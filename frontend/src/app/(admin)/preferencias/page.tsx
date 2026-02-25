import GerenciarPreferencias from '@/components/admin/GerenciarPreferencias';

export const metadata = {
  title: 'Preferências | Central de Chamados',
  description: 'Gerenciar preferências do usuário',
};

export default function PreferenciasPage() {
  return <GerenciarPreferencias />;
}