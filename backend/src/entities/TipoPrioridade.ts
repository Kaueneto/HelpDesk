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

  @Column({ length: 7 })
  cor!: string; // Hexadecimal: #FF0000, #9900ffff, #0059ffff, #00FF00

  @Column({ type: "int" })
  ordem!: number; // 1, 2, 3, 4 - ordem de exibição no frontend

  @OneToMany(() => Chamados, chamado => chamado.tipoPrioridade)
  chamados!: Chamados[];
}
