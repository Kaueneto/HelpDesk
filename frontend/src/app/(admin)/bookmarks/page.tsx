'use client';

import { useRouter } from 'next/navigation';

export default function BookmarksPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Bookmarks</h1>
        <p className="text-gray-600 mb-6">
          Esta funcionalidade está em desenvolvimento e será implementada em breve.
        </p>
        <button
          onClick={() => router.back()}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          Voltar
        </button>
      </div>
    </div>
  );
}