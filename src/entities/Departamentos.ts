import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
} from "typeorm";
import { Chamados } from "./Chamados";

@Entity("departamentos")
export class Departamentos {
  @PrimaryGeneratedColumn({name: "id_departamento"})
  id!: number;

  @Column({ name: "nome", length: 100 })
  name!: string;

  @OneToMany(() => Chamados, chamado => chamado.departamento)
  chamados!: Chamados[];
}
