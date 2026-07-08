import { useAuth } from '@getmocha/users-service/react';
import { LogOut, LayoutDashboard, Package, BarChart3, TrendingUp, Upload, Menu, X, Settings, Users, ChevronDown, ChevronRight, UserCheck, FileText, BookOpen, DollarSign, ShoppingCart, List, Mail, Calendar, Wrench, ExternalLink } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['operador', 'vendas', 'forecast']); // Operador, Vendas and Forecast expanded by default
  const [userLevel, setUserLevel] = useState<string>('Representante');
  const [menuVisibility, setMenuVisibility] = useState<Record<string, boolean>>({});
  const [dataLoaded, setDataLoaded] = useState(false);

  // Buscar nível de acesso do usuário logado e configurações de menu
  useEffect(() => {
    if (dataLoaded || !user?.email) return;
    
    let isMounted = true;
    
    const fetchUserLevel = async () => {
      try {
        const response = await fetch('/api/users/me');
        if (response.ok && isMounted) {
          const userData = await response.json();
          
          // Buscar dados do usuário na tabela local
          const userResponse = await fetch(`/api/usuarios?email=${encodeURIComponent(userData.email)}`);
          if (userResponse.ok && isMounted) {
            const localUsers = await userResponse.json();
            const localUser = localUsers.find((u: any) => u.email === userData.email);
            if (localUser && isMounted) {
              setUserLevel(localUser.nivel_acesso);
            }
          }
        }
      } catch (error) {
        console.error('Erro ao buscar nível do usuário:', error);
      }
    };

    const fetchMenuConfig = async () => {
      try {
        const response = await fetch('/api/menu-config');
        if (response.ok && isMounted) {
          const configs = await response.json();
          const visibility: Record<string, boolean> = {};
          configs.forEach((config: any) => {
            visibility[config.menu_key] = config.is_visible;
          });
          setMenuVisibility(visibility);
        }
      } catch (error) {
        console.error('Erro ao buscar configurações de menu:', error);
      }
    };

    const loadData = async () => {
      await Promise.all([fetchUserLevel(), fetchMenuConfig()]);
      if (isMounted) {
        setDataLoaded(true);
      }
    };

    loadData();
    
    return () => {
      isMounted = false;
    };
  }, [user?.email, dataLoaded]);

  const allNavItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', menuKey: 'dashboard' },
    { path: '/produtos', icon: Package, label: 'Produtos', menuKey: 'produtos' },
    { 
      key: 'forecast',
      menuKey: 'forecast',
      icon: BarChart3, 
      label: 'Forecast',
      submenu: [
        { path: '/forecast/relatorios', icon: FileText, label: 'Relatórios', menuKey: 'forecast_relatorios' },
      ]
    },
    { path: '/forecast/budget', icon: DollarSign, label: 'Budget', menuKey: 'budget' },
    { 
      key: 'vendas',
      menuKey: 'vendas',
      icon: TrendingUp, 
      label: 'Vendas',
      submenu: [
        { path: '/vendas', icon: TrendingUp, label: 'Gestão de Vendas', menuKey: 'vendas_gestao' },
        { path: 'https://gestaodevendasprotheus.totvs-solucoes.com.br/#/login', icon: ExternalLink, label: 'Portal de Vendas', menuKey: 'vendas_portal', external: true },
        { path: '/vendas/agenda', icon: Calendar, label: 'Agenda do Vendedor', menuKey: 'vendas_agenda' },
        { path: '/vendas/diario', icon: Calendar, label: 'Diário de Compromissos', menuKey: 'vendas_diario' },
        { path: '/vendas/rota', icon: TrendingUp, label: 'Rota Inteligente do Dia', menuKey: 'vendas_rota' },
        { path: '/vendas/pedidos', icon: ShoppingCart, label: 'Novo Pedido', menuKey: 'vendas_pedidos' },
        { path: '/vendas/pedidos/lista', icon: List, label: 'Listar Pedidos', menuKey: 'vendas_lista' },
        { path: '/vendas/eficiencia', icon: UserCheck, label: 'Eficiência por Vendedor', menuKey: 'vendas_eficiencia' },
        { path: '/relatorios', icon: FileText, label: 'Relatórios', menuKey: 'vendas_relatorios' },
      ]
    },
    { 
      key: 'operador',
      menuKey: 'operador',
      icon: Settings, 
      label: 'Operador',
      submenu: [
        { path: '/limpeza-dados', icon: Wrench, label: 'Limpeza de Dados', menuKey: 'operador_limpeza' },
        { path: '/usuarios', icon: Users, label: 'Usuários', menuKey: 'operador_usuarios' },
        { path: '/recebe-pedido', icon: Mail, label: 'Recebe Pedido', menuKey: 'operador_recebe' },
        { path: '/prd', icon: BookOpen, label: 'PRD', menuKey: 'operador_prd' },
      ]
    },
    { path: '/config', icon: Wrench, label: 'Config', menuKey: 'config' },
    { path: '/importacao', icon: Upload, label: 'Importação', menuKey: 'importacao' },
  ];

  // Filtrar itens do menu baseado no nível de acesso e visibilidade
  const getFilteredNavItems = () => {
    const filterByVisibility = (items: any[]): any[] => {
      return items.filter(item => {
        // Se não tem menuKey definido, sempre mostrar (para compatibilidade)
        if (!item.menuKey) return true;
        
        // Se não tem configuração de visibilidade ainda, mostrar por padrão
        if (menuVisibility[item.menuKey] === undefined) return true;
        
        // Verificar visibilidade
        if (!menuVisibility[item.menuKey]) return false;
        
        // Se tem submenu, filtrar os subitens também
        if (item.submenu) {
          item.submenu = filterByVisibility(item.submenu);
          // Se não sobrou nenhum subitem visível, ocultar o menu pai
          return item.submenu.length > 0;
        }
        
        return true;
      });
    };
    let filteredItems: any[] = [];
    
    switch (userLevel) {
      case 'Administrador':
        // Acesso completo a todos os itens
        filteredItems = allNavItems;
        break;
      
      case 'Gerente':
        // Acesso apenas a Vendas (não exibir Dashboard no menu)
        filteredItems = allNavItems.filter(item => 
          item.key === 'vendas'
        );
        break;
      
      case 'Operador':
        // Acesso apenas ao submenu Operador
        filteredItems = allNavItems.filter(item => item.key === 'operador' || item.menuKey === 'config' || item.menuKey === 'importacao');
        break;
      
      case 'Representante': {
        // Acesso a Gestão de Vendas, Agenda, Rota Inteligente, Novo Pedido e Listar Pedidos
        const vendasMenu = allNavItems.find(item => item.key === 'vendas');
        if (vendasMenu && vendasMenu.submenu) {
          filteredItems = [{
            ...vendasMenu,
            submenu: vendasMenu.submenu.filter((subItem: any) => 
              subItem.path === '/vendas' || 
              subItem.path === '/vendas/agenda' ||
              subItem.path === '/vendas/diario' ||
              subItem.path === '/vendas/rota' ||
              subItem.path === '/vendas/pedidos' || 
              subItem.path === '/vendas/pedidos/lista'
            )
          }];
        } else {
          filteredItems = [];
        }
        break;
      }
      
      case 'Coord Tec Rum BR': {
        // Acesso apenas a Gestão de Vendas
        const vendasMenu = allNavItems.find(item => item.key === 'vendas');
        if (vendasMenu && vendasMenu.submenu) {
          filteredItems = [{
            ...vendasMenu,
            submenu: vendasMenu.submenu.filter((subItem: any) => 
              subItem.path === '/vendas'
            )
          }];
        } else {
          filteredItems = [];
        }
        break;
      }
      
      default:
        // Por segurança, retorna submenu de Vendas se não identificar o nível
        filteredItems = allNavItems.filter(item => item.key === 'vendas');
        break;
    }
    
    // Aplicar filtro de visibilidade
    return filterByVisibility(filteredItems);
  };

  const navItems = getFilteredNavItems();

  const isActive = (path: string) => location.pathname === path;
  
  const isSubMenuActive = (submenu: any[]) => {
    return submenu.some(item => location.pathname === item.path);
  };

  const toggleSubmenu = (key: string) => {
    setExpandedMenus(prev => 
      prev.includes(key) 
        ? prev.filter(item => item !== key)
        : [...prev, key]
    );
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700 shadow-xl">
        <div className="flex items-center justify-between p-4">
          <Link to="/dashboard" className="flex items-center space-x-3">
            <img 
              src="https://mocha-cdn.com/019a55e0-b253-7447-911b-2276e1caf514/logo-sales-manager.png"
              alt="SALMIX Logo"
              className="w-10 h-10 rounded-lg object-cover shadow-lg"
            />
            <div className="flex flex-col items-center">
              <span className="text-base font-bold bg-gradient-to-r from-blue-400 to-blue-300 bg-clip-text text-transparent whitespace-nowrap">
                SALMIX - SM 5.0
              </span>
              <span className="text-[10px] text-slate-500 -mt-1">© 2026 Daxtellk Systems</span>
            </div>
          </Link>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-all"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-screen z-40
        bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 
        border-r border-slate-700 shadow-2xl
        transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        w-64
      `}>
        <div className="flex flex-col h-full">
          {/* Logo - Desktop only */}
          <div className="hidden lg:flex items-center space-x-3 p-6 border-b border-slate-700">
            <Link to="/dashboard" className="flex items-center space-x-3 group">
              <img 
                src="https://mocha-cdn.com/019a55e0-b253-7447-911b-2276e1caf514/logo-sales-manager.png"
                alt="SALMIX Logo"
                className="w-10 h-10 rounded-lg object-cover shadow-lg group-hover:shadow-blue-500/50 transition-all"
              />
              <div className="flex flex-col items-center">
                <span className="text-base font-bold bg-gradient-to-r from-blue-400 to-blue-300 bg-clip-text text-transparent whitespace-nowrap">
                  SALMIX - SM 5.0
                </span>
                <span className="text-[10px] text-slate-500 -mt-1">© 2026 Daxtellk Systems</span>
              </div>
            </Link>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-1 mt-16 lg:mt-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              
              // Handle items with submenu
              if (item.submenu) {
                const isExpanded = expandedMenus.includes(item.key);
                const hasActiveSubmenu = isSubMenuActive(item.submenu);
                
                return (
                  <div key={item.key} className="space-y-1">
                    <button
                      onClick={() => toggleSubmenu(item.key)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all ${
                        hasActiveSubmenu
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/50'
                          : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span className="font-medium text-sm">{item.label}</span>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                    
                    {isExpanded && (
                      <div className="ml-3 space-y-0.5">
                        {item.submenu.map((subItem: any) => {
                          const SubIcon = subItem.icon;
                          
                          // Handle external links
                          if (subItem.external) {
                            return (
                              <a
                                key={subItem.path}
                                href={subItem.path}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="flex items-center space-x-2.5 px-3 py-1.5 rounded-lg transition-all text-slate-400 hover:bg-slate-700 hover:text-white"
                              >
                                <SubIcon className="w-3.5 h-3.5 flex-shrink-0" />
                                <span className="font-medium text-xs">{subItem.label}</span>
                              </a>
                            );
                          }
                          
                          return (
                            <Link
                              key={subItem.path}
                              to={subItem.path}
                              onClick={() => setIsMobileMenuOpen(false)}
                              className={`flex items-center space-x-2.5 px-3 py-1.5 rounded-lg transition-all ${
                                isActive(subItem.path)
                                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/50'
                                  : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                              }`}
                            >
                              <SubIcon className="w-3.5 h-3.5 flex-shrink-0" />
                              <span className="font-medium text-xs">{subItem.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }
              
              // Handle regular menu items
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center space-x-2.5 px-3 py-2 rounded-lg transition-all ${
                    isActive(item.path)
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/50'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="font-medium text-sm">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Info and Logout */}
          <div className="p-3 border-t border-slate-700 space-y-2">
            <div className="px-3 py-1.5 bg-slate-800 rounded-lg">
              <p className="text-xs font-medium text-slate-200 truncate">
                {user?.google_user_data.name || user?.email}
              </p>
              <p className="text-xs text-slate-400">{userLevel}</p>
            </div>
            <button
              onClick={() => logout()}
              className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-slate-700 hover:bg-red-600 text-white rounded-lg transition-all shadow-lg hover:shadow-red-600/50 text-sm"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Spacer for main content */}
      <div className="lg:ml-64" />
    </>
  );
}
