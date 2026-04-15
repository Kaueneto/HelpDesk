import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Users } from './Users';
import { Departamentos } from './Departamentos';
import { SugestoesInteracoes } from './SugestoesInteracoes';
import { SugestoesVotos } from './SugestoesVotos';

@Entity('sugestoes')
export class Sugestoes {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 255 })
  titulo!: string;

  @Column({ type: 'text' })
  descricao!: string;

  @Column({ name: 'usuario_criacao_id', type: 'integer' })
  usuarioCriacaoId!: number;

  @Column({ name: 'departamento_id', type: 'integer', nullable: true })
  departamentoId!: number | null;

  @Column({ type: 'enum', enum: ['departamento', 'global'], default: 'departamento' })
  escopo!: 'departamento' | 'global';

  @Column({ name: 'privado', type: 'boolean', default: false })
  privado!: boolean;

  @Column({
    type: 'enum',
    enum: ['aberta', 'em_analise', 'planejada', 'em_desenvolvimento', 'concluida', 'recusada'],
    default: 'aberta',
  })
  status!: 'aberta' | 'em_analise' | 'planejada' | 'em_desenvolvimento' | 'concluida' | 'recusada';

  @CreateDateColumn({ name: 'created_at' })
  criadoEm!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  atualizadoEm!: Date;

  // relações
  @ManyToOne(() => Users, { eager: true })
  @JoinColumn({ name: 'usuario_criacao_id' })
  usuarioCriacao!: Users;

  @ManyToOne(() => Departamentos, { eager: true, nullable: true })
  @JoinColumn({ name: 'departamento_id' })
  departamento!: Departamentos | null;

  @OneToMany(() => SugestoesVotos, (voto) => voto.sugestao, { cascade: true })
  votos!: SugestoesVotos[];

  @OneToMany(() => SugestoesInteracoes, (interacao) => interacao.sugestao, { cascade: true })
  interacoes!: SugestoesInteracoes[];
}
