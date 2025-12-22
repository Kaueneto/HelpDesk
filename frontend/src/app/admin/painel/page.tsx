'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';

export default function PainelAdmin() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeMenu, setActiveMenu] = useState('inicio');
  const [gerencialExpanded, setGerencialExpanded] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  
 
  // filtros do dashboard
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [chamadosAbertos, setChamadosAbertos] = useState(0);
  const [chamadosFinalizados, setChamadosFinalizados] = useState(0);
  const [dadosPrioridade, setDadosPrioridade] = useState<any[]>([]);
  const [dadosDepartamento, setDadosDepartamento] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    } else if (!isLoading && user && user.roleId !== 1) {
      router.push('/usuario/inicial');
    }
  }, [isAuthenticated, isLoading, user, router]);

  // colocar as datas do mes atual ao carregar pra nao sobrecarregar
  useEffect(() => {
    if (isAuthenticated && user?.roleId === 1) {
      const hoje = new Date();
      const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
      
      setDataInicio(primeiroDia.toISOString().split('T')[0]);
      setDataFim(ultimoDia.toISOString().split('T')[0]);
    }
  }, [isAuthenticated, user]);

  // carregar dados quando as datas estiverem definidas
  useEffect(() => {
    if (dataInicio && dataFim) {
      carregarDados();
    }
  }, [dataInicio, dataFim]);

  const carregarDados = async () => {
    setLoading(true);
    try {
      // Buscar chamados do período
      const response = await api.get('/chamados', {
        params: {
          dataInicio,
          dataFim,
        }
      });

      const chamados = response.data.chamados || response.data;

      // contar abertos e finalizados
      const abertos = chamados.filter((c: any) => c.status?.id === 1).length;
      const finalizados = chamados.filter((c: any) => c.status?.id !== 1).length;
      
      setChamadosAbertos(abertos);
      setChamadosFinalizados(finalizados);

      // processar dados por prioridade
      const prioridadeMap = new Map();
      chamados.forEach((c: any) => {
        if (c.status?.id === 1) { // Apenas abertos
          const prioridadeNome = c.tipoPrioridade?.nome || 'Sem prioridade';
          const prioridadeCor = c.tipoPrioridade?.cor || '#999999';
          const count = prioridadeMap.get(prioridadeNome) || { count: 0, cor: prioridadeCor };
          prioridadeMap.set(prioridadeNome, { count: count.count + 1, cor: prioridadeCor });
        }
      });

      const prioridadeData = Array.from(prioridadeMap.entries()).map(([nome, data]: [string, any]) => ({
        nome,
        valor: data.count,
        cor: data.cor,
      }));
      setDadosPrioridade(prioridadeData);

      // processar dados por departamento
      const departamentoMap = new Map();
      chamados.forEach((c: any) => {
        const deptNome = c.departamento?.name || 'Sem departamento';
        departamentoMap.set(deptNome, (departamentoMap.get(deptNome) || 0) + 1);
      });

      const total = chamados.length;
      const departamentoData = Array.from(departamentoMap.entries()).map(([nome, count]) => ({
        nome,
        valor: count as number,
        percentual: total > 0 ? ((count as number / total) * 100).toFixed(1) : 0,
      })).sort((a, b) => b.valor - a.valor);
      
      setDadosDepartamento(departamentoData);

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePesquisar = () => {
    carregarDados();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-gray-600">Carregando...</div>
      </div>
    );
  }

  if (!isAuthenticated || !user || user.roleId !== 1) {
    return null;
  }

  const cores = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  return (
    <div className="h-screen flex overflow-hidden" style={{ backgroundColor: '#EDEDED' }}>
      {/* Sidebar */}
      <aside
        className={`transition-all duration-300 flex flex-col ${
          sidebarCollapsed ? 'w-16' : 'w-64'
        }`}
        style={{ backgroundColor: '#3F3F3F' }}
      >
          <div className="p-4 border-b border-gray-600">
            <h1 className={`text-white font-bold transition-all ${sidebarCollapsed ? 'text-xs text-center' : 'text-xl'}`}>
              {sidebarCollapsed ? 'CC' : 'Central de chamados'}
            </h1>
          </div>

          <nav className="flex-1 py-4">
            <button
              onClick={() => setActiveMenu('inicio')}
              className={`w-full px-4 py-3 text-left flex items-center gap-3 transition ${
                activeMenu === 'inicio' ? 'bg-gray-600 text-white' : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              <img src="/icons/iconHomeAdmin.svg" alt="Inicio" className="w-5 h-5 flex-shrink-0" />
              {!sidebarCollapsed && <span>Inicio</span>}
            </button>

            <button
              onClick={() => setActiveMenu('chamados')}
              className={`w-full px-4 py-3 text-left flex items-center gap-3 transition ${
                activeMenu === 'chamados' ? 'bg-gray-600 text-white' : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              <img src="/icons/iconchamados.svg" alt="Chamados" className="w-5 h-5 flex-shrink-0" />
              {!sidebarCollapsed && <span>Chamados</span>}
            </button>

            <div>
              <button
                onClick={() => setGerencialExpanded(!gerencialExpanded)}
                className={`w-full px-4 py-3 text-left flex items-center justify-between transition ${
                  activeMenu === 'gerencial' ? 'bg-gray-600 text-white' : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <img src="/icons/iconadministrator.svg" alt="Gerencial" className="w-5 h-5 flex-shrink-0" />
                  {!sidebarCollapsed && <span>Gerencial</span>}
                </div>
                {!sidebarCollapsed && (
                  <img 
                    src="/icons/arrowpointGerencial.svg" 
                    alt="Expandir" 
                    className={`w-4 h-4 transform transition-transform ${gerencialExpanded ? 'rotate-90' : ''}`}
                  />
                )}
              </button>

              {/* submenus do gerencial */}
              {gerencialExpanded && !sidebarCollapsed && (
                <div className="bg-gray-800">
                  {/* adicione mais opcoes de submenu aqui seguindo o mesmo padrao */}
                  <button
                    onClick={() => setActiveMenu('usuarios')}
                    className={`w-full px-4 py-2 pl-12 text-left text-sm transition ${
                      activeMenu === 'usuarios' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    Usuários
                  </button>

                  <button
                    onClick={() => setActiveMenu('topicos')}
                    className={`w-full px-4 py-2 pl-12 text-left text-sm transition ${
                      activeMenu === 'topicos' ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800'
                    }`}
                  >
                    Tópicos de Ajuda
                  </button>
                  <button
                    onClick={() => setActiveMenu('departamentos')}
                    className={`w-full px-4 py-2 pl-12 text-left text-sm transition ${
                      activeMenu === 'departamentos' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    Departamentos
                  </button>

                     <button
                    onClick={() => setActiveMenu('tiposPrioridade')}
                    className={`w-full px-4 py-2 pl-12 text-left text-sm transition ${
                      activeMenu === 'tiposPrioridade' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    Tipos de Prioridade
                  </button>


                      

                </div>
              )}
            </div>
          </nav>
        </aside>

        {/* Área de Conteúdo Principal */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="h-14 flex items-center justify-between px-4" style={{ backgroundColor: '#001F3F' }}>
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="text-white hover:bg-white/10 p-2 rounded transition"
            >
              <img src="/icons/menu.svg" alt="Menu" className="w-6 h-6" />
            </button>

            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-3 text-white hover:bg-white/10 px-3 py-2 rounded transition"
              >
                <img src="/icons/iconbook.svg" alt="Book" className="w-7 h-7" />
                <img src="/icons/iconperfil.svg" alt="Perfil" className="w-7 h-7" />
                <span className="font-medium">{user.name}</span>
              </button>

              {/* modal do usuario */}
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                  {/* info do usuario */}
                  <div className="px-4 py-3 border-b border-gray-200">
                    <div className="font-semibold text-gray-900">{user.name}</div>
                    <div className="text-sm text-gray-600">{user.email}</div>
                  </div>

                  {/* opcoes do menu */}
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        // add logica de tema aqui
                      }}
                      className="w-full px-4 py-2 text-left flex items-center gap-3 text-gray-700 hover:bg-gray-100 transition"
                    >
                      <img src="/icons/icontheme.svg" alt="Tema" className="w-5 h-5" />
                     <span className="text-lg">Tema</span>

                    </button>

                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        // add logica de configuracoes aqui
                      }}
                      className="w-full px-4 py-2 text-left flex items-center gap-3 text-gray-700 hover:bg-gray-100 transition"
                    >
                      <img src="/icons/iconconfig.svg" alt="Configurações" className="w-5 h-5" />
                       <span className="text-lg">Configurações</span>
                    </button>

                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        logout();
                        router.push('/auth/login');
                      }}
                      className="w-full px-4 py-2 text-left flex items-center gap-3 text-red-600 hover:bg-red-50 transition"
                    >
                      <img src="/icons/iconlogout.svg" alt="Sair" className="w-5 h-5" />
                      <span className="text-lg">Sair</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </header>

          {/* Área de Conteúdo */}
          <main className="flex-1 overflow-auto">
          {/* faixa Dashboard */}
          <div className="bg-blue-400 px-6 py-4">
            <h2 className="text-white text-2xl font-semibold">Dashboard</h2>
          </div>

          <div className="p-6">
            {/* filtros de data */}
            <div className="flex justify-end items-center gap-4 mb-6">
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded text-gray-900"
              />
              <span className="text-gray-700">até</span>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded text-gray-900"
              />
              <button
                onClick={handlePesquisar}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition disabled:opacity-50"
              >
                {loading ? 'Pesquisando...' : 'Pesquisar'}
              </button>
            </div>

            {/* cards de chamados */}
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="bg-green-500 rounded-lg p-8 flex items-center gap-6 text-white">
                <img src="/icons/iconabertos.svg" alt="Abertos" className="w-16 h-16" />
                <div>
                  <div className="text-5xl font-bold mb-2">{chamadosAbertos}</div>
                  <div className="text-xl font-medium">ABERTOS</div>
                </div>
              </div>

              <div className="bg-red-500 rounded-lg p-8 flex items-center gap-6 text-white">
                <img src="/icons/iconfechados.svg" alt="Fechados" className="w-16 h-16" />
                <div>
                  <div className="text-5xl font-bold mb-2">{chamadosFinalizados}</div>
                  <div className="text-xl font-medium">FINALIZADOS</div>
                </div>
              </div>
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-2 gap-6">
              {/* Gráfico de Pizza - Prioridade */}
              <div className="bg-white rounded-lg border border-gray-300 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-3 border-b">Por prioridade</h3>
                
                {dadosPrioridade.length > 0 ? (
                  <div className="flex flex-col items-center">
                    <svg viewBox="0 0 200 200" className="w-64 h-64 mb-4">
                      {(() => {
                        const total = dadosPrioridade.reduce((sum, item) => sum + item.valor, 0);
                        let currentAngle = 0;
                        
                        return dadosPrioridade.map((item, index) => {
                          const percentage = (item.valor / total) * 100;
                          const angle = (percentage / 100) * 360;
                          const startAngle = currentAngle;
                          const endAngle = currentAngle + angle;
                          
                          const x1 = 100 + 90 * Math.cos((startAngle - 90) * Math.PI / 180);
                          const y1 = 100 + 90 * Math.sin((startAngle - 90) * Math.PI / 180);
                          const x2 = 100 + 90 * Math.cos((endAngle - 90) * Math.PI / 180);
                          const y2 = 100 + 90 * Math.sin((endAngle - 90) * Math.PI / 180);
                          
                          const largeArc = angle > 180 ? 1 : 0;
                          const pathData = `M 100 100 L ${x1} ${y1} A 90 90 0 ${largeArc} 1 ${x2} ${y2} Z`;
                          
                          currentAngle += angle;
                          
                          return (
                            <g key={index}>
                              <path d={pathData} fill={item.cor} stroke="#fff" strokeWidth="2" />
                              <text
                                x={100 + 60 * Math.cos(((startAngle + endAngle) / 2 - 90) * Math.PI / 180)}
                                y={100 + 60 * Math.sin(((startAngle + endAngle) / 2 - 90) * Math.PI / 180)}
                                textAnchor="middle"
                                fill="#fff"
                                fontSize="14"
                                fontWeight="bold"
                              >
                                {item.valor}
                              </text>
                            </g>
                          );
                        });
                      })()}
                    </svg>
                    
                    <div className="flex flex-wrap justify-center gap-4">
                      {dadosPrioridade.map((item, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: item.cor }}></div>
                          <span className="text-sm text-gray-700">{item.nome}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">Nenhum chamado aberto no período</div>
                )}
              </div>

              {/* Gráfico de Barras - Departamento */}
              <div className="bg-white rounded-lg border border-gray-300 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-3 border-b">Por Departamento</h3>
                
                {dadosDepartamento.length > 0 ? (
                  <div className="space-y-4">
                    {dadosDepartamento.map((item, index) => (
                      <div key={index}>
                        <div className="flex justify-between text-sm text-gray-700 mb-1">
                          <span className="font-medium">{item.nome}</span>
                          <span>{item.percentual}%</span>
                        </div>
                        <div className="h-8 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 transition-all duration-500 flex items-center justify-end pr-2"
                            style={{ width: `${item.percentual}%` }}
                          >
                            <span className="text-xs font-bold text-white">{item.valor}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">Nenhum dado disponível</div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
