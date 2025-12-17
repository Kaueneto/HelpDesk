import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Chamados } from "./Chamados";
import { Users } from "./Users";
import { StatusChamado } from "./StatusChamado";

@Entity("chamado_historico")
export class ChamadoHistorico {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Chamados)
  @JoinColumn({ name: "chamado_id" })
  chamado!: Chamados;

  @Column({ type: "varchar", length: 255 })
  acao!: string;

  @ManyToOne(() => Users)
  @JoinColumn({ name: "usuario_id" })
  usuario!: Users;

  @Column({ name: "data_mov", type: "date" })
  dataMov!: Date;

  @ManyToOne(() => StatusChamado, { nullable: true })
  @JoinColumn({ name: "status_anterior_id" })
  statusAnterior!: StatusChamado;

  @ManyToOne(() => StatusChamado, { nullable: true })
  @JoinColumn({ name: "status_novo_id" })
  statusNovo!: StatusChamado;
}
