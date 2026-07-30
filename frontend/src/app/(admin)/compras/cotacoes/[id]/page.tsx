'use client';

import { use } from 'react';
import DetalhesCotacao from '@/components/admin/DetalhesCotacao';

export default function DetalhesCotacaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <DetalhesCotacao cotacaoId={id} />;
}
