'use client';

import { useRouter } from 'next/navigation';
import SugestoesList from '@/components/sugestoes/SugestoesList';

export default function SugestoesPage() {
  const router = useRouter();

  return (
    <SugestoesList
      onVerDetalhe={(id) => router.push(`/sugestoes/${id}`)}
    />
  );
}
