import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity("SituationsUsers")
export class SituationsUsers {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  nomeSituacao!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
