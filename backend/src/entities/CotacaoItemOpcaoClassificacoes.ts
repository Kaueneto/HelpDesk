import {Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";
import { CotacaoItemOpcoes } from "./CotacaoItemOpcoes";

export enum TipoClassificacao {
  ESCOLHIDO = "ESCOLHIDO",
  RECOMENDADO = "RECOMENDADO",
  MELHOR_CUSTO_BENEFICIO = "MELHOR_CUSTO_BENEFICIO",
  MENOR_PRECO = "MENOR_PRECO",
}

@Entity({
  name: "cotacao_item_opcao_classificacoes",
  schema: "public",
})
export class CotacaoItemOpcaoClassificacoes {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => CotacaoItemOpcoes, (opcao) => opcao.classificacoes, {
    nullable: false,
  })
  @JoinColumn({ name: "cotacao_item_opcao_id" })
  opcao!: CotacaoItemOpcoes;

  @Column({
    type: "enum",
    enum: TipoClassificacao,
  })
  tipo!: TipoClassificacao;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
