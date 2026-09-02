import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from "typeorm";
import { TopicosAjuda } from "./TopicosAjuda";
import { Users } from "./Users";
import { EmailTopicoDestinatario } from "./EmailTopicoDestinatario";

@Entity("email_topico_config")
export class EmailTopicoConfig {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => TopicosAjuda, { nullable: false })
  @JoinColumn({ name: "topico_id" })
  topico!: TopicosAjuda;

  @Column({ name: "topico_id", type: "int" })
  topicoId!: number;

  @Column({ default: true })
  ativo!: boolean;

  @Column({ name: "criado_por", type: "int", nullable: true })
  criadoPor!: number | null;

  @Column({ name: "criado_em", type: "timestamptz", default: () => "NOW()" })
  criadoEm!: Date;

  @Column({ name: "editado_por", type: "int", nullable: true })
  editadoPor!: number | null;

  @Column({ name: "editado_em", type: "timestamptz", nullable: true })
  editadoEm!: Date | null;

  @ManyToOne(() => Users, { nullable: true })
  @JoinColumn({ name: "criado_por" })
  usuarioCriador!: Users | null;

  @ManyToOne(() => Users, { nullable: true })
  @JoinColumn({ name: "editado_por" })
  usuarioEditor!: Users | null;

  @OneToMany(() => EmailTopicoDestinatario, (dest) => dest.config, {
    cascade: true,
    eager: true,
  })
  destinatarios!: EmailTopicoDestinatario[];
}
