import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from "typeorm";
import { Departamentos } from "./Departamentos";
import { Users } from "./Users";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanCard } from "./KanbanCard";

export type KanbanBoardType = 'dinamico' | 'custom';
export type KanbanAgrupamento = 'status' | 'prioridade' | 'topico' | 'responsavel' | 'departamento' | null;

@Entity({ name: "kanban_boards", schema: "public" })
@Index("idx_kanban_boards_departamento", ["departamento"])
@Index("idx_kanban_boards_tipo", ["tipo"])
@Index("idx_kanban_boards_ativo", ["ativo"])
export class KanbanBoard {
  @PrimaryGeneratedColumn({ name: "id" })
  id!: number;

  @Column({ name: "nome", type: "varchar", length: 150 })
  nome!: string;

  @Column({ name: "descricao", type: "text", nullable: true })
  descricao!: string | null;

  @ManyToOne(() => Departamentos, { eager: false })
  @JoinColumn({ name: "id_departamento" })
  departamento!: Departamentos;

  @Column({ name: "tipo", type: "varchar", length: 20 })
  tipo!: KanbanBoardType;

  @Column({ name: "agrupamento", type: "varchar", length: 50, nullable: true })
  agrupamento!: KanbanAgrupamento;

  @ManyToOne(() => Users, { eager: false })
  @JoinColumn({ name: "criado_por" })
  criadoPor!: Users;

  @CreateDateColumn({ name: "criado_em" })
  criadoEm!: Date;

  @UpdateDateColumn({ name: "atualizado_em" })
  atualizadoEm!: Date;

  @Column({ name: "ativo", type: "boolean", default: true })
  ativo!: boolean;

  // Relacionamentos
  @OneToMany(() => KanbanColumn, (col) => col.board, { cascade: true, eager: false })
  colunas!: KanbanColumn[];

  @OneToMany(() => KanbanCard, (card) => card.board, { cascade: true, eager: false })
  cards!: KanbanCard[];
}
