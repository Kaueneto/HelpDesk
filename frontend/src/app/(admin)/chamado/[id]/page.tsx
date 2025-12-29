'use client';

import { use } from 'react';
import DetalhesChamado from '@/components/admin/DetalhesChamado';

export default function ChamadoPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  return <DetalhesChamado chamadoId={resolvedParams.id} />;
}
