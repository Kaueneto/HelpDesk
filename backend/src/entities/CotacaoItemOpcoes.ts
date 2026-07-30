import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn,  CreateDateColumn, UpdateDateColumn} from "typeorm";
import { CotacaoItens } from "./CotacaoItens";
import { CotacaoItemOpcaoClassificacoes } from "./CotacaoItemOpcaoClassificacoes";

@Entity({ name: "cotacao_item_opcoes", schema: "public" })
export class CotacaoItemOpcoes {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => CotacaoItens, (item) => item.opcoes, { nullable: false })
  @JoinColumn({ name: "cotacao_item_id" })
  cotacaoItem!: CotacaoItens;

  @Column({ type: "varchar", length: 255 })
  fornecedor!: string;

  @Column({ type: "varchar", length: 500 })
  descricao_produto!: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  link_produto!: string | null;

  @Column({ type: "integer" })
  quantidade!: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  valor_unitario!: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  valor_total!: number;

  @Column({ type: "varchar", length: 100, nullable: true })
  prazo_entrega!: string | null;

  @Column({ type: "text", nullable: true })
  observacao!: string | null;

  @Column({ type: "boolean", default: false })
  selecionado!: boolean;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;

  @OneToMany(
    () => CotacaoItemOpcaoClassificacoes,
    (classificacao) => classificacao.opcao,
    { cascade: ["remove"] }
  )
  classificacoes!: CotacaoItemOpcaoClassificacoes[];
}
