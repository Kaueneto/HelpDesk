'use client';

import { useState, useCallback } from 'react';
import api from '@/services/api';
import toast from 'react-hot-toast';

interface UseAvatarUploadReturn {
  uploading: boolean;
  uploadAvatar: (file: File, userId: number) => Promise<string | null>;
  deleteAvatar: (userId: number) => Promise<boolean>;
}

export function useAvatarUpload(): UseAvatarUploadReturn {
  const [uploading, setUploading] = useState(false);

  // upload do avatar/foto de perfil
  const uploadAvatar = useCallback(async (file: File, userId: number): Promise<string | null> => {
    try {
      setUploading(true);

      // validar o tipo de arquivo
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor, selecione um arquivo de imagem');
        return null;
      }

      // validar tamanho (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('A imagem deve ter no máximo 5MB');
        return null;
      }

      // criar FormData para enviar o arquivo
      const formData = new FormData();
      formData.append('avatar', file);

      // enviar para o backend
      const response = await api.post(`/users/upload-avatar/${userId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.data?.signedUrl) {
        toast.error('Erro ao fazer upload do avatar');
        return null;
      }

      toast.success('Avatar atualizado com sucesso!');
      // retorna a signed URL para exibir a imagem
      return response.data.signedUrl;
    } catch (error: any) {
      console.error('Erro no upload:', error);
      const mensagem = error.response?.data?.mensagem || 'Erro ao fazer upload do avatar';
      toast.error(mensagem);
      return null;
    } finally {
      setUploading(false);
    }
  }, []);

  // deletar avatar
  const deleteAvatar = useCallback(async (userId: number): Promise<boolean> => {
    try {
      await api.delete(`/users/delete-avatar/${userId}`);
      return true;
    } catch (error: any) {
      console.error('Erro ao deletar avatar:', error);
      return false;
    }
  }, []);

  return {
    uploading,
    uploadAvatar,
    deleteAvatar,
  };
}
