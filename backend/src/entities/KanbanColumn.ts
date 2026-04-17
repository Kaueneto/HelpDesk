import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from "typeorm";
import { KanbanBoard } from "./KanbanBoard";
import { KanbanCard } from "./KanbanCard";

@Entity({ name: "kanban_columns", schema: "public" })
@Index("idx_kanban_columns_board", ["board"])
@Index("idx_kanban_columns_ordem", ["board", "ordem"])
export class KanbanColumn {
  @PrimaryGeneratedColumn({ name: "id" })
  id!: number;

  @ManyToOne(() => KanbanBoard, (board) => board.colunas, { eager: false })
  @JoinColumn({ name: "board_id" })
  board!: KanbanBoard;

  @Column({ name: "nome", type: "varchar", length: 100 })
  nome!: string;

  @Column({ name: "ordem", type: "integer", default: 0 })
  ordem!: number;

  @CreateDateColumn({ name: "criado_em" })
  criadoEm!: Date;

  @UpdateDateColumn({ name: "atualizado_em" })
  atualizadoEm!: Date;

  // Relacionamentos
  @OneToMany(() => KanbanCard, (card) => card.column, { cascade: true, eager: false })
  cards!: KanbanCard[];
}
