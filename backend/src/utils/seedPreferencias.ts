import { AppDataSource } from '../data-source';

/**
 * mudaça no gerenciamento de preferencias:
 * Garante que as preferências padrão existam no banco com IDs fixos.
 * Usa INSERT ... ON CONFLICT (id) DO NOTHING para ser idempotente.

 */
const PREFERENCIAS_PADRAO = [
  { id: 1, descricao: 'Receber email quando novos chamados forem abertos' },
  { id: 2, descricao: 'Receber email de confirmação ao abrir um chamado' },
  { id: 3, descricao: 'Receber email quando um chamado for concluído' },
  { id: 4, descricao: 'Receber email quando novas sugestões forem criadas' },
];

export async function seedPreferencias(): Promise<void> {
  try {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();

    for (const pref of PREFERENCIAS_PADRAO) {
      // Usa SQL raw para inserir com ID fixo e ignorar conflito
      await queryRunner.query(
        `INSERT INTO preferencias (id, descricao) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
        [pref.id, pref.descricao]
      );
    }

    // Resetar a sequence do PostgreSQL para não colidir com os IDs inseridos manualmente
    await queryRunner.query(
      `SELECT setval(pg_get_serial_sequence('preferencias', 'id'), GREATEST((SELECT MAX(id) FROM preferencias), 1))`
    );

    await queryRunner.release();
    console.log('✅ Preferências padrão verificadas/inseridas com sucesso');
  } catch (error) {
    console.warn('⚠️  seedPreferencias: erro ao verificar preferências padrão:', error);
  }
}
