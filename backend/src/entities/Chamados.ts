import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { Users } from "./Users";
import { TipoPrioridade } from "./TipoPrioridade";
import { TopicosAjuda } from "./TopicosAjuda";
import { Departamentos } from "./Departamentos";
import { StatusChamado } from "./StatusChamado";
import { ChamadoAnexos } from "./ChamadoAnexos";

@Entity({ name: "chamados", schema: "public" })
export class Chamados {

  @PrimaryGeneratedColumn({ name: "id_chamado" })
  id!: number;

  // Usuário que abriu o chamado
  @ManyToOne(() => Users, user => user.chamados)
  @JoinColumn({ name: "id_user" })
  usuario!: Users;

  @Column()
  ramal!: number;

  @Column({ name: "numero_chamado", unique: true })
  numeroChamado!: number;

  // data de abertura (automatica)
  @CreateDateColumn({
    name: "data_abertura",
    type: "timestamptz",
  })
  dataAbertura!: Date;

  // data de ultima atualizacao (automatica)
  @UpdateDateColumn({
    name: "updated_at",
    type: "timestamptz",
  })
  updatedAt!: Date;

  // data de atribuicao
  @Column({
    name: "data_atribuicao",
    type: "timestamptz",
    nullable: true,
  })
  dataAtribuicao!: Date | null;

  // data de fechamento
  @Column({
    name: "data_fechamento",
    type: "timestamptz",
    nullable: true,
  })
  dataFechamento!: Date | null;

  @ManyToOne(() => TipoPrioridade, prioridade => prioridade.chamados)
  @JoinColumn({ name: "id_prioridade" })
  tipoPrioridade!: TipoPrioridade;

  @ManyToOne(() => TopicosAjuda, topico => topico.chamados)
  @JoinColumn({ name: "id_topico_ajuda" })
  topicoAjuda!: TopicosAjuda;

  @ManyToOne(() => Departamentos, depto => depto.chamados)
  @JoinColumn({ name: "id_departamento" })
  departamento!: Departamentos;

  @ManyToOne(() => StatusChamado, statusChamado => statusChamado.chamados)
  @JoinColumn({ name: "id_status" })
  status!: StatusChamado;

  @Column({ name: "resumo_chamado", length: 255 })
  resumoChamado!: string;

  @Column({ name: "descricao_chamado", type: "text" })
  descricaoChamado!: string;

  // Usuário responsável pelo atendimento
  @ManyToOne(() => Users, user => user.chamadosResponsavel, { nullable: true })
  @JoinColumn({ name: "id_user_responsavel" })
  userResponsavel!: Users | null;

  // Usuário que fechou o chamado
  @ManyToOne(() => Users, user => user.chamadosFechados, { nullable: true })
  @JoinColumn({ name: "id_user_finalizou" })
  userFechamento!: Users | null;

  @OneToMany(() => ChamadoAnexos, anexo => anexo.chamado)
  anexos!: ChamadoAnexos[];
}
