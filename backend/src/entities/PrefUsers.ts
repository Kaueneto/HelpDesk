import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from "typeorm";
import { Users } from "./Users";
import { Preferences } from "./Preferences";

@Entity("pref_usuarios")
@Index(["user_id", "preferencia_id"], { unique: true })
export class PrefUsers {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  user_id!: number;
  
  @Column()
  preferencia_id!: number;

  @ManyToOne(() => Users, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: Users;

  @ManyToOne(() => Preferences, preference => preference.prefUsers, { onDelete: "CASCADE" })
  @JoinColumn({ name: "preferencia_id" })
  preferencia!: Preferences;
}
