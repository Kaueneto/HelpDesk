import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { EmailTopicoConfig } from "./EmailTopicoConfig";

@Entity("email_topico_destinatarios")
export class EmailTopicoDestinatario {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => EmailTopicoConfig, (config) => config.destinatarios, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "config_id" })
  config!: EmailTopicoConfig;

  @Column({ name: "config_id", type: "int" })
  configId!: number;

  @Column({ length: 255 })
  email!: string;

  /** 'to' = principal, 'cc' = cópia, 'bcc' = cópia oculta */
  @Column({ length: 3 })
  tipo!: "to" | "cc" | "bcc";
}
