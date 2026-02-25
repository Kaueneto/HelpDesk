import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
import { PrefUsers } from "./PrefUsers";


@Entity("preferencias")
export class Preferences {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  descricao!: string;

  @OneToMany(() => PrefUsers, prefUser => prefUser.preferencia)
  prefUsers!: PrefUsers[];
}
