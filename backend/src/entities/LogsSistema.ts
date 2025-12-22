import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from "typeorm";

@Entity({ name: "logs", schema: "public" })
export class LogsSistema {

  @PrimaryGeneratedColumn({ name: "id" })
  id!: number;

  @Column({ name: "tipoOperacao", type: "varchar", length: 100 })
  tipoOperacao!: string;

  @Column({ name: "entidade", type: "varchar", length: 100 })
  entidade!: string;

  @Column({ name: "campoAlterado", type: "varchar", length: 100, nullable: true })
  campoAlterado!: string | null;

  @Column({ name: "valorAnterior", type: "text", nullable: true })
  valorAnterior!: string | null;

  @Column({ name: "valorNovo", type: "text", nullable: true })
  valorNovo!: string | null;

  @Column({ name: "descricao", type: "text" })
  descricao!: string;

  @Column({ name: "usuario_id", type: "int", nullable: true })
  usuarioId!: number | null;

  @Column({ name: "usuario_nome", type: "varchar", length: 255, nullable: true })
  usuarioNome!: string | null;

  @CreateDateColumn({
    name: "data_alteracao",
    type: "timestamptz",
  })
  dataAlteracao!: Date;

  @Column({ name: "registro_id", type: "int", nullable: true })
  registroId!: number | null;
}
