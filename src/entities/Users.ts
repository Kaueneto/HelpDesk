import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
} from "typeorm";
import { Chamados } from "./Chamados";

@Entity("users")
export class Users {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: "name", length: 100 })
  name!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  password!: string;

  @Column({ name: "role_id" })
  roleId!: number;

  @Column()
  ativo!: boolean;

  @Column({ name: "created_at", type: "timestamp" })
  createdAt!: Date;

  @Column({ name: "updated_at", type: "timestamp" })
  updatedAt!: Date;

  // Chamados abertos pelo usuário
  @OneToMany(() => Chamados, chamado => chamado.usuario)
  chamados!: Chamados[];

  // Chamados que o usuário atende
  @OneToMany(() => Chamados, chamado => chamado.userResponsavel)
  chamadosResponsavel!: Chamados[];

  // Chamados que o usuário fechou
  @OneToMany(() => Chamados, chamado => chamado.userFechamento)
  chamadosFechados!: Chamados[];
}
