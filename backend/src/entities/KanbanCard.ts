import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from "typeorm";
import { KanbanBoard } from "./KanbanBoard";
import { KanbanColumn } from "./KanbanColumn";
import { Chamados } from "./Chamados";

@Entity({ name: "kanban_cards", schema: "public" })
@Index("idx_kanban_cards_board", ["board"])
@Index("idx_kanban_cards_column", ["column"])
@Index("idx_kanban_cards_chamado", ["chamado"])
@Index("idx_kanban_cards_posicao", ["column", "posicao"])
export class KanbanCard {
  @PrimaryGeneratedColumn({ name: "id" })
  id!: number;

  @ManyToOne(() => KanbanBoard, (board) => board.cards, { eager: false })
  @JoinColumn({ name: "board_id" })
  board!: KanbanBoard;

  @ManyToOne(() => KanbanColumn, (col) => col.cards, { eager: false, nullable: true })
  @JoinColumn({ name: "column_id" })
  column!: KanbanColumn | null;

  @ManyToOne(() => Chamados, { eager: false })
  @JoinColumn({ name: "id_chamado" })
  chamado!: Chamados;

  @Column({ name: "posicao", type: "numeric", precision: 15, scale: 4, default: 1000 })
  posicao!: number;

  @CreateDateColumn({ name: "criado_em" })
  criadoEm!: Date;

  @UpdateDateColumn({ name: "atualizado_em" })
  atualizadoEm!: Date;
}
