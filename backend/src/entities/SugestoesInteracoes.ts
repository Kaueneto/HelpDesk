import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Sugestoes } from './Sugestoes';
import { Users } from './Users';

@Entity('sugestoes_interacoes')
export class SugestoesInteracoes {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'sugestao_id', type: 'integer' })
  sugestaoId!: number;

  @Column({ name: 'usuario_id', type: 'integer' })
  usuarioId!: number;

  @Column({ type: 'text' })
  mensagem!: string;

  @Column({
    type: 'enum',
    enum: ['comentario', 'resposta_admin', 'mudanca_status'],
    default: 'comentario',
  })
  tipo!: 'comentario' | 'resposta_admin' | 'mudanca_status';

  @Column({ type: 'varchar', length: 100, nullable: true })
  status_anterior?: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  status_novo?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  criadoEm!: Date;

  // relações
  @ManyToOne(() => Sugestoes, (sugestao) => sugestao.interacoes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sugestao_id' })
  sugestao!: Sugestoes;

  @ManyToOne(() => Users, { eager: true })
  @JoinColumn({ name: 'usuario_id' })
  usuario!: Users;
}
