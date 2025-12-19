import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from "typeorm";
import { Chamados } from "./Chamados";

@Entity("ChamadoAnexos")
export class ChamadoAnexos {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Chamados, chamado => chamado.anexos)
  @JoinColumn({ name: "chamadoId" })
  chamado!: Chamados;

  @Column()
  chamadoId!: number;

  @Column({ length: 255 })
  filename!: string;

  @Column({ length: 500 })
  url!: string;

  @CreateDateColumn()
  criadoEm!: Date;
}
