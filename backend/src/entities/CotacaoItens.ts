import {Entity,  PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, CreateDateColumn, UpdateDateColumn} from "typeorm";
import { Cotacoes } from "./Cotacoes";
import { CotacaoItemOpcoes } from "./CotacaoItemOpcoes";

@Entity({ name: "cotacao_itens", schema: "public" })
export class CotacaoItens {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Cotacoes, (cotacao) => cotacao.itens, { nullable: false })
  @JoinColumn({ name: "cotacao_id" })
  cotacao!: Cotacoes;

  @Column({ type: "varchar", length: 500 })
  descricao!: string;

  @Column({ type: "integer" })
  quantidade!: number;

  @Column({ type: "text", nullable: true })
  observacao!: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;

  @OneToMany(() => CotacaoItemOpcoes, (opcao) => opcao.cotacaoItem, {
    cascade: ["remove"],
  })
  opcoes!: CotacaoItemOpcoes[];
}
