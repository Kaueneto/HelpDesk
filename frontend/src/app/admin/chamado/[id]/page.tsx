'use client';

import { useParams } from 'next/navigation';
import DetalhesChamado from '@/components/admin/DetalhesChamado';

export default function ChamadoPage() {
  const params = useParams();
  const chamadoId = params.id as string;

  return <DetalhesChamado chamadoId={chamadoId} />;
}
