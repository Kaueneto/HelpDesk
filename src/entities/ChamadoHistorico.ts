import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Chamados } from "./Chamados";
import { Users } from "./Users";

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

  @Column({ type: "varchar", length: 50 })
  status!: string;
}
