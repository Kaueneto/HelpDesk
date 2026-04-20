import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Chamados } from "./Chamados";
import { Users } from "./Users";

@Entity("topicos_ajuda")
export class TopicosAjuda {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "int" })
  codigo!: number;

  @Column({ length: 100 })
  nome!: string;

  @Column({ default: true })
  ativo!: boolean;

  @Column({ name: "criado_por", type: "int", nullable: true })
  criadoPor!: number | null;

  @Column({ name: "criado_em", type: "timestamp", nullable: true })
  criadoEm!: Date | null;

  @Column({ name: "editado_por", type: "int", nullable: true })
  editadoPor!: number | null;

  @Column({ name: "editado_em", type: "timestamp", nullable: true })
  editadoEm!: Date | null;

  @ManyToOne(() => Users, { nullable: true })
  @JoinColumn({ name: "criado_por" })
  usuarioCriador!: Users | null;

  @ManyToOne(() => Users, { nullable: true })
  @JoinColumn({ name: "editado_por" })
  usuarioEditor!: Users | null;
  
  @OneToMany(() => Chamados, chamado => chamado.topicoAjuda)
  chamados!: Chamados[];
}
