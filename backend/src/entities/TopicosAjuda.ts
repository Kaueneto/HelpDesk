import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
} from "typeorm";
import { Chamados } from "./Chamados";

@Entity("topicos_ajuda")
export class TopicosAjuda {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 100 })
  nome!: string;

  @Column({ default: true })
  ativo!: boolean;
  
  @OneToMany(() => Chamados, chamado => chamado.topicoAjuda)
  chamados!: Chamados[];
}
