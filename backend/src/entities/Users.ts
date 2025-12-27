import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { Chamados } from "./Chamados";
import { Roles } from "./Roles";

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

  @ManyToOne(() => Roles)
  @JoinColumn({ name: "role_id" })
  role!: Roles;

  @Column({ default: true })
  ativo!: boolean;

  @Column({ name: "recoverPassword", type: "varchar", nullable: true })
  recoverPassword!: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;

  // chamados abertos pelo usuario
  @OneToMany(() => Chamados, chamado => chamado.usuario)
  chamados!: Chamados[];

  // chamados que o usuario atende
  @OneToMany(() => Chamados, chamado => chamado.userResponsavel)
  chamadosResponsavel!: Chamados[];

  // chamados que o usuario fechou
  @OneToMany(() => Chamados, chamado => chamado.userFechamento)
  chamadosFechados!: Chamados[];
}
