import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from "typeorm";
import { Users } from "./Users";
import { TipoPrioridade } from "./TipoPrioridade";
import { TopicosAjuda } from "./TopicosAjuda";
import { Departamentos } from "./Departamentos";
import { StatusChamado } from "./StatusChamado";

@Entity({ name: "chamados", schema: "public" })
export class Chamados {

  @PrimaryGeneratedColumn({ name: "id_chamado" })
  id!: number;

  // usuario que abriu o chamado
  @ManyToOne(() => Users, user => user.chamados)
  @JoinColumn({ name: "id_user" })
  usuario!: Users;

  @Column()
  ramal!: number;

  @Column({ name: "numero_chamado", unique: true })
  numeroChamado!: number;

  @CreateDateColumn({ name: "data_abertura", type: "date" })
  dataAbertura!: Date;

  @Column({ name: "data_atribuicao", type: "date", nullable: true })
  dataAtribuicao!: Date;

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

  // usuario responsável pelo atendimento
  @ManyToOne(() => Users, user => user.chamadosResponsavel, { nullable: true })
  @JoinColumn({ name: "id_user_responsavel" })
  userResponsavel!: Users;

  // usuario que fechou o chamado
  @ManyToOne(() => Users, user => user.chamadosFechados, { nullable: true })
  @JoinColumn({ name: "id_user_finalizou" })
  userFechamento!: Users;

  @Column({ name: "data_fechamento", type: "date", nullable: true })
  dataFechamento!: Date;
}
