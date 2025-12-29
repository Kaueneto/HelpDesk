import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from "typeorm";
import { Chamados } from "./Chamados";
import { ChamadoMensagens } from "./ChamadoMensagens";

@Entity("ChamadoAnexos")
export class ChamadoAnexos {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Chamados, chamado => chamado.anexos)
  @JoinColumn({ name: "chamadoId" })
  chamado!: Chamados;

  @Column()
  chamadoId!: number;

  @ManyToOne(() => ChamadoMensagens, mensagem => mensagem.anexos, { nullable: true })
  @JoinColumn({ name: "mensagemId" })
  mensagem?: ChamadoMensagens;

  @Column({ nullable: true })
  mensagemId?: number;

  @Column({ length: 255 })
  filename!: string;

  @Column({ length: 500 })
  url!: string;

  @CreateDateColumn()
  criadoEm!: Date;
}
