'use client';

import { useRouter, useParams } from 'next/navigation';
import SugestaoDetalhe from '@/components/sugestoes/SugestaoDetalhe';

export default function DetalhesSugestaoPage() {
  const router = useRouter();
  const params = useParams();
  const sugestaoId = parseInt(params.id as string);

  return (
    <SugestaoDetalhe
      sugestaoId={sugestaoId}
      onVoltar={() => router.back()}
    />
  );
}
