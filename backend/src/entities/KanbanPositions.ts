import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { Chamados } from "./Chamados";
import { Users } from "./Users";

@Entity({ name: "kanban_positions", schema: "public" })
export class KanbanPositions {
  @PrimaryGeneratedColumn({ name: "id" })
  id!: number;

  @Column({ name: "id_chamado" })
  idChamado!: number;

  @Column({ name: "group_by", type: "varchar", length: 50 })
  groupBy!: string; // 'status', 'prioridade', 'responsavel', 'departamento', 'topico'

  @Column({ name: "column_value", type: "varchar", length: 100, nullable: true })
  columnValue!: string | null; 

  @Column({ name: "position_index", type: "integer", default: 1000 })
  position!: number; // posicao usando intervalos grandes (1000, 2000, 3000...)

  @Column({ name: "updated_by", nullable: true })
  updatedBy!: number | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;

  // relacionamentos
  @ManyToOne(() => Chamados, { eager: false })
  @JoinColumn({ name: "id_chamado", referencedColumnName: "id" })
  chamado!: Chamados;

  @ManyToOne(() => Users, { eager: false, nullable: true })
  @JoinColumn({ name: "updated_by", referencedColumnName: "id" })
  userUpdated!: Users | null;
}