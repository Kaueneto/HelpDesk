import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
} from "typeorm";
import { Chamados } from "./Chamados";
import { Users } from "./Users";
import { ChamadoAnexos } from "./ChamadoAnexos";

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

  @OneToMany(() => ChamadoAnexos, anexo => anexo.mensagem)
  anexos?: ChamadoAnexos[];

  @CreateDateColumn({ name: "data_envio", type: "timestamp" })
  dataEnvio!: Date;
}
