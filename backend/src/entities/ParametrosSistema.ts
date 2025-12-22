import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "parametros_sistema", schema: "public" })
export class ParametrosSistema {

  @PrimaryGeneratedColumn({ name: "id" })
  id!: number;

  @Column({ name: "horas_para_atraso", type: "int", default: 24 })
  horasParaAtraso!: number;

  @UpdateDateColumn({
    name: "data_atualizacao",
    type: "timestamptz",
  })
  dataAtualizacao!: Date;

  @Column({ name: "usuario_atualizacao_id", type: "int", nullable: true })
  usuarioAtualizacaoId!: number | null;
}
