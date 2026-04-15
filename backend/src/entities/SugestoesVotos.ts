import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { Sugestoes } from './Sugestoes';
import { Users } from './Users';

@Entity('sugestoes_votos')
@Unique(['sugestaoId', 'usuarioId'])
export class SugestoesVotos {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'sugestao_id', type: 'integer' })
  sugestaoId!: number;

  @Column({ name: 'usuario_id', type: 'integer' })
  usuarioId!: number;

  @CreateDateColumn({ name: 'created_at' })
  criadoEm!: Date;

  // relações
  @ManyToOne(() => Sugestoes, (sugestao) => sugestao.votos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sugestao_id' })
  sugestao!: Sugestoes;

  @ManyToOne(() => Users, { eager: true })
  @JoinColumn({ name: 'usuario_id' })
  usuario!: Users;
}
