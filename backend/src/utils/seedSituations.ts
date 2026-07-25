import { AppDataSource } from '../data-source';

/**
 * Garante que os status de usuário padrão existam no banco.
 * IDs fixos: 1=ativo, 2=inativo, 3=pendente
 */
const SITUATIONS_PADRAO = [
  { id: 1, nomeSituacao: 'ativo' },
  { id: 2, nomeSituacao: 'inativo' },
  { id: 3, nomeSituacao: 'pendente' },
];

export async function seedSituations(): Promise<void> {
  try {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();

    for (const s of SITUATIONS_PADRAO) {
      await queryRunner.query(
        `INSERT INTO "SituationsUsers" (id, "nomeSituacao") VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
        [s.id, s.nomeSituacao]
      );
    }

    await queryRunner.query(
      `SELECT setval(pg_get_serial_sequence('"SituationsUsers"', 'id'), GREATEST((SELECT MAX(id) FROM "SituationsUsers"), 1))`
    );

    await queryRunner.release();
    console.log('✅ Situations de usuário verificadas/inseridas com sucesso');
  } catch (error) {
    console.warn('⚠️  seedSituations: erro:', error);
  }
}
