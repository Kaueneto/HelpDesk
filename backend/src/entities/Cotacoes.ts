import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, CreateDateColumn, UpdateDateColumn} from "typeorm";
import { Chamados } from "./Chamados";
import { Users } from "./Users";
import { CotacaoItens } from "./CotacaoItens";

export enum StatusCotacao {
  EM_ANDAMENTO = "EM_ANDAMENTO",
  AGUARDANDO_APROVACAO = "AGUARDANDO_APROVACAO",
  APROVADA = "APROVADA",
  EM_COMPRA = "EM_COMPRA",
  FINALIZADA = "FINALIZADA",
  CANCELADA = "CANCELADA",
}

@Entity({ name: "cotacoes", schema: "public" })
export class Cotacoes {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Chamados, { nullable: false })
  @JoinColumn({ name: "chamado_id" })
  chamado!: Chamados;

  @Column({
    type: "enum",
    enum: StatusCotacao,
    default: StatusCotacao.EM_ANDAMENTO,
  })
  status!: StatusCotacao;

  @ManyToOne(() => Users, { nullable: false })
  @JoinColumn({ name: "criado_por" })
  criadoPor!: Users;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;

  @OneToMany(() => CotacaoItens, (item) => item.cotacao, { cascade: ["remove"] })
  itens!: CotacaoItens[];
}
