import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from "typeorm";
import { Chamados } from "./Chamados";
import { Users } from "./Users";

@Entity("chamados_mensagens")
export class ChamadoMensagens {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Users)
  @JoinColumn({ name: "user_id" })
  usuario!: Users;

  @ManyToOne(() => Chamados)
  @JoinColumn({ name: "chamado_id" })
  chamado!: Chamados;

  @Column({ type: "text" })
  mensagem!: string;

  @CreateDateColumn({ name: "data_envio", type: "timestamp" })
  dataEnvio!: Date;
}
