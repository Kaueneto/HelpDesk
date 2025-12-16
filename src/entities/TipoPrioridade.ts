import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
} from "typeorm";
import { Chamados } from "./Chamados";

@Entity("tipo_prioridade")
export class TipoPrioridade {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 50 })
  nome!: string; // Urgente | Alto | Médio | Baixo

  @OneToMany(() => Chamados, chamado => chamado.tipoPrioridade)
  chamados!: Chamados[];
}
