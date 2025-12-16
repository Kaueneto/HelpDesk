import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
} from "typeorm";
import { Chamados } from "./Chamados";

@Entity("status_chamado", { schema: "public" })
export class StatusChamado {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 50 })
  nome!: string; // ABERTO | EM ATENDIMENTO | ENCERRADO

  @OneToMany(() => Chamados, chamado => chamado.status)
  chamados!: Chamados[];
}
