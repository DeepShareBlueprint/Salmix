import { Hono } from "hono";
import { cors } from "hono/cors";
import {
  authMiddleware,
  buildGoogleAuthorizeUrl,
  clearSessionCookie,
  exchangeGoogleCodeForUser,
  issueSessionCookie,
  setOAuthStateCookie,
  verifyOAuthStateCookie,
} from "./auth";

import type { DashboardKPIs } from "@/shared/types";
import { Resend } from 'resend';
import { generatePRDDocument } from './generate-prd-docx';

const app = new Hono<{ Bindings: Env }>();

app.use("/*", cors());

// ==================== AUTH ENDPOINTS ====================

app.get("/api/oauth/google/redirect_url", async (c) => {
  const redirectUri = new URL("/auth/callback", c.req.url).toString();
  const { url, state } = buildGoogleAuthorizeUrl(c.env, redirectUri);
  setOAuthStateCookie(c, state);
  return c.json({ redirectUrl: url }, 200);
});

app.post("/api/sessions", async (c) => {
  const body = await c.req.json();
  if (!body.code) {
    return c.json({ error: "No authorization code provided" }, 400);
  }
  if (!body.state || !verifyOAuthStateCookie(c, body.state)) {
    return c.json({ error: "Invalid or missing OAuth state" }, 400);
  }

  const redirectUri = new URL("/auth/callback", c.req.url).toString();
  let user;
  try {
    user = await exchangeGoogleCodeForUser(c.env, body.code, redirectUri);
  } catch (err) {
    console.error("Erro ao trocar código do Google:", err);
    return c.json({ error: "Falha ao autenticar com o Google" }, 401);
  }

  await issueSessionCookie(c, c.env, user);

  return c.json({ success: true }, 200);
});

app.get("/api/users/me", authMiddleware, async (c) => {
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  console.log('🔍 /api/users/me - Email do Google:', user.email);
  console.log('🔍 /api/users/me - Dados completos do usuário:', JSON.stringify(user));
  
  // Verificar se o usuário está autorizado na tabela local
  const existingUser = await c.env.DB.prepare(
    "SELECT * FROM usuarios WHERE email = ?"
  ).bind(user.email).first() as any;
  
  console.log('🔍 /api/users/me - Usuário encontrado no banco:', existingUser ? 'SIM' : 'NÃO');
  if (existingUser) {
    console.log('🔍 /api/users/me - Dados do usuário no banco:', JSON.stringify(existingUser));
  }

  if (!existingUser) {
    // BOOTSTRAP: Verificar se é o primeiro usuário do sistema
    const totalUsuarios = await c.env.DB.prepare(
      "SELECT COUNT(*) as total FROM usuarios"
    ).first() as any;
    
    console.log('🔍 /api/users/me - Total de usuários no sistema:', totalUsuarios?.total);
    
    if (totalUsuarios?.total === 0) {
      // Este é o primeiro usuário - criar automaticamente como Administrador
      console.log('🚀 BOOTSTRAP: Criando primeiro usuário administrador:', user.email);
      
      await c.env.DB.prepare(
        `INSERT INTO usuarios (mocha_user_id, nome, email, cargo, nivel_acesso)
         VALUES (?, ?, ?, ?, ?)`
      ).bind(
        user.id,
        user.email.split('@')[0],
        user.email,
        'Administrador',
        'Administrador'
      ).run();
      
      // Buscar o usuário recém-criado
      const newUser = await c.env.DB.prepare(
        "SELECT * FROM usuarios WHERE email = ?"
      ).bind(user.email).first() as any;
      
      console.log('✅ BOOTSTRAP: Primeiro administrador criado com sucesso');
      
      // Usuário autorizado - retornar dados completos
      return c.json({ 
        ...user, 
        authorized: true, 
        localUser: newUser 
      });
    }
    
    // Usuário não autorizado - retornar status especial
    return c.json({ 
      ...user, 
      authorized: false, 
      message: "Usuário não autorizado. Solicite acesso ao administrador." 
    }, 200);
  }

  // Se o usuário existe mas tem ID temporário ou não tem mocha_user_id, atualizar com o ID do Google
  if ((!existingUser.mocha_user_id || existingUser.mocha_user_id.startsWith('temp_pending_')) && user.id) {
    await c.env.DB.prepare(
      "UPDATE usuarios SET mocha_user_id = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?"
    ).bind(user.id, user.email).run();
  }

  // Usuário autorizado - retornar dados completos
  return c.json({ 
    ...user, 
    authorized: true, 
    localUser: existingUser 
  });
});

app.get("/api/logout", async (c) => {
  clearSessionCookie(c);
  return c.json({ success: true }, 200);
});

// ==================== DASHBOARD ENDPOINTS ====================

app.get("/api/ultima-atualizacao", authMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    const result = await db.prepare(
      "SELECT MAX(data_venda) as ultima_data FROM vendas WHERE data_venda IS NOT NULL"
    ).first() as any;
    
    return c.json({ 
      ultima_data: result?.ultima_data || null 
    });
  } catch (error) {
    console.error('Erro ao buscar última atualização:', error);
    return c.json({ ultima_data: null });
  }
});

app.get("/api/dashboard/kpis", authMiddleware, async (c) => {
  const db = c.env.DB;
  const user = c.get("user");
  
  // Buscar nível de acesso do usuário autenticado
  let nivelAcesso = null;
  if (user) {
    const localUser = await db.prepare(
      "SELECT nivel_acesso FROM usuarios WHERE email = ?"
    ).bind(user.email).first() as any;
    nivelAcesso = localUser?.nivel_acesso;
  }
  
  // Obter filtros da query string
  const {
    negocio,
    representante,
    dataInicio: dataInicioParam,
    dataFim: dataFimParam
  } = c.req.query();
  
  console.log('=== KPI ENDPOINT CHAMADO ===');
  console.log('Filtros:', { negocio, representante, dataInicio: dataInicioParam, dataFim: dataFimParam });
  
  // DETECÇÃO AUTOMÁTICA: Buscar o ano mais recente com dados na base
  const anoMaisRecenteResult = await db.prepare(
    "SELECT MAX(strftime('%Y', data_venda)) as ano_mais_recente FROM vendas WHERE data_venda IS NOT NULL"
  ).first() as any;
  
  const anoAtual = parseInt(anoMaisRecenteResult?.ano_mais_recente || '2025');
  const anoAnterior = anoAtual - 1;
  
  console.log('🔍 DETECÇÃO AUTOMÁTICA DE PERÍODO:');
  console.log('  - Ano mais recente detectado:', anoAtual);
  console.log('  - Ano anterior calculado:', anoAnterior);
  
  const ultimaVendaResult = await db.prepare(
    "SELECT MAX(data_venda) as ultima_data FROM vendas WHERE data_venda IS NOT NULL AND strftime('%Y', data_venda) = ?"
  ).bind(anoAtual.toString()).first() as any;
  
  const ultimaData = ultimaVendaResult?.ultima_data;
  let mesAnoDisponivel = `${anoAtual}-11`; // Fallback padrão
  let mesAtual = 11;
  
  if (ultimaData) {
    // Extrair mês da última venda do ano atual (2025)
    const dataPartes = ultimaData.split('-');
    mesAtual = parseInt(dataPartes[1]);
    mesAnoDisponivel = `${anoAtual}-${mesAtual.toString().padStart(2, '0')}`;
  }
  
  console.log('  - Última venda do ano atual:', ultimaData);
  console.log('  - Mês atual:', mesAtual);
  
  console.log('=== DEBUG KPI CALCULATION ===');
  console.log('Referência Base:', { mesAnoDisponivel, anoAtual, anoAnterior, mesAtual });
  console.log('Filtros Recebidos:', { negocio, representante, dataInicioParam, dataFimParam });
  
  // Construir WHERE clause baseado nos filtros
  // IMPORTANTE: vendas.negocio armazena códigos (10, 36, 42), não nomes
  // vendedores.negocio armazena nomes ("Salmix B2B", etc)
  // Precisamos converter o filtro de nome para código antes de comparar
  let whereClause = "WHERE 1=1";
  const filterParams: any[] = [];
  
  if (negocio) {
    // v.negocio usa códigos (10, 36, 42), então comparar diretamente com o código recebido
    whereClause += " AND v.negocio = ?";
    filterParams.push(negocio);
  } else {
    // SEM filtro de negócio específico: excluir Salmix B2B (código 10)
    // Isso garante que "Todas" considere apenas Ave/Sui + Ruminantes
    whereClause += " AND v.negocio != ?";
    filterParams.push('10');
  }
  
  if (representante) {
    whereClause += " AND v.representante = ?";
    filterParams.push(representante);
  }
  
  // Filtro especial para Coord Tec Rum BR: apenas Ruminantes (36) e vendedores 3601, 3602, 3603, 3604
  if (nivelAcesso === 'Coord Tec Rum BR') {
    whereClause += " AND v.negocio = ?";
    filterParams.push('36');
    whereClause += " AND v.representante IN (?, ?, ?, ?)";
    filterParams.push('3601', '3602', '3603', '3604');
  }
  
  // Total de vendas do ano atual até o mês atual (com filtros)
  // IMPORTANTE: whereClause pode excluir Salmix (quando filtro "Todas")
  // Para comparar com Meta, isso está correto. Mas os CARDS precisam mostrar valor TOTAL.
  // Solução: criar whereClauseTodas que SEMPRE inclui todas unidades
  let whereClauseTodas = "WHERE 1=1";
  const filterParamsTodas: any[] = [];
  
  if (negocio) {
    // Se há filtro específico de negócio, aplicar
    whereClauseTodas += " AND v.negocio = ?";
    filterParamsTodas.push(negocio);
  }
  // SEM else: quando filtro "Todas", incluir TODOS os negócios (inclusive Salmix)
  
  if (representante) {
    whereClauseTodas += " AND v.representante = ?";
    filterParamsTodas.push(representante);
  }
  
  let queryVendasAnoAtual = `SELECT COALESCE(SUM(v.valor_total), 0) as total FROM vendas v ${whereClauseTodas}`;
  let paramsVendasAnoAtual = [...filterParamsTodas];
  
  // Aplicar filtros de data se fornecidos, senão usar YTD (Jan até mês atual)
  if (dataInicioParam && dataFimParam) {
    queryVendasAnoAtual += " AND v.data_venda >= ? AND v.data_venda <= ?";
    paramsVendasAnoAtual.push(dataInicioParam, dataFimParam);
  } else {
    // YTD: Janeiro (mês 1) até mesAtual do ano corrente
    queryVendasAnoAtual += " AND strftime('%Y', v.data_venda) = ? AND CAST(strftime('%m', v.data_venda) AS INTEGER) >= 1 AND CAST(strftime('%m', v.data_venda) AS INTEGER) <= ?";
    paramsVendasAnoAtual.push(anoAtual.toString(), mesAtual);
  }
  
  console.log('Query YTD Ano Atual:', queryVendasAnoAtual);
  console.log('Parâmetros YTD Ano Atual:', paramsVendasAnoAtual);
  
  const totalVendasAnoAtualResult = await db.prepare(queryVendasAnoAtual).bind(...paramsVendasAnoAtual).first();
  console.log('Resultado YTD Ano Atual:', totalVendasAnoAtualResult);
  
  // Total de vendas do ano anterior no mesmo período (com filtros)
  let queryVendasAnoAnterior = `SELECT COALESCE(SUM(v.valor_total), 0) as total FROM vendas v ${whereClauseTodas}`;
  let paramsVendasAnoAnterior = [...filterParamsTodas];
  
  if (dataInicioParam && dataFimParam) {
    // Calcular mesmo período do ano anterior
    const dataInicioDate = new Date(dataInicioParam);
    const dataFimDate = new Date(dataFimParam);
    const dataInicioAnterior = new Date(dataInicioDate.getFullYear() - 1, dataInicioDate.getMonth(), dataInicioDate.getDate());
    const dataFimAnterior = new Date(dataFimDate.getFullYear() - 1, dataFimDate.getMonth(), dataFimDate.getDate());
    
    queryVendasAnoAnterior += " AND v.data_venda >= ? AND v.data_venda <= ?";
    paramsVendasAnoAnterior.push(
      dataInicioAnterior.toISOString().split('T')[0],
      dataFimAnterior.toISOString().split('T')[0]
    );
  } else {
    // YTD: Janeiro (mês 1) até mesAtual do ano anterior para comparação justa
    // Se 2025 tem dados até Nov (mês 11), comparar com Jan-Nov 2024
    queryVendasAnoAnterior += " AND strftime('%Y', v.data_venda) = ? AND CAST(strftime('%m', v.data_venda) AS INTEGER) >= 1 AND CAST(strftime('%m', v.data_venda) AS INTEGER) <= ?";
    paramsVendasAnoAnterior.push(anoAnterior.toString(), mesAtual);
  }
  
  console.log('Query YTD Ano Anterior:', queryVendasAnoAnterior);
  console.log('Parâmetros YTD Ano Anterior:', paramsVendasAnoAnterior);
  
  const totalVendasAnoAnteriorResult = await db.prepare(queryVendasAnoAnterior).bind(...paramsVendasAnoAnterior).first();
  console.log('Resultado YTD Ano Anterior:', totalVendasAnoAnteriorResult);
  
  // Calcular evolução percentual
  const vendasAnoAtual = (totalVendasAnoAtualResult as any)?.total || 0;
  const vendasAnoAnterior = (totalVendasAnoAnteriorResult as any)?.total || 0;
  
  console.log('Valores Finais YTD:', { vendasAnoAtual, vendasAnoAnterior });
  
  let evolucaoPercentual = 0;
  if (vendasAnoAnterior > 0) {
    evolucaoPercentual = ((vendasAnoAtual - vendasAnoAnterior) / vendasAnoAnterior) * 100;
  } else if (vendasAnoAtual > 0) {
    evolucaoPercentual = 100; // Se não havia vendas no ano anterior mas há este ano
  }
  
  // Determinar o mês de referência baseado nos filtros
  let mesAtualFormatado: string;
  let anoMesAtual: number;
  let mesMesAtual: number;
  
  if (dataInicioParam && dataFimParam) {
    // Se há filtros de data, usar a data FIM como referência para o mês atual
    const [anoFim, mesFim] = dataFimParam.split('-').map(Number);
    anoMesAtual = anoFim;
    mesMesAtual = mesFim;
    mesAtualFormatado = `${anoFim}-${mesFim.toString().padStart(2, '0')}`;
  } else {
    // Sem filtros de data: usar o último mês disponível na base
    mesAtualFormatado = mesAnoDisponivel;
    anoMesAtual = anoAtual;
    mesMesAtual = mesAtual;
  }
  
  // Usar o mesmo período do ano atual para o ano anterior
  // Se estamos vendo dados de Jan-Out 2025, o ano anterior deve mostrar Jan-Out 2024
  const ultimoMesAnoAnterior = mesMesAtual;
  
  // Total de vendas do último mês disponível nos dados
  let whereClauseMensalTodas = "WHERE 1=1";
  const filterParamsMensalTodas: any[] = [];
  
  if (negocio) {
    whereClauseMensalTodas += " AND v.negocio = ?";
    filterParamsMensalTodas.push(negocio);
  }
  // SEM else: quando filtro "Todas", incluir TODOS os negócios (inclusive Salmix)
  
  if (representante) {
    whereClauseMensalTodas += " AND v.representante = ?";
    filterParamsMensalTodas.push(representante);
  }
  
  let queryVendasMes = `SELECT COALESCE(SUM(v.valor_total), 0) as total FROM vendas v ${whereClauseMensalTodas} AND strftime('%Y-%m', v.data_venda) = ?`;
  
  console.log('Query Mês Atual:', queryVendasMes);
  console.log('Parâmetros Mês Atual:', [...filterParamsMensalTodas, mesAtualFormatado]);
  
  const totalVendasMesResult = await db.prepare(queryVendasMes).bind(...filterParamsMensalTodas, mesAtualFormatado).first();
  console.log('Resultado Mês Atual:', totalVendasMesResult);
  
  // Total de vendas do mesmo mês no ano anterior
  const mesAnteriorFormatado = `${anoMesAtual - 1}-${mesMesAtual.toString().padStart(2, '0')}`;
  let queryVendasMesAnterior = `SELECT COALESCE(SUM(v.valor_total), 0) as total FROM vendas v ${whereClauseMensalTodas} AND strftime('%Y-%m', v.data_venda) = ?`;
  const totalVendasMesAnteriorResult = await db.prepare(queryVendasMesAnterior).bind(...filterParamsMensalTodas, mesAnteriorFormatado).first();
  
  // Calcular evolução percentual do mês
  const vendasMesAtual = (totalVendasMesResult as any)?.total || 0;
  const vendasMesAnterior = (totalVendasMesAnteriorResult as any)?.total || 0;
  
  let evolucaoMesPercentual = 0;
  if (vendasMesAnterior > 0) {
    evolucaoMesPercentual = ((vendasMesAtual - vendasMesAnterior) / vendasMesAnterior) * 100;
  } else if (vendasMesAtual > 0) {
    evolucaoMesPercentual = 100;
  }
  
  // CONSULTAS ADICIONAIS: Valores fixos de 2024 e 2025 para os cards amarelo e cinza
  // Para cards fixos 2024/2025: usar whereClause SEM o filtro de exclusão do Salmix
  // porque queremos mostrar o valor TOTAL histórico (incluindo Salmix)
  let whereClauseHistorico = "WHERE 1=1";
  const filterParamsHistorico: any[] = [];
  
  if (negocio) {
    whereClauseHistorico += " AND v.negocio = ?";
    filterParamsHistorico.push(negocio);
  }
  
  if (representante) {
    whereClauseHistorico += " AND v.representante = ?";
    filterParamsHistorico.push(representante);
  }
  
  // Ano 2024 YTD (fixo)
  let queryVendas2024 = `SELECT COALESCE(SUM(v.valor_total), 0) as total FROM vendas v ${whereClauseHistorico}`;
  let paramsVendas2024 = [...filterParamsHistorico];
  queryVendas2024 += " AND strftime('%Y', v.data_venda) = ? AND CAST(strftime('%m', v.data_venda) AS INTEGER) >= 1 AND CAST(strftime('%m', v.data_venda) AS INTEGER) <= ?";
  paramsVendas2024.push('2024', mesAtual);
  const totalVendas2024Result = await db.prepare(queryVendas2024).bind(...paramsVendas2024).first();
  const totalVendas2024 = (totalVendas2024Result as any)?.total || 0;
  
  // Ano 2025 YTD (fixo)
  let queryVendas2025 = `SELECT COALESCE(SUM(v.valor_total), 0) as total FROM vendas v ${whereClauseHistorico}`;
  let paramsVendas2025 = [...filterParamsHistorico];
  queryVendas2025 += " AND strftime('%Y', v.data_venda) = ? AND CAST(strftime('%m', v.data_venda) AS INTEGER) >= 1 AND CAST(strftime('%m', v.data_venda) AS INTEGER) <= ?";
  paramsVendas2025.push('2025', mesAtual);
  const totalVendas2025Result = await db.prepare(queryVendas2025).bind(...paramsVendas2025).first();
  const totalVendas2025 = (totalVendas2025Result as any)?.total || 0;
  
  // Mês 2024 (mesmo mês do ano atual, mas em 2024)
  // Para mês fixo 2024: usar whereClause SEM exclusão de Salmix (histórico completo)
  let whereClauseMensal2024 = "WHERE 1=1";
  const filterParamsMensal2024: any[] = [];
  
  if (negocio) {
    whereClauseMensal2024 += " AND v.negocio = ?";
    filterParamsMensal2024.push(negocio);
  }
  
  if (representante) {
    whereClauseMensal2024 += " AND v.representante = ?";
    filterParamsMensal2024.push(representante);
  }
  
  const mes2024Formatado = `2024-${mesMesAtual.toString().padStart(2, '0')}`;
  let queryVendasMes2024 = `SELECT COALESCE(SUM(v.valor_total), 0) as total FROM vendas v ${whereClauseMensal2024} AND strftime('%Y-%m', v.data_venda) = ?`;
  const totalVendasMes2024Result = await db.prepare(queryVendasMes2024).bind(...filterParamsMensal2024, mes2024Formatado).first();
  const totalVendasMes2024 = (totalVendasMes2024Result as any)?.total || 0;
  
  // Mês 2025 (mesmo mês do ano atual, mas em 2025)
  // Para mês fixo 2025: usar whereClause SEM exclusão de Salmix (histórico completo)
  let whereClauseMensal2025 = "WHERE 1=1";
  const filterParamsMensal2025: any[] = [];
  
  if (negocio) {
    whereClauseMensal2025 += " AND v.negocio = ?";
    filterParamsMensal2025.push(negocio);
  }
  
  if (representante) {
    whereClauseMensal2025 += " AND v.representante = ?";
    filterParamsMensal2025.push(representante);
  }
  
  const mes2025Formatado = `2025-${mesMesAtual.toString().padStart(2, '0')}`;
  let queryVendasMes2025 = `SELECT COALESCE(SUM(v.valor_total), 0) as total FROM vendas v ${whereClauseMensal2025} AND strftime('%Y-%m', v.data_venda) = ?`;
  const totalVendasMes2025Result = await db.prepare(queryVendasMes2025).bind(...filterParamsMensal2025, mes2025Formatado).first();
  const totalVendasMes2025 = (totalVendasMes2025Result as any)?.total || 0;
  
  // VARIÁVEIS PARA CÁLCULO DA META: Apenas Ruminantes + Ave/Sui (excluir Salmix B2B)
  // Estas variáveis serão usadas para calcular o % de atingimento da meta
  let whereClauseParaMeta = "WHERE v.negocio != '10'"; // Excluir Salmix B2B
  const filterParamsParaMeta: any[] = [];
  
  if (negocio) {
    // Se há filtro específico, usar o filtro
    whereClauseParaMeta = "WHERE v.negocio = ?";
    filterParamsParaMeta.push(negocio);
  }
  
  if (representante) {
    whereClauseParaMeta += " AND v.representante = ?";
    filterParamsParaMeta.push(representante);
  }
  
  // Vendas YTD para Meta (Ruminantes + Ave/Sui apenas)
  let queryVendasParaMeta = `SELECT COALESCE(SUM(v.valor_total), 0) as total FROM vendas v ${whereClauseParaMeta}`;
  let paramsVendasParaMeta = [...filterParamsParaMeta];
  
  if (dataInicioParam && dataFimParam) {
    queryVendasParaMeta += " AND v.data_venda >= ? AND v.data_venda <= ?";
    paramsVendasParaMeta.push(dataInicioParam, dataFimParam);
  } else {
    queryVendasParaMeta += " AND strftime('%Y', v.data_venda) = ? AND CAST(strftime('%m', v.data_venda) AS INTEGER) >= 1 AND CAST(strftime('%m', v.data_venda) AS INTEGER) <= ?";
    paramsVendasParaMeta.push(anoAtual.toString(), mesAtual);
  }
  
  const totalVendasParaMetaResult = await db.prepare(queryVendasParaMeta).bind(...paramsVendasParaMeta).first();
  const vendasParaMeta = (totalVendasParaMetaResult as any)?.total || 0;
  
  // Vendas Mensais para Meta (Ruminantes + Ave/Sui apenas)
  let queryVendasMensalParaMeta = `SELECT COALESCE(SUM(v.valor_total), 0) as total FROM vendas v ${whereClauseParaMeta} AND strftime('%Y-%m', v.data_venda) = ?`;
  const totalVendasMensalParaMetaResult = await db.prepare(queryVendasMensalParaMeta).bind(...filterParamsParaMeta, mesAtualFormatado).first();
  const vendasMensalParaMeta = (totalVendasMensalParaMetaResult as any)?.total || 0;
  
  console.log('💰 VENDAS PARA CÁLCULO DA META (SEM SALMIX):');
  console.log('  - YTD:', vendasParaMeta);
  console.log('  - Mensal:', vendasMensalParaMeta);
  
  // Calcular Acurácia de Previsão: YTD Forecast vs YTD Vendas Realizadas
  // Buscar total de forecast YTD do ano atual
  const totalForecastYTDResult = await db.prepare(
    `SELECT COALESCE(SUM(quantidade_prevista * COALESCE(preco_previsto, 0)), 0) as total_forecast
     FROM previsao_vendas 
     WHERE ano = ? AND mes <= ?`
  ).bind(anoMesAtual, mesMesAtual).first();
  
  const totalForecastYTD = (totalForecastYTDResult as any)?.total_forecast || 0;
  
  // Calcular acurácia: (Vendas Realizadas / Forecast) * 100
  let acuraciaPrevisao = 92; // Valor padrão caso não haja dados suficientes
  if (totalForecastYTD > 0 && vendasAnoAtual > 0) {
    acuraciaPrevisao = Math.min(100, (vendasAnoAtual / totalForecastYTD) * 100);
    acuraciaPrevisao = Math.round(acuraciaPrevisao * 100) / 100; // Arredondar para 2 casas decimais
  }
  
  // Calcular Ticket Médio YTD: Total de vendas / Número de transações
  const numeroTransacoesYTDResult = await db.prepare(
    "SELECT COUNT(*) as total_transacoes FROM vendas WHERE strftime('%Y', data_venda) = ? AND CAST(strftime('%m', data_venda) AS INTEGER) <= ?"
  ).bind(anoMesAtual.toString(), mesMesAtual).first();
  
  const numeroTransacoesYTD = (numeroTransacoesYTDResult as any)?.total_transacoes || 0;
  const ticketMedio = numeroTransacoesYTD > 0 ? vendasAnoAtual / numeroTransacoesYTD : 0;
  
  // Produtos mais vendidos (top 5) - YTD ano em vigor
  const produtosMaisVendidos = await db.prepare(
    `SELECT v.codigo_produto, v.nome_produto, 
     SUM(v.quantidade) as total_quantidade, 
     SUM(v.valor_total) as total_valor 
     FROM vendas v 
     WHERE strftime('%Y', v.data_venda) = ?
     GROUP BY v.codigo_produto, v.nome_produto 
     ORDER BY total_valor DESC 
     LIMIT 5`
  ).bind(anoMesAtual.toString()).all();
  
  // Estoque crítico (abaixo do mínimo)
  const estoqueCritico = await db.prepare(
    `SELECT e.codigo_produto, p.nome_produto, e.quantidade_estoque, e.estoque_minimo
     FROM estoque e
     JOIN produtos p ON e.codigo_produto = p.codigo_produto
     WHERE e.quantidade_estoque <= e.estoque_minimo`
  ).all();
  
  // Vendas por mês - ÚLTIMOS 12 MESES MÓVEIS (mês atual + 11 anteriores)
  const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  let vendasPorMes: any[] = [];
  
  console.log('📊 GERANDO 12 MESES MÓVEIS:');
  console.log('  - Ano atual:', anoAtual);
  console.log('  - Mês atual:', mesAtual);
  
  // Calcular os últimos 12 meses a partir do mês atual
  // Exemplo: se estamos em Jan/2026, pegar Fev/2025 até Jan/2026
  const mesesMoveis: Array<{ano: number, mes: number, label: string}> = [];
  
  for (let i = 11; i >= 0; i--) {
    const data = new Date(anoAtual, mesAtual - 1 - i, 1);
    const ano = data.getFullYear();
    const mes = data.getMonth() + 1;
    const mesLabel = mesesNomes[mes - 1];
    
    mesesMoveis.push({ ano, mes, label: mesLabel });
  }
  
  console.log('  - Meses móveis calculados:', mesesMoveis.map(m => `${m.label}/${m.ano}`).join(', '));
  
  // Buscar vendas dos últimos 12 meses agrupadas por ano-mês
  const queryVendasMoveis = `SELECT 
    strftime('%Y', v.data_venda) as ano,
    strftime('%m', v.data_venda) as mes,
    SUM(v.valor_total) as total
  FROM vendas v
  ${whereClause}
  GROUP BY strftime('%Y', v.data_venda), strftime('%m', v.data_venda)`;
  
  const vendasMoveisQuery = await db.prepare(queryVendasMoveis).bind(...filterParams).all();
  
  // Criar mapa para acesso rápido: chave = "YYYY-MM"
  const mapVendas = new Map<string, number>();
  (vendasMoveisQuery.results as any[]).forEach(item => {
    const chave = `${item.ano}-${item.mes}`;
    mapVendas.set(chave, item.total || 0);
  });
  
  // Gerar array dos 12 meses móveis
  for (const mesMovel of mesesMoveis) {
    const chave2024 = `2024-${mesMovel.mes.toString().padStart(2, '0')}`;
    const chave2025 = `2025-${mesMovel.mes.toString().padStart(2, '0')}`;
    const chave2026 = `2026-${mesMovel.mes.toString().padStart(2, '0')}`;
    
    const venda2024 = mapVendas.get(chave2024) || 0;
    const venda2025 = mapVendas.get(chave2025) || 0;
    const venda2026 = mapVendas.get(chave2026) || 0;
    
    vendasPorMes.push({
      mes: mesMovel.label,
      venda2024: Math.round(venda2024 * 100) / 100,
      venda2025: Math.round(venda2025 * 100) / 100,
      venda2026: Math.round(venda2026 * 100) / 100,
      vendaAnoAnterior: Math.round(venda2024 * 100) / 100, // Manter compatibilidade
      vendaMensal: Math.round(venda2025 * 100) / 100, // Manter compatibilidade
      anoCompleto: mesMovel.ano,
      mesNumero: mesMovel.mes
    });
  }
  
  // Vendas por representante - ano em vigor (usando representante como "região")
  const vendasPorRegiao = await db.prepare(
    `SELECT v.representante as regiao, SUM(v.valor_total) as total
     FROM vendas v
     WHERE v.representante IS NOT NULL AND strftime('%Y', v.data_venda) = ?
     GROUP BY v.representante
     ORDER BY total DESC`
  ).bind(anoMesAtual.toString()).all();
  
  // Top 3 Representantes - YTD ano em vigor com vendas do mês atual e acumulado do ano
  const top3Representantes = await db.prepare(
    `SELECT 
       v.representante,
       SUM(CASE WHEN strftime('%Y-%m', v.data_venda) = ? THEN v.valor_total ELSE 0 END) as valor_mes_dez24,
       SUM(v.valor_total) as valor_acumulado,
       COUNT(*) as total_vendas
     FROM vendas v
     WHERE v.representante IS NOT NULL AND strftime('%Y', v.data_venda) = ?
     GROUP BY v.representante
     ORDER BY valor_acumulado DESC
     LIMIT 3`
  ).bind(mesAtualFormatado, anoMesAtual.toString()).all();
  
  // Vendas por Negócio - YTD 2025 vs 2024 e Mês Atual com evolução
  // IMPORTANTE: usar mesAtual (10) para limitar vendas 2025 também, não apenas 2024
  const vendasPorNegocio = await db.prepare(
    `SELECT 
       COALESCE(vend.negocio, 'Sem Classificação') as negocio,
       SUM(CASE WHEN strftime('%Y-%m', v.data_venda) = ? THEN v.valor_total ELSE 0 END) as valor_mes_atual,
       SUM(CASE WHEN strftime('%Y', v.data_venda) = ? AND CAST(strftime('%m', v.data_venda) AS INTEGER) <= ? THEN v.valor_total ELSE 0 END) as valor_ytd_2025,
       SUM(CASE WHEN strftime('%Y', v.data_venda) = ? AND CAST(strftime('%m', v.data_venda) AS INTEGER) <= ? THEN v.valor_total ELSE 0 END) as valor_ytd_2024,
       SUM(CASE WHEN strftime('%Y-%m', v.data_venda) = ? THEN v.valor_total ELSE 0 END) as valor_mes_anterior
     FROM vendas v LEFT JOIN vendedores vend ON v.representante = vend.vendedor
     GROUP BY COALESCE(vend.negocio, 'Sem Classificação')
     ORDER BY valor_ytd_2025 DESC`
  ).bind(mesAtualFormatado, anoAtual.toString(), mesAtual, anoAnterior.toString(), mesAtual, mesAnteriorFormatado).all();
  
  // Vendas mensais por Negócio OU por Vendedor - dependendo dos filtros aplicados
  const vendasMensaisPorNegocio: any[] = [];
  let topNegocios: string[] = [];
  
  // Decidir se vamos agrupar por negócio ou por vendedor
  // Se HÁ filtro de negócio específico: agrupar por vendedor
  // Se NÃO há filtro de negócio: agrupar por negócio
  const agruparPorVendedor = Boolean(negocio);
  
  if (agruparPorVendedor) {
    // MODO VENDEDOR: Buscar top vendedores do negócio filtrado
    const topVendedoresQuery = await db.prepare(
      `SELECT 
         v.representante,
         vend.nome_vendedor,
         SUM(v.valor_total) as total_vendas
       FROM vendas v
       LEFT JOIN vendedores vend ON v.representante = vend.vendedor
       ${whereClause}
       AND strftime('%Y', v.data_venda) = ?
       AND v.representante IS NOT NULL
       GROUP BY v.representante, vend.nome_vendedor
       ORDER BY total_vendas DESC
       LIMIT 5`
    ).bind(...filterParams, anoAtual.toString()).all();
    
    topNegocios = (topVendedoresQuery.results as any[]).map(v => 
      v.nome_vendedor || `Vendedor ${v.representante}`
    );
  } else {
    // MODO NEGÓCIO: Buscar top 4 unidades de negócio (excluir Sem Classificação)
    topNegocios = (vendasPorNegocio.results as any[])
      .filter((n: any) => n.negocio !== 'Sem Classificação')
      .slice(0, 4)
      .map(n => n.negocio);
  }
  
  if (topNegocios.length > 0) {
    // Buscar TODAS as vendas dos ÚLTIMOS 12 MESES MÓVEIS (não mais YTD)
    // Calcular início: 11 meses atrás do mês atual
    const dataInicio = new Date(anoMesAtual, mesMesAtual - 1 - 11, 1);
    const inicioFormatado = `${dataInicio.getFullYear()}-${(dataInicio.getMonth() + 1).toString().padStart(2, '0')}`;
    const fimFormatado = `${anoMesAtual}-${mesMesAtual.toString().padStart(2, '0')}`; // Mês atual
    
    console.log('📊 GRÁFICO VENDAS POR NEGÓCIO - 12 MESES MÓVEIS:');
    console.log('  - Início:', inicioFormatado);
    console.log('  - Fim:', fimFormatado);
    
    // Construir WHERE clause com os mesmos filtros aplicados ao resto dos KPIs
    let whereClauseGrafico = "WHERE strftime('%Y-%m', v.data_venda) >= ? AND strftime('%Y-%m', v.data_venda) <= ?";
    const paramsGrafico: any[] = [inicioFormatado, fimFormatado];
    
    // Aplicar filtros de negócio e representante
    if (negocio) {
      whereClauseGrafico += " AND v.negocio = ?";
      paramsGrafico.push(negocio);
    }
    
    if (representante) {
      whereClauseGrafico += " AND v.representante = ?";
      paramsGrafico.push(representante);
    }
    
    // Filtro especial para Coord Tec Rum BR
    if (nivelAcesso === 'Coord Tec Rum BR') {
      whereClauseGrafico += " AND v.negocio = ?";
      paramsGrafico.push('36');
      whereClauseGrafico += " AND v.representante IN (?, ?, ?, ?)";
      paramsGrafico.push('3601', '3602', '3603', '3604');
    }
    
    // Query diferente dependendo do modo
    let vendasMensaisQuery;
    if (agruparPorVendedor) {
      // Agrupar por mês e vendedor
      vendasMensaisQuery = await db.prepare(
        `SELECT 
           strftime('%Y-%m', v.data_venda) as mes_ano,
           v.representante,
           COALESCE(vend.nome_vendedor, 'Vendedor ' || v.representante) as nome_vendedor,
           SUM(v.valor_total) as total
         FROM vendas v 
         LEFT JOIN vendedores vend ON v.representante = vend.vendedor
         ${whereClauseGrafico}
         AND v.representante IS NOT NULL
         GROUP BY strftime('%Y-%m', v.data_venda), v.representante, vend.nome_vendedor`
      ).bind(...paramsGrafico).all();
    } else {
      // Agrupar por mês e negócio
      vendasMensaisQuery = await db.prepare(
        `SELECT 
           strftime('%Y-%m', v.data_venda) as mes_ano,
           COALESCE(vend.negocio, 'Sem Classificação') as negocio,
           SUM(v.valor_total) as total
         FROM vendas v 
         LEFT JOIN vendedores vend ON v.representante = vend.vendedor
         ${whereClauseGrafico}
         GROUP BY strftime('%Y-%m', v.data_venda), COALESCE(vend.negocio, 'Sem Classificação')`
      ).bind(...paramsGrafico).all();
    }
    
    // Criar Map para acesso rápido
    const vendasMap = new Map<string, number>();
    
    if (agruparPorVendedor) {
      // Map com chave = "YYYY-MM|NomeVendedor"
      (vendasMensaisQuery.results as any[]).forEach(item => {
        const chave = `${item.mes_ano}|${item.nome_vendedor}`;
        vendasMap.set(chave, item.total || 0);
      });
    } else {
      // Map com chave = "YYYY-MM|Negocio"
      (vendasMensaisQuery.results as any[]).forEach(item => {
        const chave = `${item.mes_ano}|${item.negocio}`;
        vendasMap.set(chave, item.total || 0);
      });
    }
    
    // Gerar array dos ÚLTIMOS 12 MESES MÓVEIS
    for (let i = 11; i >= 0; i--) {
      const data = new Date(anoMesAtual, mesMesAtual - 1 - i, 1);
      const anoMes = data.getFullYear();
      const mesMes = data.getMonth() + 1;
      const chaveMes = `${anoMes}-${mesMes.toString().padStart(2, '0')}`;
      
      // Mês anterior = mesmo mês do ano anterior
      const chaveMesAnterior = `${anoMes - 1}-${mesMes.toString().padStart(2, '0')}`;
      
      const dadosMes: any = {
        mes: mesesNomes[mesMes - 1],
        anoCompleto: anoMes,
        mesNumero: mesMes
      };
      
      // Para cada item top (negócio ou vendedor), buscar valores do Map
      for (const item of topNegocios) {
        const valorAtual = vendasMap.get(`${chaveMes}|${item}`) || 0;
        const valorAnterior = vendasMap.get(`${chaveMesAnterior}|${item}`) || 0;
        
        // Calcular evolução percentual
        let evolucaoPercentual = 0;
        if (valorAnterior > 0) {
          evolucaoPercentual = ((valorAtual - valorAnterior) / valorAnterior) * 100;
        } else if (valorAtual > 0) {
          evolucaoPercentual = 100;
        }
        
        dadosMes[item] = valorAtual;
        dadosMes[`${item}_evolucao`] = evolucaoPercentual;
      }
      
      vendasMensaisPorNegocio.push(dadosMes);
    }
  }
  
  // Calcular participação percentual de cada negócio e evolução 2025 vs 2024
  // IMPORTANTE: Calcular o total REAL somando todos os negócios (sem usar vendasAnoAtual que pode ter filtros)
  const totalGeralYTD = (vendasPorNegocio.results as any[]).reduce((sum: number, neg: any) => sum + (neg.valor_ytd_2025 || 0), 0);
  const negociosComParticipacao = (vendasPorNegocio.results as any[]).map((neg: any) => {
    const participacao = totalGeralYTD > 0 ? (neg.valor_ytd_2025 / totalGeralYTD) * 100 : 0;
    
    // Evolução mês atual vs mês anterior (mesmo mês do ano anterior)
    let evolucaoMes = 0;
    if (neg.valor_mes_anterior > 0) {
      evolucaoMes = ((neg.valor_mes_atual - neg.valor_mes_anterior) / neg.valor_mes_anterior) * 100;
    } else if (neg.valor_mes_atual > 0) {
      evolucaoMes = 100;
    }
    
    // Evolução YTD 2025 vs YTD 2024
    let evolucaoYtd = 0;
    if (neg.valor_ytd_2024 > 0) {
      evolucaoYtd = ((neg.valor_ytd_2025 - neg.valor_ytd_2024) / neg.valor_ytd_2024) * 100;
    } else if (neg.valor_ytd_2025 > 0) {
      evolucaoYtd = 100;
    }
    
    return {
      negocio: neg.negocio,
      valor_mes_atual: neg.valor_mes_atual,
      valor_mes_anterior: neg.valor_mes_anterior,
      valor_ytd_2025: neg.valor_ytd_2025,
      valor_ytd_2024: neg.valor_ytd_2024,
      participacao: Math.round(participacao * 100) / 100,
      evolucao_mes: Math.round(evolucaoMes * 100) / 100,
      evolucao_ytd: Math.round(evolucaoYtd * 100) / 100
    };
  });
  
  // Calcular metas YTD e mensal usando a mesma lógica do endpoint /api/vendas/meta
  let metaYTD = 0;
  let metaMensal = 0;
  
  try {
    // Importar funções de mapeamento de negócio
    const { obterCodigoNegocio } = await import('@/shared/negocio-mapping');
    
    // Converter nome de negócio para código se necessário
    const negocioCodigo = negocio ? obterCodigoNegocio(negocio) : null;
    
    // DETECÇÃO DINÂMICA: Determinar sufixo do ano baseado no ano atual detectado
    const anoSufixo = anoAtual.toString().slice(-2); // '25' para 2025, '26' para 2026, etc
    
    console.log('🎯 CÁLCULO DE META DINÂMICO:');
    console.log('  - Ano atual:', anoAtual);
    console.log('  - Sufixo de ano para colunas:', anoSufixo);
    
    // Meta YTD: soma de janeiro até mesFinal do ano atual
    const mesesNomes = [
      `jan_${anoSufixo}`, `fev_${anoSufixo}`, `mar_${anoSufixo}`, `abr_${anoSufixo}`, 
      `mai_${anoSufixo}`, `jun_${anoSufixo}`, `jul_${anoSufixo}`, `ago_${anoSufixo}`, 
      `set_${anoSufixo}`, `out_${anoSufixo}`, `nov_${anoSufixo}`, `dez_${anoSufixo}`
    ];
    
    const mesesIncluir = mesesNomes.slice(0, mesMesAtual);
    
    console.log('  - Meses a incluir no budget:', mesesIncluir);
    
    if (mesesIncluir.length > 0) {
      let whereClauseBudget = "WHERE negocio != '10'";
      const paramsBudget: any[] = [];
      
      if (negocioCodigo) {
        whereClauseBudget += " AND negocio = ?";
        paramsBudget.push(negocioCodigo);
      }
      
      if (representante) {
        whereClauseBudget += " AND vendedor = ?";
        paramsBudget.push(representante);
      }
      
      // Calcular meta YTD
      const somaMeses = mesesIncluir.map(mes => `COALESCE(${mes}, 0)`).join(' + ');
      const queryMetaYTD = `SELECT SUM(${somaMeses}) as meta_total FROM budget ${whereClauseBudget}`;
      const resultMetaYTD = await db.prepare(queryMetaYTD).bind(...paramsBudget).first() as any;
      metaYTD = resultMetaYTD?.meta_total || 0;
      
      console.log('  - Meta YTD calculada:', metaYTD);
      
      // Calcular meta mensal
      const mesBudget = mesesNomes[mesMesAtual - 1];
      const queryMetaMensal = `SELECT SUM(COALESCE(${mesBudget}, 0)) as meta_total FROM budget ${whereClauseBudget}`;
      const resultMetaMensal = await db.prepare(queryMetaMensal).bind(...paramsBudget).first() as any;
      metaMensal = resultMetaMensal?.meta_total || 0;
      
      console.log('  - Meta mensal calculada:', metaMensal);
    }
  } catch (error) {
    console.error('Erro ao calcular metas:', error);
  }
  
  const kpis: DashboardKPIs = {
    totalVendas: vendasAnoAtual,
    totalVendasAnoAnterior: vendasAnoAnterior,
    totalVendas2024: totalVendas2024,
    totalVendas2025: totalVendas2025,
    totalVendasMes: vendasMesAtual,
    totalVendasMesAnoAnterior: vendasMesAnterior,
    totalVendasMes2024: totalVendasMes2024,
    totalVendasMes2025: totalVendasMes2025,
    totalVendasEvolucao: Math.round(evolucaoPercentual * 100) / 100,
    totalVendasMesEvolucao: Math.round(evolucaoMesPercentual * 100) / 100,
    margemMedia: 35,
    acuraciaPrevisao: acuraciaPrevisao,
    ticketMedio: Math.round(ticketMedio * 100) / 100,
    mesAtualDados: mesMesAtual,
    anoAtualDados: anoMesAtual,
    mesAnoAnteriorDados: ultimoMesAnoAnterior,
    metaYTD: metaYTD,
    metaMensal: metaMensal,
    vendasParaMeta: vendasParaMeta,
    vendasMensalParaMeta: vendasMensalParaMeta,
    produtosMaisVendidos: produtosMaisVendidos.results as any,
    estoqueCritico: estoqueCritico.results as any,
    vendasPorMes: vendasPorMes,
    vendasPorRegiao: vendasPorRegiao.results as any,
    rankingRepresentantes: top3Representantes.results as any,
    vendasPorNegocio: negociosComParticipacao,
    vendasMensaisPorNegocio: vendasMensaisPorNegocio,
  };
  
  console.log('=== KPIs FINAIS RETORNADOS ===');
  console.log('totalVendas (YTD):', kpis.totalVendas);
  console.log('totalVendasAnoAnterior (YTD):', kpis.totalVendasAnoAnterior);
  console.log('totalVendasMes:', kpis.totalVendasMes);
  console.log('metaYTD:', kpis.metaYTD);
  console.log('metaMensal:', kpis.metaMensal);
  console.log('mesAtualDados:', kpis.mesAtualDados);
  console.log('anoAtualDados:', kpis.anoAtualDados);
  console.log('==============================');
  
  return c.json(kpis);
});

// ==================== SOLICITAÇÕES DE ACESSO ENDPOINTS ====================

app.get("/api/access-requests", authMiddleware, async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM solicitacoes_acesso ORDER BY created_at DESC"
  ).all();
  return c.json(results);
});

app.post("/api/access-requests", async (c) => {
  const data = await c.req.json();
  
  // Verificar se já existe uma solicitação pendente para este email
  const existingRequest = await c.env.DB.prepare(
    "SELECT id FROM solicitacoes_acesso WHERE email = ? AND status = 'Pendente'"
  ).bind(data.email).first();
  
  if (existingRequest) {
    return c.json({ 
      success: false, 
      message: "Já existe uma solicitação pendente para este email" 
    }, 400);
  }
  
  const result = await c.env.DB.prepare(
    `INSERT INTO solicitacoes_acesso (email, nome, cargo, departamento, justificativa)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(
    data.email,
    data.nome,
    data.cargo || null,
    data.departamento || null,
    data.justificativa
  ).run();
  
  // Buscar emails de operadores e administradores para notificar
  const operadores = await c.env.DB.prepare(
    "SELECT email, nome FROM usuarios WHERE nivel_acesso IN ('Operador', 'Administrador', 'Gerente')"
  ).all();
  
  // Preparar notificação por email (será enviado assincronamente)
  if (operadores.results && operadores.results.length > 0) {
    // Log para indicar que há uma solicitação pendente
    // Em produção, aqui seria enviado um email real via serviço de email
    console.log(`📧 Nova solicitação de acesso de ${data.nome} (${data.email})`);
    console.log(`Operadores a notificar: ${operadores.results.map((op: any) => op.email).join(', ')}`);
  }
  
  return c.json({ success: true, id: result.meta.last_row_id }, 201);
});

app.put("/api/access-requests/:id/approve", authMiddleware, async (c) => {
  const id = c.req.param("id");
  const data = await c.req.json();
  
  // Buscar a solicitação
  const request = await c.env.DB.prepare(
    "SELECT * FROM solicitacoes_acesso WHERE id = ?"
  ).bind(id).first() as any;
  
  if (!request) {
    return c.json({ error: "Solicitação não encontrada" }, 404);
  }
  
  // Verificar se o usuário já existe
  const existingUser = await c.env.DB.prepare(
    "SELECT id FROM usuarios WHERE email = ?"
  ).bind(request.email).first();
  
  if (existingUser) {
    // Usuário já existe, apenas aprovar a solicitação
    await c.env.DB.prepare(
      `UPDATE solicitacoes_acesso 
       SET status = 'Aprovada', updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).bind(id).run();
    
    return c.json({ success: true, message: "Usuário já existe. Solicitação aprovada." });
  }
  
  // Criar o usuário na tabela de usuários usando um mocha_user_id temporário
  try {
    // Gerar um ID temporário único para satisfazer a constraint NOT NULL
    const tempMochaUserId = `temp_pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const nivelAcesso = data.nivel_acesso || 'Representante';
    const unidadeNegocio = nivelAcesso === 'Representante' ? 'Ruminantes' : null;
    
    await c.env.DB.prepare(
      `INSERT INTO usuarios (mocha_user_id, nome, email, cargo, nivel_acesso, unidade_negocio)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(
      tempMochaUserId,  // ID temporário que será substituído no primeiro login
      request.nome,
      request.email,
      request.cargo || 'Funcionário',
      nivelAcesso,
      unidadeNegocio
    ).run();
    
    // Atualizar status da solicitação
    await c.env.DB.prepare(
      `UPDATE solicitacoes_acesso 
       SET status = 'Aprovada', updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).bind(id).run();
    
    return c.json({ success: true, message: "Usuário aprovado e criado com sucesso" });
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    return c.json({ error: "Erro ao criar usuário: " + String(error) }, 500);
  }
});

app.put("/api/access-requests/:id/reject", authMiddleware, async (c) => {
  const id = c.req.param("id");
  
  await c.env.DB.prepare(
    `UPDATE solicitacoes_acesso 
     SET status = 'Rejeitada', updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).bind(id).run();
  
  return c.json({ success: true, message: "Solicitação rejeitada" });
});

// ==================== USUÁRIOS ENDPOINTS ====================

app.get("/api/usuarios", authMiddleware, async (c) => {
  const email = c.req.query('email');
  
  if (email) {
    const { results } = await c.env.DB.prepare(
      "SELECT * FROM usuarios WHERE email = ?"
    ).bind(email).all();
    return c.json(results);
  }
  
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM usuarios ORDER BY nome"
  ).all();
  return c.json(results);
});

app.get("/api/usuarios/:id", authMiddleware, async (c) => {
  const id = c.req.param("id");
  const usuario = await c.env.DB.prepare(
    "SELECT * FROM usuarios WHERE id = ?"
  ).bind(id).first();
  
  if (!usuario) {
    return c.json({ error: "Usuário não encontrado" }, 404);
  }
  return c.json(usuario);
});

app.post("/api/usuarios", authMiddleware, async (c) => {
  const data = await c.req.json();
  
  // Verificar se email já existe
  const existingUser = await c.env.DB.prepare(
    "SELECT id FROM usuarios WHERE email = ?"
  ).bind(data.email).first();
  
  if (existingUser) {
    return c.json({ error: "Email já está em uso" }, 400);
  }
  
  // Gerar um ID temporário único para satisfazer a constraint NOT NULL
  const tempMochaUserId = `temp_manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Definir unidade de negócio e vendedor baseado no nível de acesso
  // Usar valor explícito se fornecido, senão usar Ruminantes como padrão
  let unidadeNegocio = null;
  let vendedor = null;
  
  if (data.nivel_acesso === 'Representante') {
    unidadeNegocio = data.unidade_negocio !== undefined ? data.unidade_negocio : 'Ruminantes';
    vendedor = data.vendedor !== undefined ? data.vendedor : null;
  } else if (data.nivel_acesso === 'Gerente') {
    // Gerentes também têm unidade de negócio, mas não têm vendedor
    unidadeNegocio = data.unidade_negocio !== undefined ? data.unidade_negocio : 'Ruminantes';
    vendedor = null;
  }
  
  const result = await c.env.DB.prepare(
    `INSERT INTO usuarios (mocha_user_id, nome, email, cargo, nivel_acesso, unidade_negocio, vendedor)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    tempMochaUserId,  // ID temporário que será substituído no primeiro login
    data.nome,
    data.email,
    data.cargo || null,
    data.nivel_acesso || 'Representante',
    unidadeNegocio,
    vendedor
  ).run();
  
  return c.json({ success: true, id: result.meta.last_row_id, ...data, unidade_negocio: unidadeNegocio, vendedor }, 201);
});

app.put("/api/usuarios/:id", authMiddleware, async (c) => {
  const id = c.req.param("id");
  const data = await c.req.json();
  
  console.log('');
  console.log('='.repeat(60));
  console.log('🔍 PUT /api/usuarios/:id CHAMADO');
  console.log('='.repeat(60));
  console.log('🔍 ID do usuário:', id);
  console.log('🔍 Dados recebidos do frontend:', JSON.stringify(data, null, 2));
  console.log('🔍 data.nivel_acesso:', data.nivel_acesso);
  console.log('🔍 data.unidade_negocio (recebido):', data.unidade_negocio);
  console.log('🔍 data.vendedor (recebido):', data.vendedor);
  
  // Buscar dados atuais do usuário para comparação
  const usuarioAtual = await c.env.DB.prepare(
    "SELECT * FROM usuarios WHERE id = ?"
  ).bind(id).first() as any;
  
  console.log('🔍 Dados ANTES da atualização:');
  console.log('  - unidade_negocio:', usuarioAtual?.unidade_negocio);
  console.log('  - vendedor:', usuarioAtual?.vendedor);
  console.log('  - nivel_acesso:', usuarioAtual?.nivel_acesso);
  
  // Definir unidade de negócio e vendedor baseado no nível de acesso
  // IMPORTANTE: Usar o valor recebido diretamente, preservando até mesmo strings vazias se for o caso
  let unidadeNegocio = null;
  let vendedor = null;
  
  if (data.nivel_acesso === 'Representante') {
    // Para Representante: usar exatamente o valor enviado pelo frontend
    unidadeNegocio = data.unidade_negocio !== undefined ? data.unidade_negocio : null;
    vendedor = data.vendedor !== undefined ? data.vendedor : null;
    console.log('🔍 É Representante:');
    console.log('  - unidadeNegocio a salvar:', unidadeNegocio);
    console.log('  - vendedor a salvar:', vendedor);
  } else if (data.nivel_acesso === 'Gerente') {
    // Para Gerente: usar exatamente o valor enviado pelo frontend, mas vendedor fica null
    unidadeNegocio = data.unidade_negocio !== undefined ? data.unidade_negocio : null;
    vendedor = null;
    console.log('🔍 É Gerente:');
    console.log('  - unidadeNegocio a salvar:', unidadeNegocio);
    console.log('  - vendedor a salvar:', vendedor);
  } else {
    // Outros níveis: unidade e vendedor ficam null
    console.log('🔍 Não é Representante nem Gerente - limpando unidade e vendedor');
  }
  
  console.log('🔍 Query SQL a executar:');
  console.log('  UPDATE usuarios SET');
  console.log(`    nome = '${data.nome}',`);
  console.log(`    email = '${data.email}',`);
  console.log(`    cargo = '${data.cargo || null}',`);
  console.log(`    nivel_acesso = '${data.nivel_acesso}',`);
  console.log(`    unidade_negocio = '${unidadeNegocio}',`);
  console.log(`    vendedor = '${vendedor}',`);
  console.log(`    updated_at = CURRENT_TIMESTAMP`);
  console.log(`  WHERE id = ${id}`);
  
  await c.env.DB.prepare(
    `UPDATE usuarios 
     SET nome = ?, email = ?, cargo = ?, nivel_acesso = ?, unidade_negocio = ?, vendedor = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).bind(
    data.nome,
    data.email,
    data.cargo || null,
    data.nivel_acesso,
    unidadeNegocio,
    vendedor,
    id
  ).run();
  
  // Buscar dados atualizados para confirmar
  const usuarioAtualizado = await c.env.DB.prepare(
    "SELECT * FROM usuarios WHERE id = ?"
  ).bind(id).first() as any;
  
  console.log('🔍 Dados DEPOIS da atualização:');
  console.log('  - unidade_negocio:', usuarioAtualizado?.unidade_negocio);
  console.log('  - vendedor:', usuarioAtualizado?.vendedor);
  console.log('  - nivel_acesso:', usuarioAtualizado?.nivel_acesso);
  
  console.log('✅ Usuário atualizado com sucesso');
  console.log('='.repeat(60));
  console.log('');
  
  return c.json({ success: true, id: parseInt(id) });
});

app.delete("/api/usuarios/:id", authMiddleware, async (c) => {
  const id = c.req.param("id");
  await c.env.DB.prepare("DELETE FROM usuarios WHERE id = ?").bind(id).run();
  return c.json({ success: true });
});

// ==================== VENDEDORES ENDPOINTS ====================

app.get("/api/vendedores", authMiddleware, async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT id, vendedor, nome_vendedor, negocio, id_negocio, regional FROM vendedores ORDER BY nome_vendedor"
  ).all();
  return c.json(results);
});

// ==================== PRODUTOS ENDPOINTS ====================

app.get("/api/produtos", authMiddleware, async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM produtos ORDER BY nome_produto"
  ).all();
  return c.json(results);
});

app.get("/api/produtos/:id", authMiddleware, async (c) => {
  const id = c.req.param("id");
  const produto = await c.env.DB.prepare(
    "SELECT * FROM produtos WHERE id = ?"
  ).bind(id).first();
  
  if (!produto) {
    return c.json({ error: "Produto não encontrado" }, 404);
  }
  return c.json(produto);
});

app.post("/api/produtos", authMiddleware, async (c) => {
  const data: any = await c.req.json();
  
  const result = await c.env.DB.prepare(
    `INSERT INTO produtos (codigo_produto, nome_produto, categoria, preco_unitario, unidade_medida, fabricante, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    data.codigo_produto,
    data.nome_produto,
    data.categoria || null,
    data.preco_unitario || null,
    data.unidade_medida || null,
    data.fabricante || null,
    data.status
  ).run();
  
  return c.json({ id: result.meta.last_row_id, ...data }, 201);
});

app.put("/api/produtos/:id", authMiddleware, async (c) => {
  const id = c.req.param("id");
  const data: any = await c.req.json();
  
  await c.env.DB.prepare(
    `UPDATE produtos 
     SET codigo_produto = ?, nome_produto = ?, categoria = ?, preco_unitario = ?, 
         unidade_medida = ?, fabricante = ?, status = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).bind(
    data.codigo_produto,
    data.nome_produto,
    data.categoria || null,
    data.preco_unitario || null,
    data.unidade_medida || null,
    data.fabricante || null,
    data.status,
    id
  ).run();
  
  return c.json({ id: parseInt(id), ...data });
});

app.delete("/api/produtos/:id", authMiddleware, async (c) => {
  const id = c.req.param("id");
  await c.env.DB.prepare("DELETE FROM produtos WHERE id = ?").bind(id).run();
  return c.json({ success: true });
});

// ==================== ESTOQUE ENDPOINTS ====================

app.get("/api/estoque", authMiddleware, async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT e.*, p.nome_produto
     FROM estoque e
     JOIN produtos p ON e.codigo_produto = p.codigo_produto
     ORDER BY p.nome_produto`
  ).all();
  return c.json(results);
});

app.post("/api/estoque", authMiddleware, async (c) => {
  const data: any = await c.req.json();
  
  const result = await c.env.DB.prepare(
    `INSERT INTO estoque (codigo_produto, quantidade_estoque, local_armazenamento, estoque_minimo)
     VALUES (?, ?, ?, ?)`
  ).bind(
    data.codigo_produto,
    data.quantidade_estoque,
    data.local_armazenamento || null,
    data.estoque_minimo
  ).run();
  
  return c.json({ id: result.meta.last_row_id, ...data }, 201);
});

app.put("/api/estoque/:id", authMiddleware, async (c) => {
  const id = c.req.param("id");
  const data: any = await c.req.json();
  
  await c.env.DB.prepare(
    `UPDATE estoque 
     SET codigo_produto = ?, quantidade_estoque = ?, local_armazenamento = ?, 
         estoque_minimo = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).bind(
    data.codigo_produto,
    data.quantidade_estoque,
    data.local_armazenamento || null,
    data.estoque_minimo,
    id
  ).run();
  
  return c.json({ id: parseInt(id), ...data });
});

// ==================== BUDGET ENDPOINTS ====================

app.get("/api/budget", authMiddleware, async (c) => {
  const user = c.get("user");
  const db = c.env.DB;
  
  // Buscar nível de acesso do usuário autenticado
  let nivelAcesso = null;
  if (user) {
    const localUser = await db.prepare(
      "SELECT nivel_acesso FROM usuarios WHERE email = ?"
    ).bind(user.email).first() as any;
    nivelAcesso = localUser?.nivel_acesso;
  }
  
  const negocio = c.req.query('negocio');
  const vendedor = c.req.query('vendedor');
  
  let query = `SELECT 
    b.id,
    b.negocio,
    b.vendedor,
    COALESCE(NULLIF(b.nome_vendedor, ''), v.nome_vendedor) as nome_vendedor,
    COALESCE(NULLIF(b.regional, ''), v.regional) as regional,
    v.negocio as nome_negocio,
    b.jan_25, b.fev_25, b.mar_25, b.abr_25, b.mai_25, b.jun_25,
    b.jul_25, b.ago_25, b.set_25, b.out_25, b.nov_25, b.dez_25,
    b.jan_26, b.fev_26, b.mar_26, b.abr_26, b.mai_26, b.jun_26,
    b.jul_26, b.ago_26, b.set_26, b.out_26, b.nov_26, b.dez_26,
    b.created_at, b.updated_at
  FROM budget b
  LEFT JOIN vendedores v ON b.vendedor = v.vendedor
  WHERE 1=1`;
  const params: any[] = [];
  
  if (negocio && negocio !== '') {
    query += " AND b.negocio = ?";
    params.push(negocio);
  }
  
  if (vendedor && vendedor !== '') {
    query += " AND b.vendedor = ?";
    params.push(vendedor);
  }
  
  // Filtro especial para Coord Tec Rum BR: apenas Ruminantes (36) e vendedores 3601, 3602, 3603, 3604
  if (nivelAcesso === 'Coord Tec Rum BR') {
    query += " AND b.negocio = ?";
    params.push('36');
    query += " AND b.vendedor IN (?, ?, ?, ?)";
    params.push('3601', '3602', '3603', '3604');
  }
  
  query += " ORDER BY b.negocio, b.vendedor";
  
  const { results } = await db.prepare(query).bind(...params).all();
  return c.json(results);
});

app.get("/api/budget/representantes", authMiddleware, async (c) => {
  try {
    const user = c.get("user");
    const db = c.env.DB;
    
    // Buscar perfil completo do usuário autenticado
    let userProfile: any = null;
    if (user) {
      userProfile = await db.prepare(
        "SELECT nivel_acesso, unidade_negocio, vendedor FROM usuarios WHERE email = ?"
      ).bind(user.email).first() as any;
    }
    
    const negocioParam = c.req.query('negocio');
    
    // Mapeamento de nome para código de negócio
    const NEGOCIO_NOME_TO_CODIGO: { [key: string]: string } = {
      'Salmix B2B': '10',
      'Ruminantes': '36',
      'Ave/Sui': '42'
    };
    
    // Determinar qual negócio usar para filtro
    let negocioFiltro = negocioParam;
    
    // Se o usuário é Gerente ou Representante, usar SEMPRE a unidade de negócio dele
    // ignorando qualquer outro filtro que possa ser passado
    if (userProfile && (userProfile.nivel_acesso === 'Gerente' || userProfile.nivel_acesso === 'Representante' || userProfile.nivel_acesso === 'Coord Tec Rum BR')) {
      if (userProfile.unidade_negocio) {
        negocioFiltro = userProfile.unidade_negocio;
      }
    }
    
    // Usar tabela vendedores como fonte principal, mas incluir apenas vendedores que têm vendas registradas
    let query = `SELECT DISTINCT 
      v.vendedor, 
      COALESCE(NULLIF(v.nome_vendedor, ''), 'Vendedor ' || v.vendedor) as nome_vendedor, 
      v.regional, 
      v.negocio 
    FROM vendedores v
    WHERE v.vendedor IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM vendas vd 
      WHERE vd.representante = v.vendedor
    )`;
    const params: any[] = [];
    
    // Aplicar filtro de negócio se houver
    if (negocioFiltro && negocioFiltro !== '') {
      const negocioCodigo = NEGOCIO_NOME_TO_CODIGO[negocioFiltro] || negocioFiltro;
      query += " AND v.id_negocio = ?";
      params.push(negocioCodigo);
    }
    
    
    
    // Se for Representante, mostrar apenas o próprio vendedor
    if (userProfile?.nivel_acesso === 'Representante' && userProfile.vendedor) {
      query += " AND v.vendedor = ?";
      params.push(userProfile.vendedor);
    }
    
    // Filtro especial para Coord Tec Rum BR: apenas vendedores 3601, 3602, 3603, 3604
    if (userProfile?.nivel_acesso === 'Coord Tec Rum BR') {
      query += " AND v.vendedor IN (?, ?, ?, ?)";
      params.push('3601', '3602', '3603', '3604');
    }
    
    query += " ORDER BY v.vendedor";
    
    const { results } = await db.prepare(query).bind(...params).all();
    
    return c.json(results);
  } catch (error) {
    console.error('Erro ao buscar representantes:', error);
    return c.json([]);
  }
});

// ==================== VENDAS ENDPOINTS ====================

app.get("/api/vendas/meta", authMiddleware, async (c) => {
  const {
    dataFim: dataFimParam,
    representante,
    negocio: negocioParam,
    tipo = 'ytd'
  } = c.req.query();

  const db = c.env.DB;
  let metaTotal = 0;
  
  try {
    // Importar funções de mapeamento de negócio
    const { obterCodigoNegocio } = await import('@/shared/negocio-mapping');
    
    // Converter nome de negócio para código se necessário
    // Budget usa códigos (10, 36, 42), não nomes
    const negocio = negocioParam ? obterCodigoNegocio(negocioParam) : null;
    
    // Detectar dinamicamente o último mês com dados na base para cálculo da meta
    const ultimaVendaResult = await db.prepare(
      "SELECT MAX(data_venda) as ultima_data FROM vendas WHERE data_venda IS NOT NULL"
    ).first() as any;
    
    let mesFinal = 11; // Fallback padrão (novembro)
    
    if (ultimaVendaResult?.ultima_data) {
      const dataPartes = ultimaVendaResult.ultima_data.split('-');
      mesFinal = parseInt(dataPartes[1]);
    }
    
    if (dataFimParam) {
      // Se há filtro de data_fim, usar o mês da data_fim
      const [, mesFim] = dataFimParam.split('-').map(Number);
      mesFinal = mesFim;
    }
    
    // DETECÇÃO AUTOMÁTICA: Buscar o ano mais recente com dados na base
    const anoMaisRecenteResult = await db.prepare(
      "SELECT MAX(strftime('%Y', data_venda)) as ano_mais_recente FROM vendas WHERE data_venda IS NOT NULL"
    ).first() as any;
    
    const anoCorrente = parseInt(anoMaisRecenteResult?.ano_mais_recente || '2025');
    const anoSufixo = anoCorrente.toString().slice(-2); // '25' para 2025, '26' para 2026
    
    console.log('🎯 /api/vendas/meta - ANO DETECTADO:', anoCorrente, 'SUFIXO:', anoSufixo);
    
    if (tipo === 'mensal') {
      // Meta mensal: apenas o mês específico - usar sufixo dinâmico
      const mesesNomes = [
        `jan_${anoSufixo}`, `fev_${anoSufixo}`, `mar_${anoSufixo}`, `abr_${anoSufixo}`, 
        `mai_${anoSufixo}`, `jun_${anoSufixo}`, `jul_${anoSufixo}`, `ago_${anoSufixo}`, 
        `set_${anoSufixo}`, `out_${anoSufixo}`, `nov_${anoSufixo}`, `dez_${anoSufixo}`
      ];
      
      const mesBudget = mesesNomes[mesFinal - 1];
      console.log('Mês budget:', mesBudget);
      
      let whereClause = "WHERE negocio != '10'";
      const params: any[] = [];
      
      if (negocio && negocio !== '') {
        whereClause += " AND negocio = ?";
        params.push(negocio);
      }
      
      if (representante && representante !== '') {
        whereClause += " AND vendedor = ?";
        params.push(representante);
      }
      
      const query = `SELECT SUM(COALESCE(${mesBudget}, 0)) as meta_total FROM budget ${whereClause}`;
      console.log('Query mensal:', query);
      console.log('Params mensal:', params);
      
      // Debug: verificar o que realmente está na tabela
      const debugQuery = `SELECT negocio, vendedor, ${mesBudget} FROM budget ${whereClause}`;
      const debugResult = await db.prepare(debugQuery).bind(...params).all();
      console.log('Debug - Registros encontrados:', JSON.stringify(debugResult.results));
      
      const result = await db.prepare(query).bind(...params).first() as any;
      console.log('Resultado mensal:', result);
      metaTotal = result?.meta_total || 0;
      
    } else {
      // Meta YTD: soma de janeiro até o mês final - usar sufixo dinâmico
      const mesesNomes = [
        `jan_${anoSufixo}`, `fev_${anoSufixo}`, `mar_${anoSufixo}`, `abr_${anoSufixo}`, 
        `mai_${anoSufixo}`, `jun_${anoSufixo}`, `jul_${anoSufixo}`, `ago_${anoSufixo}`, 
        `set_${anoSufixo}`, `out_${anoSufixo}`, `nov_${anoSufixo}`, `dez_${anoSufixo}`
      ];
      
      // Meses de janeiro (índice 0) até mesFinal (índice mesFinal-1)
      const mesesIncluir = mesesNomes.slice(0, mesFinal);
      console.log('Meses incluir:', mesesIncluir);
      
      if (mesesIncluir.length === 0) {
        return c.json({ meta: 0 });
      }
      
      let whereClause = "WHERE negocio != '10'";
      const params: any[] = [];
      
      if (negocio && negocio !== '') {
        whereClause += " AND negocio = ?";
        params.push(negocio);
      }
      
      if (representante && representante !== '') {
        whereClause += " AND vendedor = ?";
        params.push(representante);
      }
      
      // Corrigido: somar os meses dentro de cada linha primeiro, depois agregar as linhas
      const somaMeses = mesesIncluir.map(mes => `COALESCE(${mes}, 0)`).join(' + ');
      const query = `SELECT SUM(${somaMeses}) as meta_total FROM budget ${whereClause}`;
      console.log('Query YTD:', query);
      console.log('Params YTD:', params);
      
      // Debug: verificar o que realmente está na tabela
      const debugQuery = `SELECT negocio, vendedor, ${mesesIncluir.join(', ')} FROM budget ${whereClause}`;
      const debugResult = await db.prepare(debugQuery).bind(...params).all();
      console.log('Debug - Registros encontrados:', JSON.stringify(debugResult.results));
      
      const result = await db.prepare(query).bind(...params).first() as any;
      console.log('Resultado YTD:', result);
      metaTotal = result?.meta_total || 0;
    }
    
    console.log('Meta final calculada:', metaTotal);
    console.log('==============================');
    
  } catch (error) {
    console.error('Erro ao calcular meta:', error);
    metaTotal = 0;
  }
  
  return c.json({ meta: metaTotal });
});

app.get("/api/vendas", authMiddleware, async (c) => {
  const user = c.get("user");
  const db = c.env.DB;
  
  // Buscar nível de acesso do usuário autenticado
  let nivelAcesso = null;
  if (user) {
    const localUser = await db.prepare(
      "SELECT nivel_acesso FROM usuarios WHERE email = ?"
    ).bind(user.email).first() as any;
    nivelAcesso = localUser?.nivel_acesso;
  }
  
  const {
    dataInicio,
    dataFim,
    representante,
    regiao,
    produto,
    cliente,
    valorMinimo,
    valorMaximo,
    negocio: negocioParam
  } = c.req.query();

  // Converter nome de negócio para código se necessário
  let negocio = negocioParam;
  if (negocioParam) {
    const NEGOCIO_NOME_TO_CODIGO: { [key: string]: string } = {
      'Salmix B2B': '10',
      'Ruminantes': '36',
      'Ave/Sui': '42'
    };
    
    // Se o valor recebido é um nome, converter para código
    negocio = NEGOCIO_NOME_TO_CODIGO[negocioParam] || negocioParam;
  }

  let query = "SELECT v.*, vend.negocio FROM vendas v LEFT JOIN vendedores vend ON v.representante = vend.vendedor WHERE v.valor_total IS NOT NULL AND v.valor_total > 0";
  const params: any[] = [];

  // Aplicar TODOS os filtros no backend para evitar problemas com LIMIT
  // Date filters (primários)
  // IMPORTANTE: Se não houver filtros de data, aplicar YTD automaticamente (Janeiro até mês atual do ano corrente)
  if (dataInicio && dataInicio !== '') {
    query += " AND v.data_venda >= ?";
    params.push(dataInicio);
  } else {
    // SEM filtro de início: forçar início do ano corrente (Janeiro)
    const hoje = new Date();
    const anoCorrente = hoje.getFullYear();
    query += " AND v.data_venda >= ?";
    params.push(`${anoCorrente}-01-01`);
  }
  
  if (dataFim && dataFim !== '') {
    query += " AND v.data_venda <= ?";
    params.push(dataFim);
  } else {
    // SEM filtro de fim: detectar último mês com dados no ano corrente
    const hoje = new Date();
    const anoCorrente = hoje.getFullYear();
    
    // Buscar última venda do ano corrente
    const ultimaVendaAno = await db.prepare(
      "SELECT MAX(data_venda) as ultima_data FROM vendas WHERE strftime('%Y', data_venda) = ?"
    ).bind(anoCorrente.toString()).first() as any;
    
    let dataLimite = `${anoCorrente}-11-30`;
    
    if (ultimaVendaAno?.ultima_data) {
      // Usar diretamente a última data encontrada no banco
      dataLimite = ultimaVendaAno.ultima_data;
    }
    
    query += " AND v.data_venda <= ?";
    params.push(dataLimite);
  }

  // Primary filters (negócio, representante)
  if (negocio && negocio !== '') {
    query += " AND COALESCE(v.negocio, vend.negocio) = ?";
    params.push(negocio);
  }
  if (representante && representante !== '') {
    query += " AND v.representante = ?";
    params.push(representante);
  }

  // Secondary filters (região, produto, cliente)
  if (regiao && regiao !== '') {
    query += " AND v.regiao = ?";
    params.push(regiao);
  }
  if (produto && produto !== '') {
    query += " AND v.nome_produto = ?";
    params.push(produto);
  }
  if (cliente && cliente !== '') {
    query += " AND (v.nome_cliente = ? OR v.cliente = ?)";
    params.push(cliente, cliente);
  }

  // Value filters
  if (valorMinimo && valorMinimo !== '') {
    query += " AND v.valor_total >= ?";
    params.push(parseFloat(valorMinimo));
  }
  if (valorMaximo && valorMaximo !== '') {
    query += " AND v.valor_total <= ?";
    params.push(parseFloat(valorMaximo));
  }
  
  // Filtro especial para Coord Tec Rum BR: apenas Ruminantes (36) e vendedores 3601, 3602, 3603, 3604
  if (nivelAcesso === 'Coord Tec Rum BR') {
    query += " AND COALESCE(v.negocio, vend.negocio) = ?";
    params.push('36');
    query += " AND v.representante IN (?, ?, ?, ?)";
    params.push('3601', '3602', '3603', '3604');
  }

  // Ordenar por data, mas sem LIMIT rígido - os filtros YTD já limitam naturalmente os dados
  query += " ORDER BY v.data_venda DESC LIMIT 50000";

  const stmt = db.prepare(query);
  const { results } = await stmt.bind(...params).all();
  
  // DEBUG: Analisar distribuição de vendas por mês
  console.log('=== DEBUG /api/vendas ===');
  console.log('Total de vendas retornadas:', results.length);
  
  const vendasPorMes = new Map<string, number>();
  (results as any[]).forEach(v => {
    if (v.data_venda && v.data_venda.length >= 7) {
      const mesAno = v.data_venda.substring(0, 7);
      vendasPorMes.set(mesAno, (vendasPorMes.get(mesAno) || 0) + 1);
    }
  });
  
  const mesesOrdenados = Array.from(vendasPorMes.keys()).sort();
  console.log('Vendas por mês:');
  mesesOrdenados.forEach(mes => {
    console.log(`  ${mes}: ${vendasPorMes.get(mes)} vendas`);
  });
  console.log('========================');
  
  return c.json(results);
});

app.post("/api/vendas", authMiddleware, async (c) => {
  const data: any = await c.req.json();
  
  const result = await c.env.DB.prepare(
    `INSERT INTO vendas (data_venda, codigo_produto, nome_produto, quantidade, valor_unitario, valor_total, representante, regiao, cliente, nome_cliente, negocio)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    data.data_venda,
    data.codigo_produto,
    data.nome_produto,
    data.quantidade,
    data.valor_unitario,
    data.valor_total,
    data.representante || null,
    data.regiao || null,
    data.cliente || null,
    data.nome_cliente || null,
    data.negocio || null
  ).run();
  
  return c.json({ id: result.meta.last_row_id, ...data }, 201);
});

// ==================== DATA MANAGEMENT ENDPOINTS ====================

// Endpoint para remover duplicatas entre 2024 e 2025
app.post("/api/data/remove-duplicatas-2024-2025", authMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    
    // DIAGNÓSTICO INICIAL
    const vendas2024Antes = await db.prepare(
      "SELECT COUNT(*) as total FROM vendas WHERE strftime('%Y', data_venda) = '2024'"
    ).first() as any;
    
    const vendas2025Total = await db.prepare(
      "SELECT COUNT(*) as total FROM vendas WHERE strftime('%Y', data_venda) = '2025'"
    ).first() as any;
    
    // Identificar IDs de vendas de 2024 que são duplicatas de vendas de 2025
    // Uma venda é considerada duplicata se tem: mesmo produto, mesma quantidade, mesmo valor unitário,
    // mesmo cliente e mesmo representante
    const duplicatasResult = await db.prepare(
      `SELECT v2024.id, v2024.valor_total
       FROM vendas v2024
       INNER JOIN vendas v2025 ON 
         v2024.codigo_produto = v2025.codigo_produto
         AND v2024.quantidade = v2025.quantidade
         AND v2024.valor_unitario = v2025.valor_unitario
         AND v2024.cliente = v2025.cliente
         AND v2024.representante = v2025.representante
       WHERE strftime('%Y', v2024.data_venda) = '2024'
         AND strftime('%Y', v2025.data_venda) = '2025'`
    ).all();
    
    const duplicatasIds = (duplicatasResult.results as any[]).map(d => d.id);
    const valorRemovido = (duplicatasResult.results as any[]).reduce((sum, d) => sum + (d.valor_total || 0), 0);
    
    if (duplicatasIds.length === 0) {
      return c.json({
        success: true,
        message: 'Nenhuma duplicata encontrada entre 2024 e 2025.',
        duplicatasRemovidas: 0,
        valorRemovido: 0,
        diagnostico: {
          vendas2024Antes: vendas2024Antes?.total || 0,
          vendas2024Depois: vendas2024Antes?.total || 0,
          vendas2025: vendas2025Total?.total || 0
        }
      });
    }
    
    // Deletar duplicatas em lotes menores para evitar timeout e limite de variáveis SQL
    // SQLite tem limite de 999 variáveis, então usar lotes de 200 para segurança
    const BATCH_SIZE = 200;
    let totalRemovidas = 0;
    
    for (let i = 0; i < duplicatasIds.length; i += BATCH_SIZE) {
      const batch = duplicatasIds.slice(i, i + BATCH_SIZE);
      const placeholders = batch.map(() => '?').join(',');
      
      const result = await db.prepare(
        `DELETE FROM vendas WHERE id IN (${placeholders})`
      ).bind(...batch).run();
      
      totalRemovidas += result.meta.changes || 0;
    }
    
    // DIAGNÓSTICO FINAL
    const vendas2024Depois = await db.prepare(
      "SELECT COUNT(*) as total FROM vendas WHERE strftime('%Y', data_venda) = '2024'"
    ).first() as any;
    
    return c.json({
      success: true,
      message: `Duplicatas removidas com sucesso! ${totalRemovidas} vendas de 2024 que eram duplicatas de 2025 foram deletadas.`,
      duplicatasRemovidas: totalRemovidas,
      valorRemovido: valorRemovido,
      diagnostico: {
        vendas2024Antes: vendas2024Antes?.total || 0,
        vendas2024Depois: vendas2024Depois?.total || 0,
        vendas2025: vendas2025Total?.total || 0
      }
    });
    
  } catch (error) {
    console.error('Erro ao remover duplicatas:', error);
    return c.json({
      success: false,
      message: 'Erro ao executar remoção: ' + String(error)
    }, 500);
  }
});

// Endpoint específico para reclassificar vendas do representante 1001 para Salmix B2B
app.post("/api/data/fix-salmix-vendedor-1001", authMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    
    // Reclassificar TODAS as vendas do representante 1001 para o negócio Salmix B2B (código 10)
    // Independente do ano ou negócio atual
    const resultado = await db.prepare(
      `UPDATE vendas 
       SET negocio = '10'
       WHERE representante = '1001'
       AND negocio != '10'`
    ).run();
    
    const vendasReclassificadas = resultado.meta.changes || 0;
    
    // Buscar o valor total reclassificado
    const valorResult = await db.prepare(
      `SELECT SUM(valor_total) as total
       FROM vendas 
       WHERE representante = '1001'
       AND negocio = '10'`
    ).first() as any;
    
    const valorTotal = valorResult?.total || 0;
    
    return c.json({
      success: true,
      message: `Correção concluída! ${vendasReclassificadas} vendas do representante 1001 foram reclassificadas para Salmix B2B.`,
      vendasReclassificadas,
      valorTotal
    });
    
  } catch (error) {
    console.error('Erro ao reclassificar vendas:', error);
    return c.json({
      success: false,
      message: 'Erro ao executar correção: ' + String(error)
    }, 500);
  }
});

// Endpoint específico para correção Salmix 2024
// Consolida todas as correções necessárias para dados Salmix 2024
app.post("/api/data/fix-salmix-2024", authMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    
    // DIAGNÓSTICO INICIAL
    const diagnosticoInicial = await db.prepare(
      `SELECT 
        COUNT(*) as total_vendas,
        SUM(valor_total) as valor_total,
        COUNT(DISTINCT representante) as total_vendedores
       FROM vendas 
       WHERE strftime('%Y', data_venda) = '2024'
       AND negocio = '10'`
    ).first() as any;
    
    // ETAPA 1: Corrigir vendedor 000001 e 1 para 1001 e atribuir negócio Salmix B2B (código 10)
    const corrigeVendedor000001Result = await db.prepare(
      `UPDATE vendas 
       SET representante = '1001', negocio = '10'
       WHERE strftime('%Y', data_venda) = '2024'
       AND representante = '000001'`
    ).run();
    
    const corrigeVendedor1Result = await db.prepare(
      `UPDATE vendas 
       SET representante = '1001', negocio = '10'
       WHERE representante = '1'`
    ).run();
    
    const vendedorCorrigido = (corrigeVendedor000001Result.meta.changes || 0) + (corrigeVendedor1Result.meta.changes || 0);
    
    // ETAPA 2: Atribuir negócio correto a todas as vendas de 2024 que não têm negócio
    const atribuiNegocioResult = await db.prepare(
      `UPDATE vendas 
       SET negocio = (
         SELECT vend.id_negocio 
         FROM vendedores vend 
         WHERE vend.vendedor = vendas.representante
       )
       WHERE strftime('%Y', data_venda) = '2024'
       AND (negocio IS NULL OR negocio = '')
       AND representante IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM vendedores vend 
         WHERE vend.vendedor = vendas.representante 
         AND vend.id_negocio IS NOT NULL
       )`
    ).run();
    
    const negociosAtribuidos = atribuiNegocioResult.meta.changes || 0;
    
    // ETAPA 3: Reclassificar TODAS as vendas do representante 1001 para Salmix B2B (código 10)
    const reclassificaVendedor1001Result = await db.prepare(
      `UPDATE vendas 
       SET negocio = '10'
       WHERE representante = '1001'
       AND negocio != '10'`
    ).run();
    
    const vendasReclassificadas = reclassificaVendedor1001Result.meta.changes || 0;
    
    // DIAGNÓSTICO FINAL
    const diagnosticoFinal = await db.prepare(
      `SELECT 
        COUNT(*) as total_vendas,
        SUM(valor_total) as valor_total,
        COUNT(DISTINCT representante) as total_vendedores
       FROM vendas 
       WHERE strftime('%Y', data_venda) = '2024'
       AND negocio = '10'`
    ).first() as any;
    
    const valorInicial = diagnosticoInicial?.valor_total || 0;
    const valorFinal = diagnosticoFinal?.valor_total || 0;
    const diferencaValor = valorFinal - valorInicial;
    
    return c.json({
      success: true,
      message: `Correção Salmix 2024 concluída. ${vendedorCorrigido} vendas do vendedor 000001/1 corrigidas, ${negociosAtribuidos} negócios atribuídos, ${vendasReclassificadas} vendas reclassificadas. Valor inicial: R$ ${valorInicial.toFixed(2)}, Valor final: R$ ${valorFinal.toFixed(2)}, Diferença: R$ ${diferencaValor.toFixed(2)}`,
      vendedorCorrigido,
      negociosAtribuidos,
      vendasReclassificadas,
      diagnostico: {
        valorInicial: valorInicial,
        valorFinal: valorFinal,
        diferencaValor: diferencaValor,
        vendasInicial: diagnosticoInicial?.total_vendas || 0,
        vendasFinal: diagnosticoFinal?.total_vendas || 0
      }
    });
    
  } catch (error) {
    console.error('Erro ao corrigir Salmix 2024:', error);
    return c.json({
      success: false,
      message: 'Erro ao executar correção: ' + String(error)
    }, 500);
  }
});

// Endpoint específico para limpar apenas dados de 2024
app.post("/api/data/clear-2024", authMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    
    // Limpar apenas vendas de 2024
    const result = await db.prepare(
      "DELETE FROM vendas WHERE strftime('%Y', data_venda) = '2024'"
    ).run();
    
    return c.json({
      success: true,
      message: `${result.meta.changes || 0} registro(s) de vendas de 2024 removido(s) com sucesso.`,
      registrosRemovidos: result.meta.changes || 0
    });
    
  } catch (error) {
    return c.json({
      success: false,
      message: 'Erro ao limpar dados de 2024',
      error: String(error)
    }, 500);
  }
});

// Endpoint específico para limpar apenas dados de 2025
app.post("/api/data/clear-2025", authMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    
    // Limpar apenas vendas de 2025
    const result = await db.prepare(
      "DELETE FROM vendas WHERE strftime('%Y', data_venda) = '2025'"
    ).run();
    
    return c.json({
      success: true,
      message: `${result.meta.changes || 0} registro(s) de vendas de 2025 removido(s) com sucesso.`,
      registrosRemovidos: result.meta.changes || 0
    });
    
  } catch (error) {
    return c.json({
      success: false,
      message: 'Erro ao limpar dados de 2025',
      error: String(error)
    }, 500);
  }
});

// Endpoint para limpar dados importados (mantém estrutura e regras)
app.delete("/api/data/clear", authMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    
    // Limpar dados das tabelas principais (preserva usuários e estrutura)
    await db.prepare("DELETE FROM vendas").run();
    await db.prepare("DELETE FROM produtos").run();
    await db.prepare("DELETE FROM estoque").run();
    await db.prepare("DELETE FROM previsao_vendas").run();
    await db.prepare("DELETE FROM budget").run();
    
    return c.json({
      success: true,
      message: 'Dados importados limpos com sucesso. Estrutura e regras preservadas.',
      cleared: ['vendas', 'produtos', 'estoque', 'previsao_vendas', 'budget']
    });
    
  } catch (error) {
    return c.json({
      success: false,
      message: 'Erro ao limpar dados',
      error: String(error)
    }, 500);
  }
});

// ==================== FORECAST ENDPOINTS ====================

app.get("/api/forecast", authMiddleware, async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM previsao_vendas ORDER BY ano DESC, mes DESC, nome_produto"
  ).all();
  return c.json(results);
});

app.get("/api/forecast/kpis", authMiddleware, async (c) => {
  const periodo = c.req.query('periodo') || '2024-12';
  const [ano, mes] = periodo.split('-');
  
  const db = c.env.DB;
  const anoNum = parseInt(ano);
  const mesNum = parseInt(mes);
  
  // Buscar previsões do período
  const previsoesPeriodo = await db.prepare(
    `SELECT * FROM previsao_vendas 
     WHERE ano = ? AND mes = ?
     ORDER BY nome_produto`
  ).bind(anoNum, mesNum).all();
  
  // Calcular KPIs
  const previsaoTotal = (previsoesPeriodo.results as any[]).reduce((total, item) => {
    const valor = (item.quantidade_prevista || 0) * (item.preco_previsto || 0);
    return total + valor;
  }, 0);
  
  const metaDoMes = previsaoTotal * 1.15; // Meta 15% acima da previsão
  
  const produtosEmRisco = (previsoesPeriodo.results as any[]).filter(item => 
    (item.quantidade_prevista || 0) < 100
  ).length;
  
  // Top produtos do período
  const topProdutos = (previsoesPeriodo.results as any[])
    .map(item => ({
      produto: item.nome_produto,
      forecast: (item.quantidade_prevista || 0) * (item.preco_previsto || 0),
      confidence: Math.min(95, Math.max(75, 85 + Math.random() * 15)) // Simular confidence
    }))
    .sort((a, b) => b.forecast - a.forecast)
    .slice(0, 5);
  
  // Buscar dados reais YTD do ano em vigor - Forecast vs Realizado
  const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const forecastVsRealizado: any[] = [];
  
  // Calcular YTD até o mês atual do ano
  const hoje = new Date();
  const anoAtual = hoje.getFullYear();
  const mesAtual = hoje.getMonth() + 1; // getMonth() retorna 0-11
  
  // Para cada mês YTD do ano atual
  for (let m = 1; m <= mesAtual; m++) {
    const mesFormatado = m.toString().padStart(2, '0');
    
    // Buscar previsão do mês
    const previsaoMes = await db.prepare(
      `SELECT SUM((quantidade_prevista * COALESCE(preco_previsto, 0))) as total_forecast
       FROM previsao_vendas 
       WHERE ano = ? AND mes = ?`
    ).bind(anoAtual, m).first() as any;
    
    // Buscar vendas reais do mês
    const vendasMes = await db.prepare(
      `SELECT COALESCE(SUM(valor_total), 0) as total_vendas
       FROM vendas 
       WHERE strftime('%Y-%m', data_venda) = ?`
    ).bind(`${anoAtual}-${mesFormatado}`).first() as any;
    
    const forecast = previsaoMes?.total_forecast || 0;
    const realizado = vendasMes?.total_vendas || 0;
    
    forecastVsRealizado.push({
      mes: `${mesesNomes[m - 1]} ${anoAtual}`,
      forecast: Math.round(forecast * 100) / 100,
      realizado: Math.round(realizado * 100) / 100
    });
  }
  
  const kpis = {
    metaDoMes,
    previsaoAtual: previsaoTotal,
    acuraciaMedia: 92, // Valor padrão
    produtosEmRisco,
    topProdutosForecast: topProdutos,
    forecastVsRealizado
  };
  
  return c.json(kpis);
});

app.post("/api/forecast", authMiddleware, async (c) => {
  const data = await c.req.json();
  
  const result = await c.env.DB.prepare(
    `INSERT INTO previsao_vendas (mes, ano, codigo_produto, nome_produto, quantidade_prevista, preco_previsto, negocio)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    data.mes,
    data.ano,
    data.codigo_produto,
    data.nome_produto,
    data.quantidade_prevista,
    data.preco_previsto || null,
    data.negocio || null
  ).run();
  
  return c.json({ id: result.meta.last_row_id, ...data }, 201);
});

app.put("/api/forecast/:id", authMiddleware, async (c) => {
  const id = c.req.param("id");
  const data = await c.req.json();
  
  await c.env.DB.prepare(
    `UPDATE previsao_vendas 
     SET mes = ?, ano = ?, codigo_produto = ?, nome_produto = ?, 
         quantidade_prevista = ?, preco_previsto = ?, negocio = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).bind(
    data.mes,
    data.ano,
    data.codigo_produto,
    data.nome_produto,
    data.quantidade_prevista,
    data.preco_previsto || null,
    data.negocio || null,
    id
  ).run();
  
  return c.json({ id: parseInt(id), ...data });
});

app.delete("/api/forecast/:id", authMiddleware, async (c) => {
  const id = c.req.param("id");
  await c.env.DB.prepare("DELETE FROM previsao_vendas WHERE id = ?").bind(id).run();
  return c.json({ success: true });
});

// ==================== AI ENDPOINTS ====================

// Endpoint para gerar comentários executivos de performance
app.post("/api/ai/comentario-executivo", authMiddleware, async (c) => {
  try {
    console.log('🤖 /api/ai/comentario-executivo CHAMADO');
    const data = await c.req.json();
    console.log('📊 Dados recebidos:', JSON.stringify(data));
    
    const apiKey = c.env.OPENAI_API_KEY;
    console.log('🔑 API Key configurada:', apiKey ? 'SIM' : 'NÃO');
    
    if (!apiKey) {
      console.log('⚠️ OPENAI_API_KEY não configurada');
      return c.json({
        success: false,
        comentario: 'Configure OPENAI_API_KEY para habilitar comentários de IA.'
      });
    }
    
    // Importar OpenAI dinamicamente
    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey });
    
    // Extrair dados do request
    const {
      segmento,
      status,
      variacao_yoy,
      variacao_mensal,
      participacao,
      tendencia
    } = data;
    
    // Formatar segmento com primeira letra maiúscula
    const segmentoFormatado = segmento.charAt(0).toUpperCase() + segmento.slice(1);
    
    const prompt = `Você é um Gerente de Vendas Sênior com muitos anos de experiência prática no campo, especialista em Saúde e Nutrição Animal no Brasil.

Você já atuou diretamente com equipes comerciais, distribuidores, produtores rurais, cooperativas e grandes contas do agronegócio. Você conhece profundamente o comportamento do mercado, sazonalidade, ciclo produtivo e tomada de decisão do cliente rural brasileiro.

Seu papel é apresentar resultados de vendas para o CEO da empresa, gerando um comentário executivo curto, claro e orientado à decisão.

Regras obrigatórias:
- Máximo de 2 frases de impacto
- Linguagem executiva, clara e direta
- Tom maduro, experiente e confiante
- Não repetir números já exibidos no card
- Não usar emojis
- Não usar termos técnicos excessivos
- Foco em impacto, risco e ação prática
- IMPORTANTE: Ao mencionar o nome do segmento, sempre use "${segmentoFormatado}" com a primeira letra maiúscula exatamente como fornecido

Dados do card:
- Segmento: ${segmentoFormatado}
- Status do indicador: ${status}
- Tendência geral: ${tendencia}
- Variação vs ano anterior: ${variacao_yoy?.toFixed(1) || '0,0'}%
- Variação mensal recente: ${variacao_mensal?.toFixed(1) || '0,0'}%
- Participação no faturamento total: ${participacao?.toFixed(1) || '0,0'}%

Interpretação esperada:
- Se o status for "Crítico", enfatize urgência e necessidade de ação imediata
- Se o status for "Atenção", indique monitoramento próximo e ajustes comerciais
- Se o status for "Estável", reforce consistência e oportunidades de alavancagem
- Se houver crescimento, trate como alavanca estratégica
- Se houver queda, trate como risco ao resultado consolidado
- Sempre considere o contexto do mercado de Saúde e Nutrição Animal no Brasil

Gere apenas o comentário executivo final.`;

    console.log('🚀 Chamando OpenAI API para comentário executivo...');
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { 
          role: 'system', 
          content: 'Você é um Gerente de Vendas Sênior com vasta experiência prática no agronegócio brasileiro, especialista em Saúde e Nutrição Animal. Você conhece profundamente o mercado rural, sazonalidade e comportamento de compra do produtor. Sua linguagem é executiva, madura, experiente e confiante.' 
        },
        { 
          role: 'user', 
          content: prompt 
        }
      ],
      temperature: 0.7,
      max_tokens: 200
    });
    
    console.log('✅ OpenAI respondeu com sucesso');
    const comentario = response.choices[0]?.message?.content || 'Não foi possível gerar comentário no momento.';
    console.log('💡 Comentário gerado:', comentario.substring(0, 100) + '...');
    
    return c.json({
      success: true,
      comentario
    });
    
  } catch (error) {
    console.error('❌ Erro ao gerar comentário executivo:', error);
    console.error('Erro detalhado:', JSON.stringify(error, null, 2));
    return c.json({
      success: false,
      comentario: 'Erro ao gerar comentário. Tente novamente.',
      error: String(error)
    });
  }
});

app.post("/api/ai/briefing-vendas", authMiddleware, async (c) => {
  try {
    console.log('🤖 /api/ai/briefing-vendas CHAMADO');
    const data = await c.req.json();
    console.log('📊 Dados recebidos:', JSON.stringify(data));
    
    const apiKey = c.env.OPENAI_API_KEY;
    console.log('🔑 API Key configurada:', apiKey ? 'SIM' : 'NÃO');
    
    if (!apiKey) {
      console.log('⚠️ OPENAI_API_KEY não configurada');
      return c.json({
        success: false,
        briefing: 'Configure OPENAI_API_KEY para habilitar dicas de IA.'
      });
    }
    
    // Importar OpenAI dinamicamente
    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey });
    
    // Construir prompt baseado nos dados do cliente
    const {
      nome_cliente,
      dias_ultima_compra,
      ticket_medio,
      produto_mais_comprado,
      produto_parou,
      reducao_pedidos,
      compra_regularmente
    } = data;
    
    // Determinar tendência
    let tendencia = 'estável';
    if (reducao_pedidos && reducao_pedidos > 20) {
      tendencia = 'em queda significativa';
    } else if (reducao_pedidos && reducao_pedidos > 0) {
      tendencia = 'em leve queda';
    } else if (dias_ultima_compra <= 30 && compra_regularmente) {
      tendencia = 'positiva e regular';
    }
    
    const prompt = `Você é um Gerente de Vendas Sênior, experiente, prático e direto.
Seu papel é orientar um vendedor externo antes de uma visita.

Com base nos dados abaixo do cliente, gere dicas simples e objetivas para a melhor abordagem comercial hoje.

Regras:
- Linguagem simples (ELI5)
- Máximo de 5 frases curtas
- Tom de orientação, não de cobrança
- Foco em ação prática

Dados do cliente:
- Nome do cliente: ${nome_cliente || 'Não informado'}
- Última compra: ${dias_ultima_compra !== undefined ? `${dias_ultima_compra} dias atrás` : 'Sem histórico'}
- Ticket médio: R$ ${ticket_medio?.toFixed(2) || '0,00'}
- Tendência de compra: ${tendencia}
- Produtos mais comprados: ${produto_mais_comprado || 'Sem dados'}
- Produtos que pararam de comprar: ${produto_parou || 'Nenhum'}

Gere em formato de texto corrido (não use bullet points):
1. Melhor forma de iniciar a conversa
2. Principal foco da visita
3. Produto ou combo a sugerir
4. Alerta importante (se houver)

Responda de forma natural, como se estivesse conversando com o vendedor.`;

    console.log('🚀 Chamando OpenAI API...');
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { 
          role: 'system', 
          content: 'Você é um gerente de vendas experiente que orienta vendedores com linguagem simples e direta.' 
        },
        { 
          role: 'user', 
          content: prompt 
        }
      ],
      temperature: 0.7,
      max_tokens: 300
    });
    
    console.log('✅ OpenAI respondeu com sucesso');
    const briefing = response.choices[0]?.message?.content || 'Não foi possível gerar dicas no momento.';
    console.log('💡 Briefing gerado:', briefing.substring(0, 100) + '...');
    
    return c.json({
      success: true,
      briefing
    });
    
  } catch (error) {
    console.error('❌ Erro ao gerar briefing de IA:', error);
    console.error('Erro detalhado:', JSON.stringify(error, null, 2));
    return c.json({
      success: false,
      briefing: 'Erro ao gerar dicas. Tente novamente.',
      error: String(error)
    });
  }
});

// ==================== ROTA INTELIGENTE ENDPOINTS ====================

app.get("/api/rota-inteligente/clientes", authMiddleware, async (c) => {
  try {
    const user = c.get("user");
    const db = c.env.DB;
    
    if (!user) {
      return c.json({ error: "Usuário não autenticado" }, 401);
    }
    
    // Buscar perfil do usuário
    const localUser = await db.prepare(
      "SELECT * FROM usuarios WHERE email = ?"
    ).bind(user.email).first() as any;
    
    if (!localUser) {
      return c.json({ error: "Usuário não autorizado" }, 401);
    }
    
    // Buscar clientes do negócio do vendedor
    let queryClientes = "SELECT * FROM clientes WHERE ativo = 1";
    const paramsClientes: any[] = [];
    
    if (localUser.unidade_negocio) {
      const NEGOCIO_NOME_TO_CODIGO: { [key: string]: string } = {
        'Salmix B2B': '10',
        'Ruminantes': '36',
        'Ave/Sui': '42'
      };
      const negocioCodigo = NEGOCIO_NOME_TO_CODIGO[localUser.unidade_negocio] || localUser.unidade_negocio;
      queryClientes += " AND negocio = ?";
      paramsClientes.push(negocioCodigo);
    }
    
    const clientesResult = await db.prepare(queryClientes).bind(...paramsClientes).all();
    const clientes = clientesResult.results as any[];
    
    // Buscar vendas dos últimos 12 meses
    const dataLimite = new Date();
    dataLimite.setMonth(dataLimite.getMonth() - 12);
    const dataLimiteStr = dataLimite.toISOString().split('T')[0];
    
    const vendasResult = await db.prepare(
      `SELECT 
         cliente,
         nome_cliente,
         data_venda,
         valor_total
       FROM vendas
       WHERE data_venda >= ?
       ORDER BY data_venda DESC`
    ).bind(dataLimiteStr).all();
    
    const vendas = vendasResult.results as any[];
    
    // Agrupar vendas por cliente
    const vendasPorCliente = new Map<string, any[]>();
    vendas.forEach(venda => {
      const key = venda.cliente || venda.nome_cliente;
      if (!vendasPorCliente.has(key)) {
        vendasPorCliente.set(key, []);
      }
      vendasPorCliente.get(key)!.push(venda);
    });
    
    // Processar cada cliente com inteligência
    const clientesProcessados = clientes.map(cliente => {
      const vendasCliente = vendasPorCliente.get(cliente.codigo_cliente) || 
                            vendasPorCliente.get(cliente.nome_cliente) || 
                            [];
      
      let ultimaCompra: string | null = null;
      let ticketMedio = 0;
      let diasSemComprar = 999;
      
      if (vendasCliente.length > 0) {
        // Última compra
        vendasCliente.sort((a, b) => b.data_venda.localeCompare(a.data_venda));
        ultimaCompra = vendasCliente[0].data_venda;
        
        // Ticket médio
        const totalVendas = vendasCliente.reduce((acc, v) => acc + (v.valor_total || 0), 0);
        ticketMedio = totalVendas / vendasCliente.length;
        
        // Dias sem comprar
        if (ultimaCompra) {
          const hoje = new Date();
          const dataUltimaCompra = new Date(ultimaCompra);
          diasSemComprar = Math.floor((hoje.getTime() - dataUltimaCompra.getTime()) / (1000 * 60 * 60 * 24));
        }
      }
      
      return {
        ...cliente,
        ultimaCompra,
        ticketMedio: Math.round(ticketMedio * 100) / 100,
        diasSemComprar,
        totalVendas: vendasCliente.length,
        telefone: cliente.telefone || null,
        email: cliente.email || null
      };
    });
    
    return c.json(clientesProcessados);
    
  } catch (error) {
    console.error('Erro ao buscar clientes para rota:', error);
    return c.json({ error: "Erro ao buscar clientes" }, 500);
  }
});

app.put("/api/rota-inteligente/clientes/:id/coordenadas", authMiddleware, async (c) => {
  try {
    const id = c.req.param("id");
    const data = await c.req.json();
    
    await c.env.DB.prepare(
      `UPDATE clientes 
       SET latitude = ?, longitude = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).bind(data.latitude, data.longitude, id).run();
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Erro ao atualizar coordenadas:', error);
    return c.json({ error: "Erro ao atualizar coordenadas" }, 500);
  }
});

// ==================== CLIENTES ENDPOINTS ====================

app.get("/api/clientes", authMiddleware, async (c) => {
  const user = c.get("user");
  const db = c.env.DB;
  
  // Buscar nível de acesso do usuário autenticado
  let nivelAcesso = null;
  if (user) {
    const localUser = await db.prepare(
      "SELECT nivel_acesso FROM usuarios WHERE email = ?"
    ).bind(user.email).first() as any;
    nivelAcesso = localUser?.nivel_acesso;
  }
  
  const negocio = c.req.query('negocio');
  
  console.log('');
  console.log('='.repeat(60));
  console.log('🔍 GET /api/clientes CHAMADO');
  console.log('='.repeat(60));
  console.log('  - negocio recebido:', negocio);
  console.log('  - tipo de negocio:', typeof negocio);
  console.log('  - nivel_acesso:', nivelAcesso);
  
  let query = "SELECT * FROM clientes WHERE ativo = 1";
  const params: any[] = [];
  
  if (negocio && negocio !== '') {
    // Mapeamento direto sem import dinâmico
    const NEGOCIO_NOME_TO_CODIGO: { [key: string]: string } = {
      'Salmix B2B': '10',
      'Ruminantes': '36',
      'Ave/Sui': '42'
    };
    
    // Tentar converter nome para código, ou usar o valor como está se já for código
    let negocioCodigo = NEGOCIO_NOME_TO_CODIGO[negocio] || negocio;
    
    console.log('  - negocio convertido para código:', negocioCodigo);
    
    query += " AND negocio = ?";
    params.push(negocioCodigo);
  }
  
  // Filtro especial para Coord Tec Rum BR: apenas Ruminantes (36) - clientes não precisam filtro de vendedor
  if (nivelAcesso === 'Coord Tec Rum BR') {
    query += " AND negocio = ?";
    params.push('36');
    console.log('  - Aplicando filtro para Ruminantes');
  }
  
  query += " ORDER BY nome_cliente";
  
  console.log('  - query final:', query);
  console.log('  - params finais:', JSON.stringify(params));
  
  const { results } = await db.prepare(query).bind(...params).all();
  
  console.log('  - resultados encontrados:', results.length);
  if (results.length > 0) {
    console.log('  - primeiros 3 resultados:', results.slice(0, 3).map((c: any) => ({ 
      id: c.id,
      codigo: c.codigo_cliente, 
      nome: c.nome_cliente, 
      negocio: c.negocio,
      ativo: c.ativo
    })));
  } else {
    console.log('  - ⚠️ NENHUM CLIENTE ENCONTRADO com filtro negocio =', negocio);
    // Debug: buscar TODOS os negócios únicos na tabela
    const todosNegocios = await db.prepare(
      "SELECT DISTINCT negocio FROM clientes WHERE ativo = 1 ORDER BY negocio"
    ).all();
    console.log('  - Negócios únicos na tabela clientes:', todosNegocios.results.map((r: any) => r.negocio));
  }
  
  console.log('='.repeat(60));
  console.log('');
  
  return c.json(results);
});

app.post("/api/clientes", authMiddleware, async (c) => {
  const data = await c.req.json();
  
  const result = await c.env.DB.prepare(
    `INSERT INTO clientes (codigo_cliente, nome_cliente, cnpj, email, telefone, endereco, cidade, estado, categoria, ativo)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    data.codigo_cliente,
    data.nome_cliente,
    data.cnpj || null,
    data.email || null,
    data.telefone || null,
    data.endereco || null,
    data.cidade || null,
    data.estado || null,
    data.categoria || null,
    data.ativo !== undefined ? data.ativo : true
  ).run();
  
  return c.json({ id: result.meta.last_row_id, ...data }, 201);
});

// ==================== INVENTORY ENDPOINTS ====================

app.get("/api/inventory", authMiddleware, async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM inventory ORDER BY product_name, validade DESC"
  ).all();
  return c.json(results);
});

app.post("/api/inventory", authMiddleware, async (c) => {
  const data = await c.req.json();
  
  const result = await c.env.DB.prepare(
    `INSERT INTO inventory (product_id, product_name, lote, validade, quantidade_disponivel, unidade_medida, armazem, data_atualizacao)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    data.product_id,
    data.product_name,
    data.lote || null,
    data.validade || null,
    data.quantidade_disponivel || 0,
    data.unidade_medida || null,
    data.armazem || null,
    data.data_atualizacao || new Date().toISOString()
  ).run();
  
  return c.json({ id: result.meta.last_row_id, ...data }, 201);
});

// ==================== PRICE TABLE ENDPOINTS ====================

app.get("/api/price-table", authMiddleware, async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM price_table ORDER BY product_name"
  ).all();
  return c.json(results);
});

app.post("/api/price-table", authMiddleware, async (c) => {
  const data = await c.req.json();
  
  const result = await c.env.DB.prepare(
    `INSERT INTO price_table (product_id, product_name, preco_base, preco_minimo, max_desconto_permitido, politica_preco)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(
    data.product_id,
    data.product_name,
    data.preco_base,
    data.preco_minimo,
    data.max_desconto_permitido || 0.11,
    data.politica_preco || 'padrão'
  ).run();
  
  return c.json({ id: result.meta.last_row_id, ...data }, 201);
});

// ==================== PEDIDO RECIPIENTS ENDPOINTS ====================

app.get("/api/pedido-recipients", authMiddleware, async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM pedido_recipients ORDER BY nome"
  ).all();
  return c.json(results);
});

app.post("/api/pedido-recipients", authMiddleware, async (c) => {
  const data = await c.req.json();
  
  // Verificar se email já existe
  const existingRecipient = await c.env.DB.prepare(
    "SELECT id FROM pedido_recipients WHERE email = ?"
  ).bind(data.email).first();
  
  if (existingRecipient) {
    return c.json({ error: "Este email já está cadastrado" }, 400);
  }
  
  const result = await c.env.DB.prepare(
    `INSERT INTO pedido_recipients (nome, email, ativo)
     VALUES (?, ?, ?)`
  ).bind(
    data.nome,
    data.email,
    true
  ).run();
  
  return c.json({ success: true, id: result.meta.last_row_id }, 201);
});

app.put("/api/pedido-recipients/:id/toggle", authMiddleware, async (c) => {
  const id = c.req.param("id");
  const data = await c.req.json();
  
  await c.env.DB.prepare(
    `UPDATE pedido_recipients 
     SET ativo = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).bind(data.ativo, id).run();
  
  return c.json({ success: true });
});

app.delete("/api/pedido-recipients/:id", authMiddleware, async (c) => {
  const id = c.req.param("id");
  await c.env.DB.prepare("DELETE FROM pedido_recipients WHERE id = ?").bind(id).run();
  return c.json({ success: true });
});

// ==================== SEND XML ENDPOINT ====================

// Função para gerar XML do pedido
function generateOrderXML(order: any, items: any[]): string {
  const formatCurrency = (value: number): string => {
    return value.toFixed(2).replace('.', ',');
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<pedido>\n';
  xml += `  <numero>${order.numero_pedido}</numero>\n`;
  xml += `  <data>${formatDate(order.data_pedido)}</data>\n`;
  xml += `  <vendedor>\n`;
  xml += `    <id>${order.vendedor_id}</id>\n`;
  xml += `    <nome>${order.vendedor_nome}</nome>\n`;
  xml += `  </vendedor>\n`;
  xml += `  <cliente>\n`;
  xml += `    <id>${order.cliente_id}</id>\n`;
  xml += `    <nome>${order.cliente_nome}</nome>\n`;
  if (order.comprador) xml += `    <comprador>${order.comprador}</comprador>\n`;
  if (order.telefone) xml += `    <telefone>${order.telefone}</telefone>\n`;
  xml += `  </cliente>\n`;
  if (order.condicoes_pagamento) {
    xml += `  <condicoes_pagamento>${order.condicoes_pagamento}</condicoes_pagamento>\n`;
  }
  xml += `  <itens>\n`;
  
  for (const item of items) {
    xml += `    <item>\n`;
    xml += `      <codigo_produto>${item.product_id}</codigo_produto>\n`;
    xml += `      <nome_produto>${item.product_name}</nome_produto>\n`;
    if (item.lote) xml += `      <lote>${item.lote}</lote>\n`;
    if (item.validade) xml += `      <validade>${formatDate(item.validade)}</validade>\n`;
    xml += `      <quantidade>${item.quantidade}</quantidade>\n`;
    xml += `      <preco_unitario>${formatCurrency(item.preco_unitario)}</preco_unitario>\n`;
    xml += `      <percentual_desconto>${item.percentual_desconto.toFixed(2)}</percentual_desconto>\n`;
    xml += `      <valor_total>${formatCurrency(item.valor_total)}</valor_total>\n`;
    xml += `    </item>\n`;
  }
  
  xml += `  </itens>\n`;
  xml += `  <valor_total>${formatCurrency(order.valor_total)}</valor_total>\n`;
  if (order.observacoes) {
    xml += `  <observacoes>${order.observacoes}</observacoes>\n`;
  }
  xml += '</pedido>\n';
  
  return xml;
}

app.post("/api/orders/send-xml", authMiddleware, async (c) => {
  try {
    const data = await c.req.json();
    const orderIds = data.orderIds as number[];
    
    if (!orderIds || orderIds.length === 0) {
      return c.json({
        success: false,
        message: 'Nenhum pedido selecionado'
      }, 400);
    }
    
    const db = c.env.DB;
    
    // Buscar destinatários ativos
    const { results: recipients } = await db.prepare(
      "SELECT email, nome FROM pedido_recipients WHERE ativo = 1"
    ).all();
    
    if (!recipients || recipients.length === 0) {
      return c.json({
        success: false,
        message: 'Nenhum destinatário ativo cadastrado para receber pedidos'
      }, 400);
    }
    
    // Verificar se a chave do Resend está configurada
    const apiKey = (c.env as any).RESEND_API_KEY;
    if (!apiKey) {
      return c.json({
        success: false,
        message: 'RESEND_API_KEY não configurada'
      }, 400);
    }
    
    const resend = new Resend(apiKey);
    const recipientEmails = (recipients as any[]).map(r => r.email);
    const attachments: any[] = [];
    
    // Gerar XML para cada pedido
    for (const orderId of orderIds) {
      // Buscar pedido e seus itens
      const order = await db.prepare(
        "SELECT * FROM orders WHERE id = ?"
      ).bind(orderId).first() as any;
      
      if (!order) continue;
      
      const { results: items } = await db.prepare(
        "SELECT * FROM order_items WHERE order_id = ?"
      ).bind(orderId).all();
      
      // Gerar XML
      const xmlContent = generateOrderXML(order, items as any[]);
      
      // Adicionar aos anexos
      attachments.push({
        filename: `${order.numero_pedido}.xml`,
        content: btoa(xmlContent)
      });
      
      // Marcar pedido como XML enviado
      await db.prepare(
        "UPDATE orders SET xml_enviado = 1, xml_enviado_em = CURRENT_TIMESTAMP WHERE id = ?"
      ).bind(orderId).run();
    }
    
    // Enviar email com todos os XMLs anexados
    const { error } = await resend.emails.send({
      from: 'SalesManager <pedidos@salesmanager-demo.daxtellk.com>',
      to: recipientEmails,
      subject: `XMLs de Pedidos - ${orderIds.length} pedido(s)`,
      html: `
        <h2>XMLs de Pedidos</h2>
        <p>Seguem em anexo os arquivos XML dos ${orderIds.length} pedido(s) selecionado(s).</p>
        <p>Arquivos anexados:</p>
        <ul>
          ${attachments.map(a => `<li>${a.filename}</li>`).join('')}
        </ul>
      `,
      attachments
    });
    
    if (error) {
      console.error('Erro ao enviar email:', error);
      return c.json({
        success: false,
        message: 'Erro ao enviar email: ' + JSON.stringify(error)
      }, 500);
    }
    
    return c.json({
      success: true,
      message: `XMLs enviados com sucesso para ${recipientEmails.length} destinatário(s)`,
      recipients: recipientEmails
    });
    
  } catch (error) {
    console.error('Erro ao enviar XMLs:', error);
    return c.json({
      success: false,
      message: 'Erro ao enviar XMLs: ' + String(error)
    }, 500);
  }
});

// ==================== TEST EMAIL ENDPOINT ====================

app.post("/api/test-email", authMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    
    // Buscar destinatários ativos
    const { results: recipients } = await db.prepare(
      "SELECT email, nome FROM pedido_recipients WHERE ativo = 1"
    ).all();
    
    if (!recipients || recipients.length === 0) {
      return c.json({ 
        success: false, 
        message: 'Nenhum destinatário ativo cadastrado para receber pedidos' 
      }, 400);
    }
    
    // Verificar se a chave do Resend está configurada
    const apiKey = (c.env as any).RESEND_API_KEY;
    if (!apiKey) {
      return c.json({ 
        success: false, 
        message: 'RESEND_API_KEY não configurada' 
      }, 400);
    }
    
    // Criar pedido de teste (não será salvo no banco)
    const testOrder = {
      numero_pedido: 'TESTE-' + Date.now(),
      vendedor_id: 'VEND001',
      vendedor_nome: 'Vendedor Teste',
      cliente_id: 'CLI001',
      cliente_nome: 'Cliente Teste Ltda',
      cliente_cnpj: '12.345.678/0001-90',
      cliente_endereco: 'Rua Teste, 123',
      cliente_cidade: 'São Paulo',
      cliente_estado: 'SP',
      comprador: 'João Silva',
      telefone: '(11) 98765-4321',
      condicoes_pagamento: '30/60/90 dias',
      data_pedido: new Date().toISOString(),
      valor_total: 15750.50,
      status: 'teste',
      tem_desconto_fora_politica: true,
      observacoes: 'Este é um e-mail de teste para verificar a configuração do sistema de envio.'
    };
    
    // Criar itens de teste
    const testItems = [
      {
        product_id: 'PROD001',
        product_name: 'Produto Teste A',
        lote: 'LT2024001',
        validade: '2025-12-31',
        quantidade: 100,
        preco_unitario: 50.00,
        percentual_desconto: 10.0,
        valor_desconto: 500.00,
        valor_total: 4500.00,
        fora_politica: false
      },
      {
        product_id: 'PROD002',
        product_name: 'Produto Teste B',
        lote: 'LT2024002',
        validade: '2026-06-30',
        quantidade: 250,
        preco_unitario: 45.00,
        percentual_desconto: 15.0,
        valor_desconto: 1687.50,
        valor_total: 9562.50,
        fora_politica: true
      },
      {
        product_id: 'PROD003',
        product_name: 'Produto Teste C',
        lote: 'LT2024003',
        validade: '2025-09-15',
        quantidade: 50,
        preco_unitario: 37.60,
        percentual_desconto: 5.0,
        valor_desconto: 94.00,
        valor_total: 1786.00,
        fora_politica: false
      }
    ];
    
    // Enviar email de teste
    const logoUrl = new URL('/daxtellk-logomarca.png', c.req.url).toString();
    await sendOrderEmail(c.env, db, testOrder, testItems, logoUrl);
    
    const recipientEmails = (recipients as any[]).map(r => r.email);
    
    return c.json({
      success: true,
      message: `E-mail de teste enviado com sucesso para: ${recipientEmails.join(', ')}`,
      recipients: recipientEmails
    });
    
  } catch (error) {
    console.error('Erro ao enviar e-mail de teste:', error);
    return c.json({
      success: false,
      message: 'Erro ao enviar e-mail de teste',
      error: String(error)
    }, 500);
  }
});

// ==================== ORDERS ENDPOINTS ====================

app.get("/api/orders", authMiddleware, async (c) => {
  // Buscar pedidos
  const { results: ordersResults } = await c.env.DB.prepare(
    "SELECT * FROM orders ORDER BY data_pedido DESC LIMIT 100"
  ).all();
  
  // Para cada pedido, buscar seus itens
  const orders = await Promise.all(
    (ordersResults as any[]).map(async (order) => {
      const { results: itemsResults } = await c.env.DB.prepare(
        "SELECT * FROM order_items WHERE order_id = ? ORDER BY id"
      ).bind(order.id).all();
      
      return {
        ...order,
        items: itemsResults
      };
    })
  );
  
  return c.json(orders);
});

// Função auxiliar para gerar número de pedido
async function generateOrderNumber(db: any): Promise<string> {
  const today = new Date();
  const year = today.getFullYear().toString().slice(-2);
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const day = today.getDate().toString().padStart(2, '0');
  
  // Buscar último pedido do dia
  const prefix = `${year}${month}${day}`;
  const lastOrder = await db.prepare(
    "SELECT numero_pedido FROM orders WHERE numero_pedido LIKE ? ORDER BY numero_pedido DESC LIMIT 1"
  ).bind(`${prefix}%`).first() as any;
  
  let sequence = 1;
  if (lastOrder && lastOrder.numero_pedido) {
    const lastSequence = parseInt(lastOrder.numero_pedido.slice(-4));
    sequence = lastSequence + 1;
  }
  
  return `${prefix}${sequence.toString().padStart(4, '0')}`;
}

// Função auxiliar para gerar PDF do pedido
async function generateOrderPDF(db: any, order: any, items: any[], logoUrl: string): Promise<ArrayBuffer> {
  // Importar dinamicamente jsPDF no worker
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  
  const doc = new jsPDF();
  
  // Helper to format currency
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };
  
  // Buscar informações completas do vendedor
  const vendedor = await db.prepare(
    "SELECT vendedor, nome FROM usuarios WHERE mocha_user_id = ? OR email = ? OR vendedor = ?"
  ).bind(order.vendedor_id, order.vendedor_id, order.vendedor_id).first() as any;
  
  const vendedorCodigo = vendedor?.vendedor || 'N/A';
  const vendedorNome = vendedor?.nome || order.vendedor_nome;
  
  // Add rel001 identifier in top left
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('rel001', 14, 10);
  
  // Header with title centered and logo on the right
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('PEDIDO DE VENDA', 105, 20, { align: 'center' });
  
  // Add logo on the right side
  try {
    doc.addImage(logoUrl, 'PNG', 150, 10, 45, 15);
  } catch (error) {
    console.error('Erro ao adicionar logo ao PDF:', error);
  }
  
  let currentY = 30;
  
  // 1. Pedido
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Pedido: ${order.numero_pedido}`, 14, currentY);
  currentY += 5;
  
  // 2. Data
  doc.text(`Data: ${new Date(order.data_pedido).toLocaleDateString('pt-BR')} às ${new Date(order.data_pedido).toLocaleTimeString('pt-BR')}`, 14, currentY);
  currentY += 8;
  
  // 3. VENDEDOR (título)
  doc.setFont('helvetica', 'bold');
  doc.text('VENDEDOR', 14, currentY);
  currentY += 5;
  
  // 4. Código; Nome
  doc.setFont('helvetica', 'normal');
  doc.text(`Código: ${vendedorCodigo}`, 14, currentY);
  doc.text(`Nome: ${vendedorNome}`, 60, currentY);
  currentY += 8;
  
  // 5. CLIENTE (título)
  doc.setFont('helvetica', 'bold');
  doc.text('CLIENTE', 14, currentY);
  currentY += 5;
  
  // 6. Código; Nome; CNPJ
  doc.setFont('helvetica', 'normal');
  doc.text(`Código: ${order.cliente_id}`, 14, currentY);
  doc.text(`Nome: ${order.cliente_nome}`, 60, currentY);
  currentY += 5;
  
  // Buscar CNPJ do cliente (será necessário passar no objeto order)
  if (order.cliente_cnpj) {
    doc.text(`CNPJ: ${order.cliente_cnpj}`, 14, currentY);
    currentY += 5;
  }
  
  // 7. Endereço; cidade; estado
  if (order.cliente_endereco || order.cliente_cidade || order.cliente_estado) {
    const enderecoCompleto = [
      order.cliente_endereco,
      order.cliente_cidade,
      order.cliente_estado
    ].filter(Boolean).join(', ');
    
    if (enderecoCompleto) {
      doc.text(`Endereço: ${enderecoCompleto}`, 14, currentY);
      currentY += 5;
    }
  }
  
  // 8. Comprador
  if (order.comprador) {
    doc.text(`Comprador: ${order.comprador}`, 14, currentY);
    currentY += 5;
  }
  
  // 9. Telefone
  if (order.telefone) {
    doc.text(`Telefone: ${order.telefone}`, 14, currentY);
    currentY += 5;
  }
  
  // 10. Condições
  doc.text(`Condições: ${order.condicoes_pagamento || 'Não especificado'}`, 14, currentY);
  currentY += 8;
  
  // Helper to format date - simplified and more robust
  const formatDate = (dateString: string | null | undefined): string => {
    // Return empty for null, undefined, or empty values
    if (!dateString || dateString.toString().trim() === '') {
      return '-';
    }
    
    const str = dateString.toString().trim();
    
    // Map Portuguese month abbreviations to numbers
    const monthMap: { [key: string]: string } = {
      'jan': '01', 'fev': '02', 'mar': '03', 'abr': '04',
      'mai': '05', 'jun': '06', 'jul': '07', 'ago': '08',
      'set': '09', 'out': '10', 'nov': '11', 'dez': '12'
    };
    
    // Handle format like "20/out/27"
    if (str.includes('/')) {
      const parts = str.split('/');
      if (parts.length === 3) {
        const day = parts[0].trim();
        const monthPart = parts[1].trim().toLowerCase();
        const yearPart = parts[2].trim();
        
        // Check if month is an abbreviation
        if (monthMap[monthPart]) {
          let year = parseInt(yearPart);
          // Convert 2-digit year to 4-digit (assumes 20xx for < 50, 19xx otherwise)
          if (year < 100) {
            year = year < 50 ? 2000 + year : 1900 + year;
          }
          return `${day.padStart(2, '0')}/${monthMap[monthPart]}/${year}`;
        }
        
        // Try numeric month format DD/MM/YYYY
        const monthNum = parseInt(parts[1]);
        if (monthNum >= 1 && monthNum <= 12) {
          let year = parseInt(yearPart);
          if (year < 100) {
            year = year < 50 ? 2000 + year : 1900 + year;
          }
          return `${day.padStart(2, '0')}/${parts[1].padStart(2, '0')}/${year}`;
        }
      }
    }
    
    // Handle ISO format YYYY-MM-DD
    if (str.includes('-')) {
      const parts = str.split('-');
      if (parts.length === 3) {
        const year = parts[0];
        const month = parts[1];
        const day = parts[2];
        return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
      }
    }
    
    // If we can't parse it, return as-is
    return str;
  };
  
  // Items table
  const tableData = items.map(item => [
    item.product_id,
    item.product_name,
    item.lote || 'N/A',
    formatDate(item.validade),
    item.quantidade.toString(),
    formatCurrency(item.preco_unitario),
    `${item.percentual_desconto.toFixed(1)}%`,
    formatCurrency(item.valor_total)
  ]);
  
  autoTable(doc, {
    startY: currentY,
    head: [['Cód.', 'Produto', 'Lote', 'Validade', 'Qtd', 'Preço Unit.', 'Desc.', 'Total']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [30, 58, 138], fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 55 },
      2: { cellWidth: 20 },
      3: { cellWidth: 22 },
      4: { cellWidth: 15 },
      5: { cellWidth: 22 },
      6: { cellWidth: 15 },
      7: { cellWidth: 25 }
    }
  });
  
  // Total
  const finalY = (doc as any).lastAutoTable.finalY || currentY;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`TOTAL: ${formatCurrency(order.valor_total)}`, 140, finalY + 10);
  
  // Observações
  if (order.observacoes) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Observações:', 14, finalY + 20);
    doc.setFont('helvetica', 'normal');
    const splitText = doc.splitTextToSize(order.observacoes, 180);
    doc.text(splitText, 14, finalY + 25);
  }
  
  // Alert if out of policy
  if (order.tem_desconto_fora_politica) {
    doc.setTextColor(255, 140, 0);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('⚠ PEDIDO CONTÉM DESCONTOS FORA DA POLÍTICA', 105, finalY + 35, { align: 'center' });
    doc.setTextColor(0, 0, 0);
  }
  
  // Return PDF as ArrayBuffer
  return doc.output('arraybuffer');
}

// Função auxiliar para gerar e enviar PDF do pedido por email
async function sendOrderEmail(env: Env, db: any, order: any, items: any[], logoUrl: string): Promise<void> {
  // Buscar destinatários ativos
  const { results: recipients } = await db.prepare(
    "SELECT email, nome FROM pedido_recipients WHERE ativo = 1"
  ).all();
  
  if (!recipients || recipients.length === 0) {
    console.log('⚠️ Nenhum destinatário ativo cadastrado para receber pedidos');
    return;
  }
  
  // Verificar se a chave do Resend está configurada
  const apiKey = (env as any).RESEND_API_KEY;
  if (!apiKey) {
    console.log('⚠️ RESEND_API_KEY não configurada. Email não enviado.');
    console.log(`📧 Email seria enviado para: ${(recipients as any[]).map(r => r.email).join(', ')}`);
    return;
  }
  
  // Gerar PDF
  let pdfBuffer: ArrayBuffer;
  try {
    pdfBuffer = await generateOrderPDF(db, order, items, logoUrl);
  } catch (error) {
    console.error('❌ Erro ao gerar PDF:', error);
    return;
  }
  
  // Buscar informações do cliente
  const cliente = await db.prepare(
    "SELECT email FROM clientes WHERE codigo_cliente = ?"
  ).bind(order.cliente_id).first() as any;
  
  // Enviar email usando Resend
  try {
    const resend = new Resend(apiKey);
    
    // Preparar lista de destinatários
    const recipientEmails = (recipients as any[]).map(r => r.email);
    
    // Adicionar email do cliente se disponível
    const allRecipients = [...recipientEmails];
    if (cliente?.email) {
      allRecipients.push(cliente.email);
    }
    
    const { data, error } = await resend.emails.send({
      from: 'SalesManager <pedidos@salesmanager-demo.daxtellk.com>',
      to: allRecipients,
      subject: `Novo Pedido #${order.numero_pedido} - ${order.cliente_nome}`,
      html: `
        <h2>Novo Pedido Recebido</h2>
        <p><strong>Número do Pedido:</strong> ${order.numero_pedido}</p>
        <p><strong>Cliente:</strong> ${order.cliente_nome}</p>
        <p><strong>Vendedor:</strong> ${order.vendedor_nome}</p>
        <p><strong>Data:</strong> ${new Date(order.data_pedido).toLocaleDateString('pt-BR')} às ${new Date(order.data_pedido).toLocaleTimeString('pt-BR')}</p>
        ${order.comprador ? `<p><strong>Comprador:</strong> ${order.comprador}</p>` : ''}
        ${order.telefone ? `<p><strong>Telefone:</strong> ${order.telefone}</p>` : ''}
        <p><strong>Condições de Pagamento:</strong> ${order.condicoes_pagamento || 'Não especificado'}</p>
        <p><strong>Valor Total:</strong> R$ ${order.valor_total.toFixed(2)}</p>
        <p><strong>Total de Itens:</strong> ${items.length}</p>
        ${order.tem_desconto_fora_politica ? '<p style="color: orange;"><strong>⚠️ Este pedido contém itens com desconto fora da política</strong></p>' : ''}
        ${order.observacoes ? `<p><strong>Observações:</strong> ${order.observacoes}</p>` : ''}
        <p>O arquivo PDF com os detalhes completos do pedido está anexo a este email.</p>
      `,
      attachments: [
        {
          filename: `pedido_${order.numero_pedido}.pdf`,
          content: btoa(String.fromCharCode(...new Uint8Array(pdfBuffer))),
        },
      ],
    });
    
    if (error) {
      console.error('❌ Erro ao enviar email:', error);
      return;
    }
    
    console.log(`✅ Email enviado com sucesso para: ${allRecipients.join(', ')}`);
    console.log(`📧 ID do email: ${data?.id}`);
    
  } catch (error) {
    console.error('❌ Erro ao enviar email via Resend:', error);
  }
}

app.post("/api/orders", authMiddleware, async (c) => {
  const data = await c.req.json();
  
  try {
    const db = c.env.DB;
    
    // Gerar número do pedido
    const numeroPedido = await generateOrderNumber(db);
    
    // Inserir pedido
    const orderResult = await db.prepare(
      `INSERT INTO orders (numero_pedido, vendedor_id, vendedor_nome, cliente_id, cliente_nome, data_pedido, valor_total, status, tem_desconto_fora_politica, observacoes, condicoes_pagamento, comprador, telefone)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      numeroPedido,
      data.vendedor_id,
      data.vendedor_nome,
      data.cliente_id,
      data.cliente_nome,
      data.data_pedido,
      data.valor_total,
      data.status || 'pendente',
      data.tem_desconto_fora_politica || false,
      data.observacoes || null,
      data.condicoes_pagamento || null,
      data.comprador || null,
      data.telefone || null
    ).run();
    
    const orderId = orderResult.meta.last_row_id;
    
    // Inserir itens do pedido
    const items = [];
    for (const item of data.items) {
      await db.prepare(
        `INSERT INTO order_items (order_id, product_id, product_name, lote, validade, quantidade, preco_unitario, percentual_desconto, valor_desconto, valor_total, fora_politica)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        orderId,
        item.product_id,
        item.product_name,
        item.lote || null,
        item.validade || null,
        item.quantidade,
        item.preco_unitario,
        item.percentual_desconto || 0,
        item.valor_desconto || 0,
        item.valor_total,
        item.fora_politica || false
      ).run();
      
      items.push(item);
    }
    
    // Buscar informações completas do cliente para o PDF
    const cliente = await db.prepare(
      "SELECT * FROM clientes WHERE codigo_cliente = ?"
    ).bind(data.cliente_id).first() as any;
    
    // Atualizar status do pedido para "enviado"
    await db.prepare(
      "UPDATE orders SET status = 'enviado', updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).bind(orderId).run();
    
    // Enviar email com PDF
    await sendOrderEmail(c.env, db, {
      ...data,
      numero_pedido: numeroPedido,
      id: orderId,
      cliente_cnpj: cliente?.cnpj,
      cliente_endereco: cliente?.endereco,
      cliente_cidade: cliente?.cidade,
      cliente_estado: cliente?.estado
    }, items, new URL('/daxtellk-logomarca.png', c.req.url).toString());
    
    return c.json({
      success: true,
      id: orderId,
      numero_pedido: numeroPedido,
      message: 'Pedido criado com sucesso'
    }, 201);
    
  } catch (error) {
    console.error('Erro ao criar pedido:', error);
    return c.json({
      success: false,
      error: 'Erro ao criar pedido: ' + String(error)
    }, 500);
  }
});

app.put("/api/orders/:id", authMiddleware, async (c) => {
  const id = c.req.param("id");
  const data = await c.req.json();
  
  try {
    const db = c.env.DB;
    
    // Verificar se o pedido existe
    const existingOrder = await db.prepare(
      "SELECT * FROM orders WHERE id = ?"
    ).bind(id).first() as any;
    
    if (!existingOrder) {
      return c.json({
        success: false,
        error: 'Pedido não encontrado'
      }, 404);
    }
    
    // Atualizar pedido
    await db.prepare(
      `UPDATE orders 
       SET vendedor_id = ?, vendedor_nome = ?, cliente_id = ?, cliente_nome = ?, 
           valor_total = ?, tem_desconto_fora_politica = ?, observacoes = ?, 
           condicoes_pagamento = ?, comprador = ?, telefone = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).bind(
      data.vendedor_id,
      data.vendedor_nome,
      data.cliente_id,
      data.cliente_nome,
      data.valor_total,
      data.tem_desconto_fora_politica || false,
      data.observacoes || null,
      data.condicoes_pagamento || null,
      data.comprador || null,
      data.telefone || null,
      id
    ).run();
    
    // Remover itens antigos
    await db.prepare(
      "DELETE FROM order_items WHERE order_id = ?"
    ).bind(id).run();
    
    // Inserir novos itens
    for (const item of data.items) {
      await db.prepare(
        `INSERT INTO order_items (order_id, product_id, product_name, lote, validade, quantidade, preco_unitario, percentual_desconto, valor_desconto, valor_total, fora_politica)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        id,
        item.product_id,
        item.product_name,
        item.lote || null,
        item.validade || null,
        item.quantidade,
        item.preco_unitario,
        item.percentual_desconto || 0,
        item.valor_desconto || 0,
        item.valor_total,
        item.fora_politica || false
      ).run();
    }
    
    return c.json({
      success: true,
      message: 'Pedido atualizado com sucesso'
    });
    
  } catch (error) {
    console.error('Erro ao atualizar pedido:', error);
    return c.json({
      success: false,
      error: 'Erro ao atualizar pedido: ' + String(error)
    }, 500);
  }
});

// ==================== PRD DOWNLOAD ENDPOINT ====================

app.get("/api/prd/download", authMiddleware, async (c) => {
  try {
    const docxBuffer = await generatePRDDocument();
    
    return new Response(docxBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': 'attachment; filename="VetSalesPro_PRD_v1.0.docx"',
      },
    });
  } catch (error) {
    console.error('Erro ao gerar documento PRD:', error);
    return c.json({
      success: false,
      error: 'Erro ao gerar documento: ' + String(error)
    }, 500);
  }
});

// ==================== DIARIO COMPROMISSOS ENDPOINTS ====================

app.get("/api/diario-compromissos", authMiddleware, async (c) => {
  const user = c.get("user");
  
  if (!user) {
    return c.json({ error: "Usuário não autenticado" }, 401);
  }
  
  // Buscar dados do usuário na tabela local
  const localUser = await c.env.DB.prepare(
    "SELECT * FROM usuarios WHERE email = ?"
  ).bind(user.email).first() as any;
  
  if (!localUser) {
    return c.json({ error: "Usuário não autorizado" }, 401);
  }
  
  // Se for Administrador ou Gerente, pode ver todos os compromissos
  // Caso contrário, vê apenas os próprios
  let query = "SELECT * FROM agenda WHERE tipo_atividade = 'compromisso'";
  const params: any[] = [];
  
  if (localUser.nivel_acesso !== 'Administrador' && localUser.nivel_acesso !== 'Gerente') {
    query += " AND vendedor_id = ?";
    params.push(localUser.vendedor || localUser.mocha_user_id);
  }
  
  query += " ORDER BY data DESC, hora DESC";
  
  const { results } = await c.env.DB.prepare(query).bind(...params).all();
  return c.json(results);
});

app.post("/api/diario-compromissos", authMiddleware, async (c) => {
  const user = c.get("user");
  const data: any = await c.req.json();
  
  if (!user) {
    return c.json({ error: "Usuário não autenticado" }, 401);
  }
  
  // Buscar dados do usuário na tabela local
  const localUser = await c.env.DB.prepare(
    "SELECT * FROM usuarios WHERE email = ?"
  ).bind(user.email).first() as any;
  
  if (!localUser) {
    return c.json({ error: "Usuário não autorizado" }, 401);
  }
  
  // Se não for Administrador/Gerente, só pode criar para si mesmo
  let vendedorId = data.vendedor_id;
  if (localUser.nivel_acesso !== 'Administrador' && localUser.nivel_acesso !== 'Gerente') {
    vendedorId = localUser.vendedor || localUser.mocha_user_id;
  }
  
  const db = c.env.DB;
  
  // Se há data_fim diferente de data, criar compromisso para cada dia do período
  const dataInicio = new Date(data.data + 'T00:00:00');
  const dataFim = new Date((data.data_fim || data.data) + 'T00:00:00');
  
  if (dataFim > dataInicio) {
    // Criar um compromisso para cada dia do período
    const statements = [];
    const currentDate = new Date(dataInicio);
    
    while (currentDate <= dataFim) {
      const dateStr = currentDate.toISOString().split('T')[0];
      statements.push(
        db.prepare(
          `INSERT INTO agenda (vendedor_id, data, data_fim, hora, hora_termino, titulo, observacao, tipo_atividade)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'compromisso')`
        ).bind(
          vendedorId,
          dateStr,
          data.data_fim || data.data,
          data.hora,
          data.hora_termino || null,
          data.titulo,
          data.descricao || null
        )
      );
      
      // Avançar para o próximo dia
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Executar todas as inserções em batch
    await db.batch(statements);
    
    return c.json({ success: true, dias_criados: statements.length, vendedor_id: vendedorId }, 201);
  } else {
    // Compromisso de um único dia
    const result = await db.prepare(
      `INSERT INTO agenda (vendedor_id, data, data_fim, hora, hora_termino, titulo, observacao, tipo_atividade)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'compromisso')`
    ).bind(
      vendedorId,
      data.data,
      data.data_fim || data.data,
      data.hora,
      data.hora_termino || null,
      data.titulo,
      data.descricao || null
    ).run();
    
    return c.json({ id: result.meta.last_row_id, ...data, vendedor_id: vendedorId }, 201);
  }
});

app.put("/api/diario-compromissos/:id", authMiddleware, async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const data: any = await c.req.json();
  
  if (!user) {
    return c.json({ error: "Usuário não autenticado" }, 401);
  }
  
  // Buscar dados do usuário na tabela local
  const localUser = await c.env.DB.prepare(
    "SELECT * FROM usuarios WHERE email = ?"
  ).bind(user.email).first() as any;
  
  if (!localUser) {
    return c.json({ error: "Usuário não autorizado" }, 401);
  }
  
  // Verificar se o compromisso existe
  const existingCompromisso = await c.env.DB.prepare(
    "SELECT * FROM agenda WHERE id = ?"
  ).bind(id).first() as any;
  
  if (!existingCompromisso) {
    return c.json({ error: "Compromisso não encontrado" }, 404);
  }
  
  // Se não for Administrador/Gerente, só pode editar os próprios
  if (localUser.nivel_acesso !== 'Administrador' && localUser.nivel_acesso !== 'Gerente') {
    const userVendedorId = localUser.vendedor || localUser.mocha_user_id;
    if (existingCompromisso.vendedor_id !== userVendedorId) {
      return c.json({ error: "Você não tem permissão para editar este compromisso" }, 403);
    }
  }
  
  const db = c.env.DB;
  
  // Verificar se estamos mudando o período (data ou data_fim)
  const dataInicioNova = new Date(data.data + 'T00:00:00');
  const dataFimNova = new Date((data.data_fim || data.data) + 'T00:00:00');
  const dataInicioAntiga = new Date(existingCompromisso.data + 'T00:00:00');
  const dataFimAntiga = new Date((existingCompromisso.data_fim || existingCompromisso.data) + 'T00:00:00');
  
  const periodoMudou = dataInicioNova.getTime() !== dataInicioAntiga.getTime() || 
                       dataFimNova.getTime() !== dataFimAntiga.getTime();
  
  if (periodoMudou && dataFimNova > dataInicioNova) {
    // Período mudou - deletar registros antigos e criar novos
    // Primeiro, deletar todos os registros do período antigo com mesmo título e vendedor
    await db.prepare(
      `DELETE FROM agenda 
       WHERE vendedor_id = ? 
       AND titulo = ? 
       AND data >= ? 
       AND data <= ?
       AND tipo_atividade = 'compromisso'`
    ).bind(
      existingCompromisso.vendedor_id,
      existingCompromisso.titulo,
      existingCompromisso.data,
      existingCompromisso.data_fim || existingCompromisso.data
    ).run();
    
    // Criar novos registros para cada dia do novo período
    const statements = [];
    const currentDate = new Date(dataInicioNova);
    
    while (currentDate <= dataFimNova) {
      const dateStr = currentDate.toISOString().split('T')[0];
      statements.push(
        db.prepare(
          `INSERT INTO agenda (vendedor_id, data, data_fim, hora, hora_termino, titulo, observacao, tipo_atividade)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'compromisso')`
        ).bind(
          existingCompromisso.vendedor_id,
          dateStr,
          data.data_fim || data.data,
          data.hora,
          data.hora_termino || null,
          data.titulo,
          data.descricao || null
        )
      );
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    await db.batch(statements);
    
    return c.json({ success: true, dias_atualizados: statements.length });
  } else {
    // Período não mudou ou é de um único dia - apenas atualizar
    await db.prepare(
      `UPDATE agenda 
       SET data = ?, data_fim = ?, hora = ?, hora_termino = ?, titulo = ?, observacao = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).bind(
      data.data,
      data.data_fim || data.data,
      data.hora,
      data.hora_termino || null,
      data.titulo,
      data.descricao || null,
      id
    ).run();
    
    return c.json({ id: parseInt(id), ...data });
  }
});

app.delete("/api/diario-compromissos/:id", authMiddleware, async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  
  if (!user) {
    return c.json({ error: "Usuário não autenticado" }, 401);
  }
  
  // Buscar dados do usuário na tabela local
  const localUser = await c.env.DB.prepare(
    "SELECT * FROM usuarios WHERE email = ?"
  ).bind(user.email).first() as any;
  
  if (!localUser) {
    return c.json({ error: "Usuário não autorizado" }, 401);
  }
  
  // Verificar se o compromisso existe
  const existingCompromisso = await c.env.DB.prepare(
    "SELECT * FROM agenda WHERE id = ?"
  ).bind(id).first() as any;
  
  if (!existingCompromisso) {
    return c.json({ error: "Compromisso não encontrado" }, 404);
  }
  
  // Se não for Administrador/Gerente, só pode deletar os próprios
  if (localUser.nivel_acesso !== 'Administrador' && localUser.nivel_acesso !== 'Gerente') {
    const userVendedorId = localUser.vendedor || localUser.mocha_user_id;
    if (existingCompromisso.vendedor_id !== userVendedorId) {
      return c.json({ error: "Você não tem permissão para deletar este compromisso" }, 403);
    }
  }
  
  const db = c.env.DB;
  
  // Se o compromisso tem data_fim, deletar todos os registros do período
  if (existingCompromisso.data_fim && existingCompromisso.data_fim !== existingCompromisso.data) {
    await db.prepare(
      `DELETE FROM agenda 
       WHERE vendedor_id = ? 
       AND titulo = ? 
       AND data >= ? 
       AND data <= ?
       AND tipo_atividade = 'compromisso'`
    ).bind(
      existingCompromisso.vendedor_id,
      existingCompromisso.titulo,
      existingCompromisso.data,
      existingCompromisso.data_fim
    ).run();
  } else {
    // Compromisso de um único dia - deletar apenas este registro
    await db.prepare("DELETE FROM agenda WHERE id = ?").bind(id).run();
  }
  
  return c.json({ success: true });
});

// ==================== AGENDA ENDPOINTS ====================

app.get("/api/agenda", authMiddleware, async (c) => {
  const user = c.get("user");
  
  if (!user) {
    return c.json({ error: "Usuário não autenticado" }, 401);
  }
  
  // Buscar dados do usuário na tabela local
  const localUser = await c.env.DB.prepare(
    "SELECT * FROM usuarios WHERE email = ?"
  ).bind(user.email).first() as any;
  
  if (!localUser) {
    return c.json({ error: "Usuário não autorizado" }, 401);
  }
  
  // Parâmetro de filtro de vendedor (apenas para Administradores)
  const vendedorFiltro = c.req.query('vendedor_id');
  
  // Se for Administrador ou Gerente, pode ver todos os compromissos
  // Caso contrário, vê apenas os próprios
  let query = "SELECT a.*, c.nome_cliente, c.cidade, c.estado, u.nome as vendedor_nome FROM agenda a LEFT JOIN clientes c ON a.cliente_id = c.codigo_cliente LEFT JOIN usuarios u ON a.vendedor_id = u.vendedor OR a.vendedor_id = u.mocha_user_id";
  const params: any[] = [];
  
  if (localUser.nivel_acesso !== 'Administrador' && localUser.nivel_acesso !== 'Gerente') {
    query += " WHERE a.vendedor_id = ?";
    params.push(localUser.vendedor || localUser.mocha_user_id);
  } else if (vendedorFiltro) {
    // Administrador filtrando por vendedor específico
    query += " WHERE a.vendedor_id = ?";
    params.push(vendedorFiltro);
  }
  
  query += " ORDER BY a.data DESC, a.hora DESC";
  
  const { results } = await c.env.DB.prepare(query).bind(...params).all();
  return c.json(results);
});

app.get("/api/agenda/vendedores", authMiddleware, async (c) => {
  const user = c.get("user");
  
  if (!user) {
    return c.json({ error: "Usuário não autenticado" }, 401);
  }
  
  // Buscar dados do usuário na tabela local
  const localUser = await c.env.DB.prepare(
    "SELECT * FROM usuarios WHERE email = ?"
  ).bind(user.email).first() as any;
  
  if (!localUser) {
    return c.json({ error: "Usuário não autorizado" }, 401);
  }
  
  // Apenas Administradores e Gerentes podem listar vendedores
  if (localUser.nivel_acesso !== 'Administrador' && localUser.nivel_acesso !== 'Gerente') {
    return c.json({ error: "Acesso negado" }, 403);
  }
  
  // Buscar vendedores únicos que têm compromissos na agenda
  const { results } = await c.env.DB.prepare(
    `SELECT DISTINCT u.vendedor as vendedor_id, u.nome as vendedor_nome 
     FROM agenda a 
     JOIN usuarios u ON a.vendedor_id = u.vendedor OR a.vendedor_id = u.mocha_user_id
     WHERE u.vendedor IS NOT NULL
     ORDER BY u.nome`
  ).all();
  
  return c.json(results);
});

app.post("/api/agenda", authMiddleware, async (c) => {
  const user = c.get("user");
  const data: any = await c.req.json();
  
  if (!user) {
    return c.json({ error: "Usuário não autenticado" }, 401);
  }
  
  // Buscar dados do usuário na tabela local
  const localUser = await c.env.DB.prepare(
    "SELECT * FROM usuarios WHERE email = ?"
  ).bind(user.email).first() as any;
  
  if (!localUser) {
    return c.json({ error: "Usuário não autorizado" }, 401);
  }
  
  // Se não for Administrador/Gerente, só pode criar para si mesmo
  let vendedorId = data.vendedor_id;
  if (localUser.nivel_acesso !== 'Administrador' && localUser.nivel_acesso !== 'Gerente') {
    vendedorId = localUser.vendedor || localUser.mocha_user_id;
  }
  
  const result = await c.env.DB.prepare(
    `INSERT INTO agenda (vendedor_id, cliente_id, data, hora, tipo_atividade, observacao, mensagem_gerente)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    vendedorId,
    data.cliente_id || null,
    data.data,
    data.hora,
    data.tipo_atividade,
    data.observacao || null,
    data.mensagem_gerente || null
  ).run();
  
  return c.json({ id: result.meta.last_row_id, ...data, vendedor_id: vendedorId }, 201);
});

app.put("/api/agenda/:id", authMiddleware, async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const data: any = await c.req.json();
  
  if (!user) {
    return c.json({ error: "Usuário não autenticado" }, 401);
  }
  
  // Buscar dados do usuário na tabela local
  const localUser = await c.env.DB.prepare(
    "SELECT * FROM usuarios WHERE email = ?"
  ).bind(user.email).first() as any;
  
  if (!localUser) {
    return c.json({ error: "Usuário não autorizado" }, 401);
  }
  
  // Verificar se o compromisso existe
  const existingAgenda = await c.env.DB.prepare(
    "SELECT * FROM agenda WHERE id = ?"
  ).bind(id).first() as any;
  
  if (!existingAgenda) {
    return c.json({ error: "Compromisso não encontrado" }, 404);
  }
  
  // Se não for Administrador/Gerente, só pode editar os próprios
  if (localUser.nivel_acesso !== 'Administrador' && localUser.nivel_acesso !== 'Gerente') {
    const userVendedorId = localUser.vendedor || localUser.mocha_user_id;
    if (existingAgenda.vendedor_id !== userVendedorId) {
      return c.json({ error: "Você não tem permissão para editar este compromisso" }, 403);
    }
  }
  
  await c.env.DB.prepare(
    `UPDATE agenda 
     SET cliente_id = ?, data = ?, hora = ?, tipo_atividade = ?, observacao = ?, mensagem_gerente = ?, status_visita = ?, motivo_cancelamento = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).bind(
    data.cliente_id || null,
    data.data,
    data.hora,
    data.tipo_atividade,
    data.observacao || null,
    data.mensagem_gerente || null,
    data.status_visita || null,
    data.motivo_cancelamento || null,
    id
  ).run();
  
  return c.json({ id: parseInt(id), ...data });
});

app.delete("/api/agenda/:id", authMiddleware, async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  
  if (!user) {
    return c.json({ error: "Usuário não autenticado" }, 401);
  }
  
  // Buscar dados do usuário na tabela local
  const localUser = await c.env.DB.prepare(
    "SELECT * FROM usuarios WHERE email = ?"
  ).bind(user.email).first() as any;
  
  if (!localUser) {
    return c.json({ error: "Usuário não autorizado" }, 401);
  }
  
  // Verificar se o compromisso existe
  const existingAgenda = await c.env.DB.prepare(
    "SELECT * FROM agenda WHERE id = ?"
  ).bind(id).first() as any;
  
  if (!existingAgenda) {
    return c.json({ error: "Compromisso não encontrado" }, 404);
  }
  
  // Se não for Administrador/Gerente, só pode deletar os próprios
  if (localUser.nivel_acesso !== 'Administrador' && localUser.nivel_acesso !== 'Gerente') {
    const userVendedorId = localUser.vendedor || localUser.mocha_user_id;
    if (existingAgenda.vendedor_id !== userVendedorId) {
      return c.json({ error: "Você não tem permissão para deletar este compromisso" }, 403);
    }
  }
  
  const db = c.env.DB;
  
  // Se o compromisso tem data_fim, deletar todos os registros do período
  if (existingAgenda.data_fim && existingAgenda.data_fim !== existingAgenda.data) {
    await db.prepare(
      `DELETE FROM agenda 
       WHERE vendedor_id = ? 
       AND titulo = ? 
       AND data >= ? 
       AND data <= ?
       AND tipo_atividade = 'compromisso'`
    ).bind(
      existingAgenda.vendedor_id,
      existingAgenda.titulo,
      existingAgenda.data,
      existingAgenda.data_fim
    ).run();
  } else {
    // Compromisso de um único dia - deletar apenas este registro
    await db.prepare("DELETE FROM agenda WHERE id = ?").bind(id).run();
  }
  
  return c.json({ success: true });
});

// ==================== MENU CONFIG ENDPOINTS ====================

app.get("/api/menu-config", authMiddleware, async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM menu_config ORDER BY parent_key NULLS FIRST, menu_key"
  ).all();
  return c.json(results);
});

app.put("/api/menu-config", authMiddleware, async (c) => {
  const data = await c.req.json();
  
  await c.env.DB.prepare(
    `UPDATE menu_config 
     SET is_visible = ?, updated_at = CURRENT_TIMESTAMP
     WHERE menu_key = ?`
  ).bind(data.is_visible, data.menu_key).run();
  
  return c.json({ success: true });
});

// ==================== DATA FIX ENDPOINTS ====================

// Endpoint para corrigir vendas sem classificação de negócio
app.post("/api/data/fix-vendas-sem-negocio", authMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    
    // DIAGNÓSTICO INICIAL
    const diagnosticoInicial = await db.prepare(
      `SELECT 
        COUNT(*) as total_sem_negocio,
        SUM(valor_total) as valor_sem_negocio
       FROM vendas 
       WHERE (negocio IS NULL OR negocio = '')`
    ).first() as any;
    
    console.log('=== DIAGNÓSTICO VENDAS SEM NEGÓCIO ===');
    console.log('Vendas sem negócio:', diagnosticoInicial?.total_sem_negocio || 0);
    console.log('Valor total:', diagnosticoInicial?.valor_sem_negocio || 0);
    
    // Corrigir TODAS as vendas sem negócio usando o mapeamento da tabela vendedores
    const result = await db.prepare(
      `UPDATE vendas 
       SET negocio = (
         SELECT vend.id_negocio 
         FROM vendedores vend 
         WHERE vend.vendedor = vendas.representante
       )
       WHERE (negocio IS NULL OR negocio = '')
       AND representante IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM vendedores vend 
         WHERE vend.vendedor = vendas.representante 
         AND vend.id_negocio IS NOT NULL
       )`
    ).run();
    
    const vendasCorrigidas = result.meta.changes || 0;
    
    // DIAGNÓSTICO FINAL
    const diagnosticoFinal = await db.prepare(
      `SELECT 
        COUNT(*) as total_sem_negocio,
        SUM(valor_total) as valor_sem_negocio
       FROM vendas 
       WHERE (negocio IS NULL OR negocio = '')`
    ).first() as any;
    
    // Estatísticas por negócio e ano após correção
    const estatisticas = await db.prepare(
      `SELECT 
        strftime('%Y', data_venda) as ano,
        negocio,
        COUNT(*) as total,
        SUM(valor_total) as valor
       FROM vendas 
       GROUP BY strftime('%Y', data_venda), negocio
       ORDER BY ano DESC, negocio`
    ).all();
    
    console.log('=== RESULTADO DA CORREÇÃO ===');
    console.log('Vendas corrigidas:', vendasCorrigidas);
    console.log('Vendas ainda sem negócio:', diagnosticoFinal?.total_sem_negocio || 0);
    console.log('Estatísticas:', JSON.stringify(estatisticas.results, null, 2));
    
    return c.json({
      success: true,
      message: `Correção concluída. ${vendasCorrigidas} vendas foram classificadas com o negócio correto.`,
      vendasCorrigidas,
      diagnostico: {
        antes: {
          sem_negocio: diagnosticoInicial?.total_sem_negocio || 0,
          valor_sem_negocio: diagnosticoInicial?.valor_sem_negocio || 0
        },
        depois: {
          sem_negocio: diagnosticoFinal?.total_sem_negocio || 0,
          valor_sem_negocio: diagnosticoFinal?.valor_sem_negocio || 0
        },
        estatisticas: estatisticas.results
      }
    });
    
  } catch (error) {
    console.error('Erro ao corrigir vendas sem negócio:', error);
    return c.json({
      success: false,
      message: 'Erro ao executar correção: ' + String(error)
    }, 500);
  }
});

// Endpoint específico para redistribuir vendedor 3633 para os vendedores corretos
app.post("/api/data/fix-vendedor-3633", authMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    
    // DIAGNÓSTICO INICIAL
    const diagnosticoInicial = await db.prepare(
      `SELECT representante, regiao, COUNT(*) as total, SUM(valor_total) as valor
       FROM vendas 
       WHERE representante = '3633' AND strftime('%Y', data_venda) = '2025'
       GROUP BY representante, regiao
       ORDER BY regiao`
    ).all();
    
    console.log('=== DIAGNÓSTICO INICIAL 3633 ===');
    console.log('Vendas por região do vendedor 3633:', JSON.stringify(diagnosticoInicial.results, null, 2));
    
    // Redistribuir 3633 para os vendedores corretos por região
    // 3601: PR, SC, RS (Sul)
    const update3601 = await db.prepare(
      `UPDATE vendas 
       SET representante = '3601'
       WHERE representante = '3633' 
       AND regiao IN ('PR', 'SC', 'RS')`
    ).run();
    
    console.log(`✅ Vendedor 3601 (Sul): ${update3601.meta.changes || 0} vendas redistribuídas`);
    
    // 3602: SP, MG, RJ, ES (Sudeste)
    const update3602 = await db.prepare(
      `UPDATE vendas 
       SET representante = '3602'
       WHERE representante = '3633' 
       AND regiao IN ('SP', 'MG', 'RJ', 'ES')`
    ).run();
    
    console.log(`✅ Vendedor 3602 (Sudeste): ${update3602.meta.changes || 0} vendas redistribuídas`);
    
    // 3603: GO, DF, MT, MS (Centro-Oeste)
    const update3603 = await db.prepare(
      `UPDATE vendas 
       SET representante = '3603'
       WHERE representante = '3633' 
       AND regiao IN ('GO', 'DF', 'MT', 'MS')`
    ).run();
    
    console.log(`✅ Vendedor 3603 (Centro-Oeste): ${update3603.meta.changes || 0} vendas redistribuídas`);
    
    // 3604: Norte e Nordeste
    const update3604 = await db.prepare(
      `UPDATE vendas 
       SET representante = '3604'
       WHERE representante = '3633' 
       AND regiao IN ('AC', 'AP', 'AM', 'PA', 'RO', 'RR', 'TO', 'AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE')`
    ).run();
    
    console.log(`✅ Vendedor 3604 (Norte/Nordeste): ${update3604.meta.changes || 0} vendas redistribuídas`);
    
    // DIAGNÓSTICO FINAL
    const diagnosticoFinal = await db.prepare(
      `SELECT representante, regiao, COUNT(*) as total, SUM(valor_total) as valor
       FROM vendas 
       WHERE representante IN ('3601', '3602', '3603', '3604', '3633')
       AND strftime('%Y', data_venda) = '2025'
       AND negocio = '36'
       GROUP BY representante, regiao
       ORDER BY representante, regiao`
    ).all();
    
    console.log('=== DIAGNÓSTICO FINAL ===');
    console.log('Vendas por vendedor e região:', JSON.stringify(diagnosticoFinal.results, null, 2));
    
    // Verificar se ainda existem vendas no 3633
    const vendasRestantes3633 = await db.prepare(
      `SELECT COUNT(*) as total FROM vendas WHERE representante = '3633' AND strftime('%Y', data_venda) = '2025'`
    ).first() as any;
    
    const totalRedistribuido = (update3601.meta.changes || 0) + 
                               (update3602.meta.changes || 0) + 
                               (update3603.meta.changes || 0) + 
                               (update3604.meta.changes || 0);
    
    return c.json({
      success: true,
      message: `Redistribuição concluída. ${totalRedistribuido} vendas do vendedor 3633 foram redistribuídas.`,
      detalhes: {
        vendedor_3601_sul: update3601.meta.changes || 0,
        vendedor_3602_sudeste: update3602.meta.changes || 0,
        vendedor_3603_centro_oeste: update3603.meta.changes || 0,
        vendedor_3604_norte_nordeste: update3604.meta.changes || 0,
        vendas_restantes_3633: vendasRestantes3633?.total || 0
      },
      diagnosticoInicial: diagnosticoInicial.results,
      diagnosticoFinal: diagnosticoFinal.results
    });
    
  } catch (error) {
    console.error('Erro ao redistribuir vendedor 3633:', error);
    return c.json({
      success: false,
      message: 'Erro ao executar redistribuição: ' + String(error)
    }, 500);
  }
});

// Endpoint para corrigir classificação de negócios nas vendas de 2024
app.post("/api/data/fix-negocios-2024", authMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    let vendedoresAdicionados = 0;
    
    // ETAPA 1: Identificar e cadastrar vendedores faltantes
    // Buscar representantes únicos de 2024 que não estão na tabela vendedores
    const vendedoresFaltantes = await db.prepare(
      `SELECT DISTINCT v.representante
       FROM vendas v
       WHERE strftime('%Y', v.data_venda) = '2024'
       AND v.representante IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM vendedores vend 
         WHERE vend.vendedor = v.representante
       )`
    ).all();
    
    // Determinar negócio baseado no código do vendedor
    const determinarNegocio = (vendedor: string): { negocio: string; id_negocio: string } => {
      const codigo = parseInt(vendedor);
      
      // Ruminantes (36): vendedores 3601-3699
      if (codigo >= 3601 && codigo <= 3699) {
        return { negocio: 'Ruminantes', id_negocio: '36' };
      }
      // Ave/Sui (42): vendedores 4201-4299
      if (codigo >= 4201 && codigo <= 4299) {
        return { negocio: 'Ave/Sui', id_negocio: '42' };
      }
      // Salmix B2B (10): vendedores 1001-1099
      if (codigo >= 1001 && codigo <= 1099) {
        return { negocio: 'Salmix B2B', id_negocio: '10' };
      }
      
      // Vendedores legados - inferir pelo código
      if (codigo >= 15 && codigo <= 28) {
        return { negocio: 'Ruminantes', id_negocio: '36' };
      }
      
      // Default: Ruminantes (caso não se encaixe em nenhuma regra)
      return { negocio: 'Ruminantes', id_negocio: '36' };
    };
    
    // Cadastrar vendedores faltantes
    if ((vendedoresFaltantes.results as any[]).length > 0) {
      const insertStatements = (vendedoresFaltantes.results as any[]).map(v => {
        const { negocio, id_negocio } = determinarNegocio(v.representante);
        return db.prepare(
          `INSERT INTO vendedores (vendedor, nome_vendedor, negocio, id_negocio)
           VALUES (?, ?, ?, ?)`
        ).bind(
          v.representante,
          `Vendedor ${v.representante}`,
          negocio,
          id_negocio
        );
      });
      
      await db.batch(insertStatements);
      vendedoresAdicionados = (vendedoresFaltantes.results as any[]).length;
    }
    
    // ETAPA 2: Reclassificar TODAS as vendas de 2024 com o negócio correto baseado no vendedor
    const result = await db.prepare(
      `UPDATE vendas 
       SET negocio = (
         SELECT vend.id_negocio 
         FROM vendedores vend 
         WHERE vend.vendedor = vendas.representante
       )
       WHERE strftime('%Y', data_venda) = '2024'
       AND representante IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM vendedores vend 
         WHERE vend.vendedor = vendas.representante 
         AND vend.id_negocio IS NOT NULL
       )`
    ).run();
    
    const vendasCorrigidas = result.meta.changes || 0;
    
    // ETAPA 3: Estatísticas finais por negócio
    const stats2024 = await db.prepare(
      `SELECT negocio, COUNT(*) as total, SUM(valor_total) as valor
       FROM vendas 
       WHERE strftime('%Y', data_venda) = '2024'
       GROUP BY negocio
       ORDER BY negocio`
    ).all();
    
    let mensagem = `Correção de negócios 2024 concluída.`;
    if (vendedoresAdicionados > 0) {
      mensagem += ` ${vendedoresAdicionados} vendedor(es) cadastrado(s).`;
    }
    mensagem += ` ${vendasCorrigidas} vendas reclassificadas.`;
    
    return c.json({
      success: true,
      message: mensagem,
      vendedoresAdicionados,
      vendasCorrigidas,
      estatisticas2024: stats2024.results
    });
    
  } catch (error) {
    console.error('Erro ao corrigir negócios 2024:', error);
    return c.json({
      success: false,
      message: 'Erro ao executar correção: ' + String(error)
    }, 500);
  }
});

// Endpoint para corrigir códigos de produtos - remover zeros à esquerda
app.post("/api/data/fix-product-codes", authMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    
    // Corrigir códigos na tabela vendas - remover zeros à esquerda
    const updateVendasResult = await db.prepare(
      `UPDATE vendas 
       SET codigo_produto = LTRIM(codigo_produto, '0')
       WHERE codigo_produto LIKE '0%'`
    ).run();
    
    const vendasCorrigidas = updateVendasResult.meta.changes || 0;
    
    // Corrigir códigos na tabela produtos (caso necessário)
    const updateProdutosResult = await db.prepare(
      `UPDATE produtos 
       SET codigo_produto = LTRIM(codigo_produto, '0')
       WHERE codigo_produto LIKE '0%'`
    ).run();
    
    const produtosCorrigidos = updateProdutosResult.meta.changes || 0;
    
    // Corrigir códigos na tabela previsao_vendas
    const updateForecastResult = await db.prepare(
      `UPDATE previsao_vendas 
       SET codigo_produto = LTRIM(codigo_produto, '0')
       WHERE codigo_produto LIKE '0%'`
    ).run();
    
    const forecastCorrigido = updateForecastResult.meta.changes || 0;
    
    return c.json({
      success: true,
      message: `Códigos de produtos corrigidos. ${vendasCorrigidas} vendas, ${produtosCorrigidos} produtos, ${forecastCorrigido} previsões atualizadas.`,
      vendasCorrigidas,
      produtosCorrigidos,
      forecastCorrigido
    });
    
  } catch (error) {
    console.error('Erro ao corrigir códigos de produtos:', error);
    return c.json({
      success: false,
      message: 'Erro ao executar correção: ' + String(error)
    }, 500);
  }
});

// Endpoint para limpeza completa de nomes genéricos em TODAS as tabelas - SOLUÇÃO DEFINITIVA
app.post("/api/data/fix-product-names", authMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    let totalCorrigido = 0;
    const detalhes: any = {};
    
    console.log('🔧 INICIANDO CORREÇÃO DEFINITIVA DE NOMES DE PRODUTOS');
    
    // ETAPA 1: Garantir que produtos tem nomes reais
    // Usar vendas como fonte de nomes corretos
    const updateProdutosResult = await db.prepare(
      `UPDATE produtos 
       SET nome_produto = (
         SELECT v.nome_produto 
         FROM vendas v 
         WHERE v.codigo_produto = produtos.codigo_produto 
         AND v.nome_produto NOT LIKE 'Produto %'
         AND v.nome_produto NOT LIKE '%Peosuto%'
         AND v.nome_produto NOT LIKE '%Terceiro%'
         AND LENGTH(v.nome_produto) > 3
         GROUP BY v.nome_produto
         ORDER BY COUNT(*) DESC
         LIMIT 1
       ),
       updated_at = CURRENT_TIMESTAMP
       WHERE (produtos.nome_produto LIKE 'Produto %' 
              OR produtos.nome_produto LIKE '%Peosuto%'
              OR produtos.nome_produto LIKE '%Terceiro%')
       AND EXISTS (
         SELECT 1 FROM vendas v 
         WHERE v.codigo_produto = produtos.codigo_produto 
         AND v.nome_produto NOT LIKE 'Produto %'
         AND v.nome_produto NOT LIKE '%Peosuto%'
         AND v.nome_produto NOT LIKE '%Terceiro%'
         AND LENGTH(v.nome_produto) > 3
       )`
    ).run();
    
    detalhes.produtosCorrigidos = updateProdutosResult.meta.changes || 0;
    totalCorrigido += detalhes.produtosCorrigidos;
    console.log(`✅ Produtos corrigidos: ${detalhes.produtosCorrigidos}`);
    
    // ETAPA 2: Atualizar vendas
    const updateVendasResult = await db.prepare(
      `UPDATE vendas 
       SET nome_produto = (
         SELECT p.nome_produto 
         FROM produtos p 
         WHERE p.codigo_produto = vendas.codigo_produto
       ),
       updated_at = CURRENT_TIMESTAMP
       WHERE (vendas.nome_produto LIKE 'Produto %'
              OR vendas.nome_produto LIKE '%Peosuto%'
              OR vendas.nome_produto LIKE '%Terceiro%')
       AND EXISTS (
         SELECT 1 FROM produtos p 
         WHERE p.codigo_produto = vendas.codigo_produto
         AND p.nome_produto NOT LIKE 'Produto %'
         AND p.nome_produto NOT LIKE '%Peosuto%'
         AND p.nome_produto NOT LIKE '%Terceiro%'
       )`
    ).run();
    
    detalhes.vendasCorrigidas = updateVendasResult.meta.changes || 0;
    totalCorrigido += detalhes.vendasCorrigidas;
    console.log(`✅ Vendas corrigidas: ${detalhes.vendasCorrigidas}`);
    
    // ETAPA 3: Atualizar previsao_vendas (forecast) - CRÍTICO PARA O PROBLEMA
    const updateForecastResult = await db.prepare(
      `UPDATE previsao_vendas 
       SET nome_produto = (
         SELECT p.nome_produto 
         FROM produtos p 
         WHERE p.codigo_produto = previsao_vendas.codigo_produto
       ),
       updated_at = CURRENT_TIMESTAMP
       WHERE (previsao_vendas.nome_produto LIKE 'Produto %'
              OR previsao_vendas.nome_produto LIKE '%Peosuto%'
              OR previsao_vendas.nome_produto LIKE '%Terceiro%')
       AND EXISTS (
         SELECT 1 FROM produtos p 
         WHERE p.codigo_produto = previsao_vendas.codigo_produto
         AND p.nome_produto NOT LIKE 'Produto %'
         AND p.nome_produto NOT LIKE '%Peosuto%'
         AND p.nome_produto NOT LIKE '%Terceiro%'
       )`
    ).run();
    
    detalhes.forecastCorrigido = updateForecastResult.meta.changes || 0;
    totalCorrigido += detalhes.forecastCorrigido;
    console.log(`✅ Forecast corrigido: ${detalhes.forecastCorrigido}`);
    
    // ETAPA 4: Atualizar inventory
    const updateInventoryResult = await db.prepare(
      `UPDATE inventory 
       SET product_name = (
         SELECT p.nome_produto 
         FROM produtos p 
         WHERE p.codigo_produto = inventory.product_id
       ),
       updated_at = CURRENT_TIMESTAMP
       WHERE (inventory.product_name LIKE 'Produto %'
              OR inventory.product_name LIKE '%Peosuto%'
              OR inventory.product_name LIKE '%Terceiro%')
       AND EXISTS (
         SELECT 1 FROM produtos p 
         WHERE p.codigo_produto = inventory.product_id
         AND p.nome_produto NOT LIKE 'Produto %'
         AND p.nome_produto NOT LIKE '%Peosuto%'
         AND p.nome_produto NOT LIKE '%Terceiro%'
       )`
    ).run();
    
    detalhes.inventoryCorrigido = updateInventoryResult.meta.changes || 0;
    totalCorrigido += detalhes.inventoryCorrigido;
    console.log(`✅ Inventory corrigido: ${detalhes.inventoryCorrigido}`);
    
    // ETAPA 5: Atualizar price_table
    const updatePriceTableResult = await db.prepare(
      `UPDATE price_table 
       SET product_name = (
         SELECT p.nome_produto 
         FROM produtos p 
         WHERE p.codigo_produto = price_table.product_id
       ),
       updated_at = CURRENT_TIMESTAMP
       WHERE (price_table.product_name LIKE 'Produto %'
              OR price_table.product_name LIKE '%Peosuto%'
              OR price_table.product_name LIKE '%Terceiro%')
       AND EXISTS (
         SELECT 1 FROM produtos p 
         WHERE p.codigo_produto = price_table.product_id
         AND p.nome_produto NOT LIKE 'Produto %'
         AND p.nome_produto NOT LIKE '%Peosuto%'
         AND p.nome_produto NOT LIKE '%Terceiro%'
       )`
    ).run();
    
    detalhes.priceTableCorrigido = updatePriceTableResult.meta.changes || 0;
    totalCorrigido += detalhes.priceTableCorrigido;
    console.log(`✅ Price Table corrigido: ${detalhes.priceTableCorrigido}`);
    
    // ETAPA 6: Atualizar order_items
    const updateOrderItemsResult = await db.prepare(
      `UPDATE order_items 
       SET product_name = (
         SELECT p.nome_produto 
         FROM produtos p 
         WHERE p.codigo_produto = order_items.product_id
       ),
       updated_at = CURRENT_TIMESTAMP
       WHERE (order_items.product_name LIKE 'Produto %'
              OR order_items.product_name LIKE '%Peosuto%'
              OR order_items.product_name LIKE '%Terceiro%')
       AND EXISTS (
         SELECT 1 FROM produtos p 
         WHERE p.codigo_produto = order_items.product_id
         AND p.nome_produto NOT LIKE 'Produto %'
         AND p.nome_produto NOT LIKE '%Peosuto%'
         AND p.nome_produto NOT LIKE '%Terceiro%'
       )`
    ).run();
    
    detalhes.orderItemsCorrigido = updateOrderItemsResult.meta.changes || 0;
    totalCorrigido += detalhes.orderItemsCorrigido;
    console.log(`✅ Order Items corrigido: ${detalhes.orderItemsCorrigido}`);
    
    // ETAPA 7: DELETAR registros que não puderam ser corrigidos (não têm correspondência válida)
    const deleteForecastOrfaos = await db.prepare(
      `DELETE FROM previsao_vendas 
       WHERE (nome_produto LIKE 'Produto %'
              OR nome_produto LIKE '%Peosuto%'
              OR nome_produto LIKE '%Terceiro%')
       AND NOT EXISTS (
         SELECT 1 FROM produtos p 
         WHERE p.codigo_produto = previsao_vendas.codigo_produto
         AND p.nome_produto NOT LIKE 'Produto %'
         AND p.nome_produto NOT LIKE '%Peosuto%'
         AND p.nome_produto NOT LIKE '%Terceiro%'
       )`
    ).run();
    
    detalhes.forecastOrfaosDeletados = deleteForecastOrfaos.meta.changes || 0;
    console.log(`🗑️ Forecast órfãos deletados: ${detalhes.forecastOrfaosDeletados}`);
    
    console.log('✅ CORREÇÃO DEFINITIVA CONCLUÍDA');
    
    return c.json({
      success: true,
      message: totalCorrigido > 0 || detalhes.forecastOrfaosDeletados > 0
        ? `Correção concluída! ${totalCorrigido} registro(s) corrigido(s), ${detalhes.forecastOrfaosDeletados} órfão(s) removido(s).`
        : 'Nenhuma correção necessária. Todos os dados já estão corretos.',
      totalCorrigido,
      detalhes
    });
    
  } catch (error) {
    console.error('❌ Erro ao limpar nomes de produtos:', error);
    return c.json({
      success: false,
      message: 'Erro ao executar limpeza: ' + String(error)
    }, 500);
  }
});

// Endpoint específico para ajuste da base 2024
app.post("/api/data/fix-base-2024", authMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    
    // Identificar clientes que estão no negócio errado em 2024
    // Lógica: se um cliente tem vendas em 2025 em um negócio específico,
    // mas em 2024 tem vendas em um negócio diferente, corrigir para o negócio de 2025
    
    // Buscar clientes com negócios inconsistentes entre 2024 e 2025
    const clientesInconsistentes = await db.prepare(
      `SELECT DISTINCT 
         v2024.nome_cliente,
         v2024.negocio as negocio_2024,
         v2025.negocio as negocio_2025
       FROM vendas v2024
       INNER JOIN vendas v2025 ON v2024.nome_cliente = v2025.nome_cliente
       WHERE strftime('%Y', v2024.data_venda) = '2024'
         AND strftime('%Y', v2025.data_venda) = '2025'
         AND v2024.negocio != v2025.negocio
         AND v2024.nome_cliente IS NOT NULL
       GROUP BY v2024.nome_cliente, v2024.negocio, v2025.negocio`
    ).all();
    
    let totalCorrigido = 0;
    const BATCH_SIZE = 10; // Processar 10 clientes por vez
    const clientesList = clientesInconsistentes.results as any[];
    
    // Processar em lotes para evitar timeout
    for (let i = 0; i < clientesList.length; i += BATCH_SIZE) {
      const batch = clientesList.slice(i, i + BATCH_SIZE);
      
      // Criar array de statements para batch processing
      const statements = batch.map(cliente => 
        db.prepare(
          `UPDATE vendas 
           SET negocio = ?
           WHERE nome_cliente = ? 
           AND strftime('%Y', data_venda) = '2024'
           AND negocio = ?`
        ).bind(cliente.negocio_2025, cliente.nome_cliente, cliente.negocio_2024)
      );
      
      // Executar batch
      const results = await db.batch(statements);
      
      // Somar mudanças
      for (const result of results) {
        totalCorrigido += result.meta.changes || 0;
      }
    }
    
    return c.json({
      success: true,
      message: `Ajuste da base 2024 concluído. ${totalCorrigido} registros corrigidos.`,
      clientesCorrigidos: clientesList.length,
      registrosAtualizados: totalCorrigido
    });
    
  } catch (error) {
    console.error('Erro ao ajustar base 2024:', error);
    return c.json({
      success: false,
      message: 'Erro ao executar ajuste: ' + String(error)
    }, 500);
  }
});

// Endpoint unificado que executa redistribuição de vendedores + correção de negócios
app.post("/api/data/fix-vendedores-negocios", authMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    let totalVendedoresRedistribuidos = 0;
    let totalVendedoresAtualizados = 0;
    let vendasUpdated = 0;
    let budgetUpdated = 0;

    // ETAPA 1: Redistribuição de vendedores (alterações De/Para)
    // Aplicar EXATAMENTE as regras especificadas pelo cliente
    // IMPORTANTE: Incluir versões COM e SEM zeros à esquerda
    const alteracoes = [
      // Regra 11: De: 000001 → Para: 1001
      { vendedorAntigo: '000001', vendedorNovo: '1001', estados: null },
      { vendedorAntigo: '1', vendedorNovo: '1001', estados: null },
      
      // Regra 1: De: 000033 → Para: 3633
      { vendedorAntigo: '000033', vendedorNovo: '3633', estados: null },
      { vendedorAntigo: '33', vendedorNovo: '3633', estados: null },
      
      // Regra 2: De: 000036 + PR/SC/RS → Para: 3601
      { vendedorAntigo: '000036', vendedorNovo: '3601', estados: ['PR', 'SC', 'RS'] },
      { vendedorAntigo: '36', vendedorNovo: '3601', estados: ['PR', 'SC', 'RS'] },
      
      // Regra 3: De: 000036 + SP/MG/RJ/ES → Para: 3602
      { vendedorAntigo: '000036', vendedorNovo: '3602', estados: ['SP', 'MG', 'RJ', 'ES'] },
      { vendedorAntigo: '36', vendedorNovo: '3602', estados: ['SP', 'MG', 'RJ', 'ES'] },
      
      // Regra 4: De: 000036 + GO/DF/MT/MS → Para: 3603
      { vendedorAntigo: '000036', vendedorNovo: '3603', estados: ['GO', 'DF', 'MT', 'MS'] },
      { vendedorAntigo: '36', vendedorNovo: '3603', estados: ['GO', 'DF', 'MT', 'MS'] },
      
      // Regra 5: De: 000036 + Norte/Nordeste → Para: 3604
      { vendedorAntigo: '000036', vendedorNovo: '3604', estados: ['AC', 'AP', 'AM', 'PA', 'RO', 'RR', 'TO', 'AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE'] },
      { vendedorAntigo: '36', vendedorNovo: '3604', estados: ['AC', 'AP', 'AM', 'PA', 'RO', 'RR', 'TO', 'AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE'] },
      
      // Regra 6: De: 000042 + SC/RS → Para: 4201
      { vendedorAntigo: '000042', vendedorNovo: '4201', estados: ['SC', 'RS'] },
      { vendedorAntigo: '42', vendedorNovo: '4201', estados: ['SC', 'RS'] },
      
      // Regra 6.5: De: 000042 + SP/MG/RJ/ES → Para: 4222 (CORREÇÃO CRÍTICA)
      { vendedorAntigo: '000042', vendedorNovo: '4222', estados: ['SP', 'MG', 'RJ', 'ES'] },
      { vendedorAntigo: '42', vendedorNovo: '4222', estados: ['SP', 'MG', 'RJ', 'ES'] },
      
      // Regra 7: De: 000042 + GO/DF/MT/MS → Para: 4202
      { vendedorAntigo: '000042', vendedorNovo: '4202', estados: ['GO', 'DF', 'MT', 'MS'] },
      { vendedorAntigo: '42', vendedorNovo: '4202', estados: ['GO', 'DF', 'MT', 'MS'] },
      
      // Regra 8: De: 000042 + Norte/Nordeste → Para: 4203
      { vendedorAntigo: '000042', vendedorNovo: '4203', estados: ['AC', 'AP', 'AM', 'PA', 'RO', 'RR', 'TO', 'AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE'] },
      { vendedorAntigo: '42', vendedorNovo: '4203', estados: ['AC', 'AP', 'AM', 'PA', 'RO', 'RR', 'TO', 'AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE'] },
      
      // Regra 9: De: 000031 → Para: 4231
      { vendedorAntigo: '000031', vendedorNovo: '4231', estados: null },
      { vendedorAntigo: '31', vendedorNovo: '4231', estados: null },
      
      // Regra 10: De: 000022 → Para: 4222
      { vendedorAntigo: '000022', vendedorNovo: '4222', estados: null },
      { vendedorAntigo: '22', vendedorNovo: '4222', estados: null },
      
      // De: 000024 → Para: 4203 (adicional mencionado no endpoint vendas/update-vendedores)
      { vendedorAntigo: '000024', vendedorNovo: '4203', estados: null },
      { vendedorAntigo: '24', vendedorNovo: '4203', estados: null }
    ];

    for (const alteracao of alteracoes) {
      let query: string;
      let params: any[];

      if (alteracao.estados === null) {
        query = `UPDATE vendas SET representante = ? WHERE representante = ?`;
        params = [alteracao.vendedorNovo, alteracao.vendedorAntigo];
      } else {
        const estados = alteracao.estados; // TypeScript now knows this is string[]
        const placeholders = estados.map(() => '?').join(',');
        query = `UPDATE vendas SET representante = ? WHERE representante = ? AND regiao IN (${placeholders})`;
        params = [alteracao.vendedorNovo, alteracao.vendedorAntigo, ...estados];
      }

      const result = await db.prepare(query).bind(...params).run();
      totalVendedoresRedistribuidos += result.meta.changes || 0;
    }

    // ETAPA 2: Atualizar códigos de vendedores com id_negocio
    const updateVendedoresResult = await db.prepare(
      `UPDATE vendedores 
       SET id_negocio = CASE negocio
         WHEN 'Salmix B2B' THEN '10'
         WHEN 'Ruminantes' THEN '36'
         WHEN 'Ave/Sui' THEN '42'
         ELSE id_negocio
       END
       WHERE negocio IN ('Salmix B2B', 'Ruminantes', 'Ave/Sui')`
    ).run();
    
    totalVendedoresAtualizados = updateVendedoresResult.meta.changes || 0;

    // ETAPA 3: Atualizar TODAS as vendas (não apenas as NULL) para garantir consistência
    // Usar id_negocio porque a coluna vendas.negocio armazena códigos numéricos (10, 36, 42)
    const updateVendasResult = await db.prepare(
      `UPDATE vendas 
       SET negocio = (
         SELECT vend.id_negocio 
         FROM vendedores vend 
         WHERE vend.vendedor = vendas.representante
       )
       WHERE representante IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM vendedores vend 
         WHERE vend.vendedor = vendas.representante 
         AND vend.id_negocio IS NOT NULL
       )`
    ).run();
    
    vendasUpdated = updateVendasResult.meta.changes || 0;

    // ETAPA 4: Atualizar TODOS os budgets (não apenas os NULL) para garantir consistência
    // Usar id_negocio porque a coluna budget.negocio armazena códigos numéricos (10, 36, 42)
    const updateBudgetResult = await db.prepare(
      `UPDATE budget 
       SET negocio = (
         SELECT vend.id_negocio 
         FROM vendedores vend 
         WHERE vend.vendedor = budget.vendedor
       )
       WHERE vendedor IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM vendedores vend 
         WHERE vend.vendedor = budget.vendedor 
         AND vend.id_negocio IS NOT NULL
       )`
    ).run();
    
    budgetUpdated = updateBudgetResult.meta.changes || 0;

    let message = 'Procedimento completo executado com sucesso.';
    if (totalVendedoresRedistribuidos === 0 && totalVendedoresAtualizados === 0 && vendasUpdated === 0 && budgetUpdated === 0) {
      message = 'Nenhuma correção necessária. Todos os dados já estão corretos.';
    }

    return c.json({
      success: true,
      message,
      vendedoresRedistribuidos: totalVendedoresRedistribuidos,
      vendedoresAtualizados: totalVendedoresAtualizados,
      vendasUpdated,
      budgetUpdated
    });

  } catch (error) {
    console.error('Erro ao executar procedimento:', error);
    return c.json({
      success: false,
      message: 'Erro ao executar procedimento: ' + String(error)
    }, 500);
  }
});

app.post("/api/data/fix-negocios", authMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    let totalVendedoresUpdated = 0;
    
    // ETAPA 1: Atualizar códigos de vendedores antigos para novos
    // Tabela de alterações De/Para
    const alteracoes = [
      { vendedorAntigo: '000001', vendedorNovo: '1001', estados: null },
      { vendedorAntigo: '000033', vendedorNovo: '3633', estados: null },
      { vendedorAntigo: '000036', vendedorNovo: '3601', estados: ['PR', 'SC', 'RS'] },
      { vendedorAntigo: '000036', vendedorNovo: '3602', estados: ['SP', 'MG', 'RJ', 'ES'] },
      { vendedorAntigo: '000036', vendedorNovo: '3603', estados: ['GO', 'DF', 'MT', 'MS'] },
      { vendedorAntigo: '000036', vendedorNovo: '3604', estados: ['AC', 'AP', 'AM', 'PA', 'RO', 'RR', 'TO', 'AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE'] },
      { vendedorAntigo: '000042', vendedorNovo: '4201', estados: ['PR', 'SC', 'RS'] },
      { vendedorAntigo: '000042', vendedorNovo: '4222', estados: ['SP', 'MG', 'RJ', 'ES'] },
      { vendedorAntigo: '000042', vendedorNovo: '4202', estados: ['GO', 'DF', 'MT', 'MS'] },
      { vendedorAntigo: '000042', vendedorNovo: '4203', estados: ['AC', 'AP', 'AM', 'PA', 'RO', 'RR', 'TO', 'AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE'] },
      { vendedorAntigo: '000031', vendedorNovo: '4231', estados: null },
      { vendedorAntigo: '000022', vendedorNovo: '4222', estados: null },
      { vendedorAntigo: '000024', vendedorNovo: '4203', estados: null }
    ];

    // Executar cada alteração de vendedor
    for (const alteracao of alteracoes) {
      let query: string;
      let params: any[];

      if (alteracao.estados === null) {
        query = `UPDATE vendas SET representante = ? WHERE representante = ?`;
        params = [alteracao.vendedorNovo, alteracao.vendedorAntigo];
      } else {
        const placeholders = alteracao.estados.map(() => '?').join(',');
        query = `UPDATE vendas SET representante = ? WHERE representante = ? AND regiao IN (${placeholders})`;
        params = [alteracao.vendedorNovo, alteracao.vendedorAntigo, ...(alteracao.estados || [])];
      }

      const result = await db.prepare(query).bind(...params).run();
      totalVendedoresUpdated += result.meta.changes || 0;
    }
    
    let vendasUpdated = 0;
    let budgetUpdated = 0;
    
    // ETAPA 2: Atualizar TODAS as vendas para garantir consistência
    // Usar id_negocio porque a coluna vendas.negocio armazena códigos numéricos (10, 36, 42)
    const updateVendasResult = await db.prepare(
      `UPDATE vendas 
       SET negocio = (
         SELECT vend.id_negocio 
         FROM vendedores vend 
         WHERE vend.vendedor = vendas.representante
       )
       WHERE representante IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM vendedores vend 
         WHERE vend.vendedor = vendas.representante 
         AND vend.id_negocio IS NOT NULL
       )`
    ).run();
    
    vendasUpdated = updateVendasResult.meta.changes || 0;
    
    // ETAPA 3: Atualizar TODOS os budgets para garantir consistência
    // Usar id_negocio porque a coluna budget.negocio armazena códigos numéricos (10, 36, 42)
    const updateBudgetResult = await db.prepare(
      `UPDATE budget 
       SET negocio = (
         SELECT vend.id_negocio 
         FROM vendedores vend 
         WHERE vend.vendedor = budget.vendedor
       )
       WHERE vendedor IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM vendedores vend 
         WHERE vend.vendedor = budget.vendedor 
         AND vend.id_negocio IS NOT NULL
       )`
    ).run();
    
    budgetUpdated = updateBudgetResult.meta.changes || 0;
    
    // Mensagem detalhada sobre o resultado
    let message = 'Correção completa executada com sucesso.';
    if (totalVendedoresUpdated === 0 && vendasUpdated === 0 && budgetUpdated === 0) {
      message = 'Nenhuma correção necessária. Todos os dados já estão corretos.';
    }
    
    return c.json({
      success: true,
      message,
      vendedoresAtualizados: totalVendedoresUpdated,
      vendasUpdated,
      budgetUpdated
    });
    
  } catch (error) {
    console.error('Erro ao corrigir dados:', error);
    return c.json({
      success: false,
      message: 'Erro ao executar correção: ' + String(error)
    }, 500);
  }
});

// Endpoint específico para corrigir vendedor 000035 para 3601
app.post("/api/data/fix-vendedor-35-3601", authMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    
    // ETAPA 1: Garantir que o vendedor 3601 está cadastrado
    const vendedor3601Existe = await db.prepare(
      "SELECT vendedor FROM vendedores WHERE vendedor = '3601'"
    ).first();
    
    if (!vendedor3601Existe) {
      console.log('📝 Cadastrando vendedor 3601 na tabela vendedores...');
      await db.prepare(
        `INSERT INTO vendedores (vendedor, nome_vendedor, negocio, id_negocio, regional)
         VALUES (?, ?, ?, ?, ?)`
      ).bind('3601', 'Vendedor 3601', 'Ruminantes', '36', 'PR-SC-RS').run();
      console.log('✅ Vendedor 3601 cadastrado com sucesso');
    }
    
    // DIAGNÓSTICO INICIAL
    const diagnosticoInicial = await db.prepare(
      `SELECT 
        COUNT(*) as total, 
        SUM(valor_total) as valor,
        GROUP_CONCAT(DISTINCT strftime('%Y', data_venda)) as anos
       FROM vendas 
       WHERE representante = '000035'`
    ).first() as any;
    
    console.log('=== CORREÇÃO VENDEDOR 000035→3601 ===');
    console.log('Vendas 000035 encontradas:', diagnosticoInicial?.total || 0);
    console.log('Anos:', diagnosticoInicial?.anos || '');
    
    // ETAPA 2: Corrigir todas as vendas do vendedor 000035 para 3601
    const resultado = await db.prepare(
      `UPDATE vendas 
       SET representante = '3601', negocio = '36'
       WHERE representante = '000035'`
    ).run();
    
    const vendasCorrigidas = resultado.meta.changes || 0;
    
    // DIAGNÓSTICO FINAL
    const diagnosticoFinal = await db.prepare(
      `SELECT COUNT(*) as total, SUM(valor_total) as valor
       FROM vendas 
       WHERE representante = '3601'`
    ).first() as any;
    
    console.log('Vendas corrigidas 000035→3601:', vendasCorrigidas);
    console.log('Total vendas vendedor 3601:', diagnosticoFinal?.total || 0);
    console.log('========================================');
    
    return c.json({
      success: true,
      message: `Correção concluída! ${vendasCorrigidas} venda(s) foram reclassificadas do vendedor 000035 para 3601 (Ruminantes).`,
      vendasCorrigidas,
      valorTotal3601: diagnosticoFinal?.valor || 0,
      diagnostico: {
        antes: {
          vendedor_000035_total: diagnosticoInicial?.total || 0,
          vendedor_000035_valor: diagnosticoInicial?.valor || 0,
          anos: diagnosticoInicial?.anos || ''
        },
        depois: {
          vendedor_3601_total: diagnosticoFinal?.total || 0,
          valor_3601: diagnosticoFinal?.valor || 0
        }
      }
    });
    
  } catch (error) {
    console.error('Erro ao corrigir vendedor 000035→3601:', error);
    return c.json({
      success: false,
      message: 'Erro ao executar correção: ' + String(error)
    }, 500);
  }
});

// Endpoint específico para corrigir produto AXEED LIQUID em 2026
app.post("/api/data/fix-axeed-liquid-2026", authMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    
    // DIAGNÓSTICO INICIAL
    const diagnosticoInicial = await db.prepare(
      `SELECT 
        COUNT(*) as total,
        SUM(valor_total) as valor_total,
        representante,
        negocio
       FROM vendas 
       WHERE codigo_produto = '170005'
       AND nome_produto LIKE '%AXEED LIQUID CX 6 FRASCOS%'
       AND strftime('%Y', data_venda) = '2026'
       GROUP BY representante, negocio`
    ).all();
    
    console.log('=== CORREÇÃO AXEED LIQUID 2026 ===');
    console.log('Vendas encontradas:', JSON.stringify(diagnosticoInicial.results, null, 2));
    
    // Atualizar vendas do produto AXEED LIQUID CX 6 FRASCOS em 2026
    // De: vendedor 3601, negócio 36 (Ruminantes)
    // Para: vendedor 4231, negócio 42 (Ave/Sui)
    const resultado = await db.prepare(
      `UPDATE vendas 
       SET representante = '4231', negocio = '42'
       WHERE codigo_produto = '170005'
       AND nome_produto LIKE '%AXEED LIQUID CX 6 FRASCOS%'
       AND strftime('%Y', data_venda) = '2026'
       AND representante = '3601'`
    ).run();
    
    const vendasCorrigidas = resultado.meta.changes || 0;
    
    // DIAGNÓSTICO FINAL
    const diagnosticoFinal = await db.prepare(
      `SELECT 
        COUNT(*) as total,
        SUM(valor_total) as valor_total,
        representante,
        negocio
       FROM vendas 
       WHERE codigo_produto = '170005'
       AND nome_produto LIKE '%AXEED LIQUID CX 6 FRASCOS%'
       AND strftime('%Y', data_venda) = '2026'
       GROUP BY representante, negocio`
    ).all();
    
    console.log('Vendas corrigidas:', vendasCorrigidas);
    console.log('Situação final:', JSON.stringify(diagnosticoFinal.results, null, 2));
    console.log('========================================');
    
    return c.json({
      success: true,
      message: `Correção concluída! ${vendasCorrigidas} venda(s) do produto AXEED LIQUID CX 6 FRASCOS foram reclassificadas para o vendedor 4231 (Ave/Sui) em 2026.`,
      vendasCorrigidas,
      diagnostico: {
        antes: diagnosticoInicial.results,
        depois: diagnosticoFinal.results
      }
    });
    
  } catch (error) {
    console.error('Erro ao corrigir AXEED LIQUID 2026:', error);
    return c.json({
      success: false,
      message: 'Erro ao executar correção: ' + String(error)
    }, 500);
  }
});

// Endpoint específico para corrigir vendedor 42 para 4231 em julho/2025
app.post("/api/data/fix-vendedor-42-31-julho", authMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    
    // ETAPA 1: Garantir que o vendedor 4231 está cadastrado na tabela vendedores
    const vendedor4231Existe = await db.prepare(
      "SELECT vendedor FROM vendedores WHERE vendedor = '4231'"
    ).first();
    
    if (!vendedor4231Existe) {
      console.log('📝 Cadastrando vendedor 4231 na tabela vendedores...');
      await db.prepare(
        `INSERT INTO vendedores (vendedor, nome_vendedor, negocio, id_negocio, regional)
         VALUES (?, ?, ?, ?, ?)`
      ).bind('4231', 'Alencar Muller', 'Ave/Sui', '42', 'PR').run();
      console.log('✅ Vendedor 4231 cadastrado com sucesso');
    }
    
    // DIAGNÓSTICO INICIAL - vendedor 42 (TODOS OS ANOS)
    const diagnosticoInicial42 = await db.prepare(
      `SELECT 
        COUNT(*) as total, 
        SUM(valor_total) as valor,
        GROUP_CONCAT(DISTINCT strftime('%Y', data_venda)) as anos
       FROM vendas 
       WHERE representante = '42'`
    ).first() as any;
    
    // DIAGNÓSTICO INICIAL - vendedor 31
    const diagnosticoInicial31 = await db.prepare(
      `SELECT COUNT(*) as total, SUM(valor_total) as valor
       FROM vendas 
       WHERE representante = '31'`
    ).first() as any;
    
    console.log('=== CORREÇÃO VENDEDOR 42→4231 TODOS OS ANOS ===');
    console.log('Vendas 42 encontradas (todos anos):', diagnosticoInicial42?.total || 0, 'Anos:', diagnosticoInicial42?.anos);
    console.log('Vendas 31 encontradas (todos períodos):', diagnosticoInicial31?.total || 0);
    
    // ETAPA 2: Corrigir TODAS as vendas do vendedor 42 para 4231 (todos os anos)
    const resultado42 = await db.prepare(
      `UPDATE vendas 
       SET representante = '4231'
       WHERE representante = '42'`
    ).run();
    
    const vendasCorrigidas42 = resultado42.meta.changes || 0;
    
    // ETAPA 3: Corrigir vendedor 31 para 4231 (todos os períodos)
    const resultado31 = await db.prepare(
      `UPDATE vendas 
       SET representante = '4231'
       WHERE representante = '31'`
    ).run();
    
    const vendasCorrigidas31 = resultado31.meta.changes || 0;
    
    // ETAPA 4: Atualizar negócio para Ave/Sui se necessário
    await db.prepare(
      `UPDATE vendas 
       SET negocio = '42'
       WHERE representante = '4231'
       AND (negocio IS NULL OR negocio = '' OR negocio != '42')`
    ).run();
    
    // ETAPA 5: Remover vendedor 31 da tabela vendedores se existir
    await db.prepare(
      `DELETE FROM vendedores WHERE vendedor = '31'`
    ).run();
    
    // DIAGNÓSTICO FINAL
    const diagnosticoFinal = await db.prepare(
      `SELECT COUNT(*) as total, SUM(valor_total) as valor
       FROM vendas 
       WHERE representante = '4231'`
    ).first() as any;
    
    console.log('Vendas corrigidas 42→4231:', vendasCorrigidas42);
    console.log('Vendas corrigidas 31→4231:', vendasCorrigidas31);
    console.log('Total vendas vendedor 4231:', diagnosticoFinal?.total || 0);
    console.log('========================================');
    
    const totalCorrigido = vendasCorrigidas42 + vendasCorrigidas31;
    
    return c.json({
      success: true,
      message: `Correção concluída! ${totalCorrigido} venda(s) de TODOS OS ANOS foram reclassificadas para o vendedor 4231 (Alencar Muller).`,
      vendasCorrigidas42,
      vendasCorrigidas31,
      totalCorrigido,
      valorTotal4231: diagnosticoFinal?.valor || 0,
      diagnostico: {
        antes: {
          vendedor_42_total: diagnosticoInicial42?.total || 0,
          vendedor_42_valor: diagnosticoInicial42?.valor || 0,
          vendedor_42_anos: diagnosticoInicial42?.anos || '',
          vendedor_31_total: diagnosticoInicial31?.total || 0
        },
        depois: {
          vendedor_4231_total: diagnosticoFinal?.total || 0,
          valor_4231: diagnosticoFinal?.valor || 0
        }
      }
    });
    
  } catch (error) {
    console.error('Erro ao corrigir vendedor 42/31→4231:', error);
    return c.json({
      success: false,
      message: 'Erro ao executar correção: ' + String(error)
    }, 500);
  }
});

// ==================== DIAGNOSTICO VENDAS SEM NEGOCIO ====================

app.get("/api/vendas/sem-negocio", authMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    const mesAno = c.req.query('mesAno') || '2025-12';
    
    // Buscar vendas sem negócio no mês especificado
    const vendasSemNegocio = await db.prepare(
      `SELECT 
        v.id,
        v.data_venda,
        v.representante,
        v.nome_cliente,
        v.nome_produto,
        v.valor_total,
        v.negocio,
        vend.negocio as negocio_vendedor,
        vend.nome_vendedor
       FROM vendas v
       LEFT JOIN vendedores vend ON v.representante = vend.vendedor
       WHERE strftime('%Y-%m', v.data_venda) = ?
       AND (v.negocio IS NULL OR v.negocio = '')
       ORDER BY v.valor_total DESC`
    ).bind(mesAno).all();
    
    // Calcular total
    const total = (vendasSemNegocio.results as any[]).reduce((acc, v) => acc + (v.valor_total || 0), 0);
    
    return c.json({
      mesAno,
      total,
      quantidade: vendasSemNegocio.results.length,
      vendas: vendasSemNegocio.results
    });
  } catch (error) {
    console.error('Erro ao buscar vendas sem negócio:', error);
    return c.json({
      success: false,
      message: 'Erro ao consultar vendas: ' + String(error)
    }, 500);
  }
});

// ==================== CONSULTA VENDAS POR NEGOCIO ====================

app.get("/api/vendas/por-negocio", authMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    
    // Mapeamento de vendedor -> negócio baseado na tabela vendedores
    const vendedoresMap = new Map<string, string>();
    
    // Carregar mapeamento de vendedores
    const vendedoresResult = await db.prepare(
      "SELECT vendedor, id_negocio, negocio FROM vendedores WHERE id_negocio IS NOT NULL"
    ).all();
    
    (vendedoresResult.results as any[]).forEach((v: any) => {
      vendedoresMap.set(v.vendedor, v.negocio);
    });
    
    // Buscar todas as vendas 2024 e 2025
    const vendasResult = await db.prepare(
      `SELECT 
         strftime('%Y', data_venda) as ano,
         representante,
         COUNT(*) as qtd_vendas,
         SUM(valor_total) as valor_total
       FROM vendas 
       WHERE strftime('%Y', data_venda) IN ('2024', '2025')
       GROUP BY strftime('%Y', data_venda), representante
       ORDER BY ano, representante`
    ).all();
    
    // Classificar vendas por negócio usando o mapeamento
    const totaisPorNegocio: { [key: string]: { [key: string]: number } } = {
      '2024': { 'Salmix B2B': 0, 'Ruminantes': 0, 'Ave/Sui': 0, 'Sem Classificação': 0 },
      '2025': { 'Salmix B2B': 0, 'Ruminantes': 0, 'Ave/Sui': 0, 'Sem Classificação': 0 }
    };
    
    const detalhamento: any[] = [];
    
    (vendasResult.results as any[]).forEach((venda: any) => {
      const negocio = vendedoresMap.get(venda.representante) || 'Sem Classificação';
      totaisPorNegocio[venda.ano][negocio] += venda.valor_total || 0;
      
      detalhamento.push({
        ano: venda.ano,
        representante: venda.representante,
        negocio,
        qtd_vendas: venda.qtd_vendas,
        valor_total: venda.valor_total
      });
    });
    
    return c.json({
      totais: totaisPorNegocio,
      detalhamento,
      mapeamentoVendedores: Object.fromEntries(vendedoresMap)
    });
    
  } catch (error) {
    console.error('Erro ao consultar vendas por negócio:', error);
    return c.json({
      success: false,
      message: 'Erro ao consultar vendas: ' + String(error)
    }, 500);
  }
});

// ==================== VENDEDORES UPDATE ENDPOINT ====================

app.post("/api/vendas/update-vendedores", authMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    let totalUpdated = 0;

    // Tabela de alterações De/Para
    const alteracoes = [
      // 1. De: 000001 → Para: 1001
      {
        vendedorAntigo: '000001',
        vendedorNovo: '1001',
        estados: null
      },
      // 2. De: 000033 → Para: 3633
      {
        vendedorAntigo: '000033',
        vendedorNovo: '3633',
        estados: null
      },
      // 3. De: 000036 + PR/SC/RS → Para: 3601
      {
        vendedorAntigo: '000036',
        vendedorNovo: '3601',
        estados: ['PR', 'SC', 'RS']
      },
      // 4. De: 000036 + SP/MG/RJ/ES → Para: 3602
      {
        vendedorAntigo: '000036',
        vendedorNovo: '3602',
        estados: ['SP', 'MG', 'RJ', 'ES']
      },
      // 5. De: 000036 + GO/DF/MT/MS → Para: 3603
      {
        vendedorAntigo: '000036',
        vendedorNovo: '3603',
        estados: ['GO', 'DF', 'MT', 'MS']
      },
      // 6. De: 000036 + Norte/Nordeste → Para: 3604
      {
        vendedorAntigo: '000036',
        vendedorNovo: '3604',
        estados: ['AC', 'AP', 'AM', 'PA', 'RO', 'RR', 'TO', 'AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE']
      },
      // 7. De: 000042 + SC/RS → Para: 4201
      {
        vendedorAntigo: '000042',
        vendedorNovo: '4201',
        estados: ['SC', 'RS']
      },
      // 8. De: 000042 + GO/DF/MT/MS → Para: 4202
      {
        vendedorAntigo: '000042',
        vendedorNovo: '4202',
        estados: ['GO', 'DF', 'MT', 'MS']
      },
      // 9. De: 000042 + Norte/Nordeste → Para: 4203
      {
        vendedorAntigo: '000042',
        vendedorNovo: '4203',
        estados: ['AC', 'AP', 'AM', 'PA', 'RO', 'RR', 'TO', 'AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE']
      },
      // 10. De: 000031 → Para: 4231
      {
        vendedorAntigo: '000031',
        vendedorNovo: '4231',
        estados: null
      },
      // 11. De: 000022 → Para: 4222
      {
        vendedorAntigo: '000022',
        vendedorNovo: '4222',
        estados: null
      },
      // 12. De: 000024 → Para: 4203
      {
        vendedorAntigo: '000024',
        vendedorNovo: '4203',
        estados: null
      }
    ];

    // Executar cada alteração
    for (const alteracao of alteracoes) {
      let query: string;
      let params: any[];

      if (alteracao.estados === null) {
        // Alteração sem filtro de estado - atualizar todos os registros do vendedor
        query = `UPDATE vendas SET representante = ? WHERE representante = ?`;
        params = [alteracao.vendedorNovo, alteracao.vendedorAntigo];
      } else {
        // Alteração com filtro de estados - usar IN clause
        const placeholders = alteracao.estados.map(() => '?').join(',');
        query = `UPDATE vendas SET representante = ? WHERE representante = ? AND regiao IN (${placeholders})`;
        params = [alteracao.vendedorNovo, alteracao.vendedorAntigo, ...alteracao.estados];
      }

      const result = await db.prepare(query).bind(...params).run();
      totalUpdated += result.meta.changes || 0;
    }

    return c.json({
      success: true,
      message: 'Alterações de vendedores executadas com sucesso',
      totalUpdated
    });

  } catch (error) {
    console.error('Erro ao atualizar vendedores:', error);
    return c.json({
      success: false,
      message: 'Erro ao executar alterações: ' + String(error)
    }, 500);
  }
});

// ==================== IMPORT ENDPOINTS ====================

// Endpoint específico para importar dados Salmix 2024
app.post("/api/import/salmix-2024", authMiddleware, async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return c.json({ success: false, message: 'Arquivo não fornecido' }, 400);
    }

    const csvText = await file.text();
    const lines = csvText.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      return c.json({ success: false, message: 'Arquivo CSV deve conter pelo menos um cabeçalho e uma linha de dados' }, 400);
    }
    
    const db = c.env.DB;
    
    // LIMPEZA PRÉVIA: Remover APENAS vendas de Salmix B2B (negócio 10) de 2024
    console.log('🧹 Limpando vendas antigas de Salmix B2B 2024...');
    const limpezaResult = await db.prepare(
      "DELETE FROM vendas WHERE strftime('%Y', data_venda) = '2024' AND negocio = '10'"
    ).run();
    console.log(`✅ ${limpezaResult.meta.changes || 0} vendas antigas removidas`)

    // Parse headers usando função robusta de parsing
    const parseCSVLine = (line: string): string[] => {
      const semicolonCount = (line.match(/;/g) || []).length;
      const commaCount = (line.match(/,/g) || []).length;
      const separator = semicolonCount > commaCount ? ';' : ',';
      
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      let i = 0;

      while (i < line.length) {
        const char = line[i];
        
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i += 2;
          } else {
            inQuotes = !inQuotes;
            i++;
          }
        } else if (char === separator && !inQuotes) {
          result.push(current.trim());
          current = '';
          i++;
        } else {
          current += char;
          i++;
        }
      }
      
      result.push(current.trim());
      return result;
    };

    const headers = parseCSVLine(lines[0]).map(h => h.replace(/"/g, '').trim());
    const dataLines = lines.slice(1);
    
    console.log('📊 Total de linhas a processar:', dataLines.length);
    console.log('📋 Headers encontrados:', headers);
    
    let successCount = 0;
    let rejectedCount = 0;
    let totalValorImportado = 0;
    let totalValorRejeitado = 0;
    const errors: string[] = [];
    const motivosRejeicao: { [key: string]: number } = {};

    // Carregar cache de produtos e vendedores
    const produtosResult = await db.prepare(
      "SELECT codigo_produto, nome_produto, preco_unitario, unidade_medida, fabricante FROM produtos"
    ).all();
    
    const produtosExistentes = new Map();
    (produtosResult.results as any[]).forEach(produto => {
      produtosExistentes.set(produto.codigo_produto, produto);
    });
    
    const vendedoresResult = await db.prepare(
      "SELECT vendedor, negocio FROM vendedores"
    ).all();
    
    const vendedorNegocioCache = new Map();
    (vendedoresResult.results as any[]).forEach((v: any) => {
      if (v.vendedor && v.negocio) {
        vendedorNegocioCache.set(v.vendedor, v.negocio);
      }
    });

    // Coleções para batch processing
    const produtosParaInserir = new Map();
    const produtosParaAtualizar = new Map();
    const vendasParaInserir: any[] = [];

    // Processar em lotes maiores, mas com sub-batches pequenos nas inserções
    const BATCH_SIZE = 250; // Aumentado para reduzir número de API calls
    const batches = [];
    for (let i = 0; i < dataLines.length; i += BATCH_SIZE) {
      batches.push(dataLines.slice(i, i + BATCH_SIZE));
    }

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      
      for (let i = 0; i < batch.length; i++) {
        const lineIndex = batchIndex * BATCH_SIZE + i;
        try {
          const values = parseCSVLine(batch[i]).map(v => v.replace(/"/g, '').trim());
          
          const rowData: any = {};
          headers.forEach((header, index) => {
            if (index < values.length) {
              rowData[header] = values[index];
            }
          });

          // Processar dados de vendas (mesmos campos da importação regular)
          const dtEmissao = rowData['DT Emissao'] || '';
          const produto = rowData['Produto'] || '';
          const descricao = rowData['Descricao'] || '';
          const quantidade = rowData['Quantidade'] || '0';
          const valorUnitario = rowData['Valor Unitario'] || '0';
          const valorTotal = rowData['Valor Mercadoria'] || rowData['Total'] || '0';
          const vendedor = rowData['Vendedor 1'] || null;
          const estado = rowData['Estado'] || null;
          const cliente = rowData['Cliente'] || null;
          const nomeCliente = rowData['Nome'] || null;
          const unidadeMedida = rowData['Um'] || null;
          
          // Buscar negócio do vendedor do cache
          let negocio = vendedor ? vendedorNegocioCache.get(vendedor) || null : null;

          if (!dtEmissao || !produto || !descricao) {
            const motivo = 'Campos obrigatórios faltando';
            errors.push(`Linha ${lineIndex + 2}: ${motivo}`);
            motivosRejeicao[motivo] = (motivosRejeicao[motivo] || 0) + 1;
            rejectedCount++;
            continue;
          }

          // Parse valores numéricos
          const parseDecimal = (value: string): number => {
            if (!value) return 0;
            let cleaned = value.replace(/\s/g, '');
            
            if (cleaned.includes('.') && cleaned.includes(',')) {
              cleaned = cleaned.replace(/\./g, '').replace(',', '.');
            } else if (cleaned.includes(',') && !cleaned.includes('.')) {
              cleaned = cleaned.replace(',', '.');
            } else if (cleaned.includes('.') && !cleaned.includes(',')) {
              const parts = cleaned.split('.');
              if (parts.length === 2 && parts[1].length <= 2) {
                // Decimal
              } else if (parts.length > 2 || (parts.length === 2 && parts[1].length > 2)) {
                cleaned = cleaned.replace(/\./g, '');
              }
            }
            
            return parseFloat(cleaned) || 0;
          };

          const cleanQuantidade = parseInt(quantidade.replace(/\s/g, '').replace(',', '.')) || 0;
          const cleanValorUnitario = parseDecimal(valorUnitario);
          const cleanValorTotal = parseDecimal(valorTotal);

          // Gerenciar produtos
          const produtoExistente = produtosExistentes.get(produto);
          
          if (produtoExistente) {
            const dadosMudaram = produtoExistente.nome_produto !== descricao ||
                                Math.abs((produtoExistente.preco_unitario || 0) - cleanValorUnitario) > 0.01 ||
                                produtoExistente.unidade_medida !== unidadeMedida ||
                                produtoExistente.fabricante !== negocio;
            
            if (dadosMudaram) {
              produtosParaAtualizar.set(produto, {
                nome_produto: descricao,
                preco_unitario: cleanValorUnitario,
                unidade_medida: unidadeMedida,
                fabricante: negocio
              });
            }
          } else {
            produtosParaInserir.set(produto, {
              codigo_produto: produto,
              nome_produto: descricao,
              preco_unitario: cleanValorUnitario,
              unidade_medida: unidadeMedida,
              fabricante: negocio
            });
            
            produtosExistentes.set(produto, {
              codigo_produto: produto,
              nome_produto: descricao,
              preco_unitario: cleanValorUnitario,
              unidade_medida: unidadeMedida,
              fabricante: negocio
            });
          }

          // Converter data de DD/MM/YYYY para YYYY-MM-DD
          let formattedDate = dtEmissao;
          if (dtEmissao.includes('/')) {
            const dateParts = dtEmissao.split('/');
            if (dateParts.length === 3) {
              const [day, month, year] = dateParts;
              const dayNum = parseInt(day);
              const monthNum = parseInt(month);
              const yearNum = parseInt(year);
              
              if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12 && yearNum >= 1900) {
                formattedDate = `${yearNum}-${monthNum.toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
                
                // Validar que a data é de 2024
                if (yearNum !== 2024) {
                  const motivo = 'Data não é de 2024';
                  errors.push(`Linha ${lineIndex + 2}: ${motivo} - ${dtEmissao}`);
                  motivosRejeicao[motivo] = (motivosRejeicao[motivo] || 0) + 1;
                  totalValorRejeitado += cleanValorTotal;
                  rejectedCount++;
                  continue;
                }
              } else {
                const motivo = 'Data inválida';
                errors.push(`Linha ${lineIndex + 2}: ${motivo} - ${dtEmissao}`);
                motivosRejeicao[motivo] = (motivosRejeicao[motivo] || 0) + 1;
                totalValorRejeitado += cleanValorTotal;
                rejectedCount++;
                continue;
              }
            } else {
              const motivo = 'Formato de data inválido';
              errors.push(`Linha ${lineIndex + 2}: ${motivo} - ${dtEmissao}`);
              motivosRejeicao[motivo] = (motivosRejeicao[motivo] || 0) + 1;
              totalValorRejeitado += cleanValorTotal;
              rejectedCount++;
              continue;
            }
          }
          
          // Acumular valor total para diagnóstico
          totalValorImportado += cleanValorTotal;

          // Adicionar venda para inserção
          vendasParaInserir.push({
            type: 'vendas',
            data: [formattedDate, produto, descricao, cleanQuantidade, cleanValorUnitario, cleanValorTotal, vendedor, estado, cliente, nomeCliente, negocio]
          });
          
          // Adicionar cliente se não for null
          if (cliente && nomeCliente) {
            vendasParaInserir.push({
              type: 'clientes_auto',
              data: [cliente, nomeCliente, estado, negocio]
            });
          }
          
          successCount++;
        } catch (error) {
          errors.push(`Linha ${lineIndex + 2}: Erro ao processar - ${error}`);
          rejectedCount++;
        }
      }
      
      // Processar batch a cada 5 lotes ou no final
      if ((batchIndex + 1) % 5 === 0 || batchIndex === batches.length - 1) {
        try {
          // Inserir novos produtos
          if (produtosParaInserir.size > 0) {
            const insertStatements = Array.from(produtosParaInserir.values()).map(dados =>
              db.prepare(
                `INSERT OR IGNORE INTO produtos (codigo_produto, nome_produto, categoria, preco_unitario, unidade_medida, fabricante, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`
              ).bind(dados.codigo_produto, dados.nome_produto, null, dados.preco_unitario, dados.unidade_medida, dados.fabricante, 'Ativo')
            );
            
            if (insertStatements.length > 0) {
              await db.batch(insertStatements);
            }
          }
          
          // Atualizar produtos existentes
          if (produtosParaAtualizar.size > 0) {
            const updateStatements = Array.from(produtosParaAtualizar.entries()).map(([codigo, dados]) =>
              db.prepare(
                `UPDATE produtos 
                 SET nome_produto = ?, preco_unitario = ?, unidade_medida = ?, fabricante = ?, updated_at = CURRENT_TIMESTAMP
                 WHERE codigo_produto = ?`
              ).bind(dados.nome_produto, dados.preco_unitario, dados.unidade_medida, dados.fabricante, codigo)
            );
            
            if (updateStatements.length > 0) {
              await db.batch(updateStatements);
            }
          }
          
          // Inserir vendas e clientes
          const porTipo: { [key: string]: any[] } = {};
          for (const item of vendasParaInserir) {
            if (!porTipo[item.type]) {
              porTipo[item.type] = [];
            }
            porTipo[item.type].push(item.data);
          }
          
          for (const [tipo, dados] of Object.entries(porTipo)) {
            if (tipo === 'vendas') {
              const batch = db.batch(
                dados.map(d => db.prepare(
                  `INSERT INTO vendas (data_venda, codigo_produto, nome_produto, quantidade, valor_unitario, valor_total, representante, regiao, cliente, nome_cliente, negocio)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
                ).bind(...d))
              );
              await batch;
            } else if (tipo === 'clientes_auto') {
              const batch = db.batch(
                dados.map(d => db.prepare(
                  `INSERT OR REPLACE INTO clientes (codigo_cliente, nome_cliente, estado, negocio, ativo)
                   VALUES (?, ?, ?, ?, 1)`
                ).bind(...d))
              );
              await batch;
            }
          }
          
          // Limpar buffers
          produtosParaInserir.clear();
          produtosParaAtualizar.clear();
          vendasParaInserir.length = 0;
          
        } catch (batchError) {
          errors.push(`Erro ao processar batch ${batchIndex + 1}: ${batchError}`);
        }
      }
    }

    // Verificar total após importação
    const totalAposImportacao = await db.prepare(
      `SELECT 
        COUNT(*) as total_vendas,
        SUM(valor_total) as valor_total
       FROM vendas 
       WHERE strftime('%Y', data_venda) = '2024'
       AND negocio = '10'`
    ).first() as any;
    
    console.log('📊 RESULTADO DA IMPORTAÇÃO SALMIX 2024:');
    console.log(`  - Linhas processadas com sucesso: ${successCount}`);
    console.log(`  - Linhas rejeitadas: ${rejectedCount}`);
    console.log(`  - Valor total aceito (CSV): R$ ${totalValorImportado.toFixed(2)}`);
    console.log(`  - Valor total rejeitado: R$ ${totalValorRejeitado.toFixed(2)}`);
    console.log(`  - Motivos de rejeição:`, motivosRejeicao);
    console.log(`  - Vendas no banco após importação: ${totalAposImportacao?.total_vendas || 0}`);
    console.log(`  - Valor no banco após importação: R$ ${(totalAposImportacao?.valor_total || 0).toFixed(2)}`);
    
    const valorDiferenca = totalValorImportado - (totalAposImportacao?.valor_total || 0);
    console.log(`  - Diferença (aceito vs banco): R$ ${valorDiferenca.toFixed(2)}`);
    
    return c.json({
      success: successCount > 0,
      message: successCount > 0 
        ? `Importação Salmix 2024 concluída. ${successCount} registros processados, ${rejectedCount} rejeitados.`
        : 'Nenhum registro foi importado',
      recordsProcessed: successCount,
      recordsRejected: rejectedCount,
      diagnostico: {
        valorAceito: totalValorImportado,
        valorRejeitado: totalValorRejeitado,
        valorBanco: totalAposImportacao?.valor_total || 0,
        diferenca: valorDiferenca,
        vendasBanco: totalAposImportacao?.total_vendas || 0,
        motivosRejeicao
      },
      errors: errors.length > 0 ? errors.slice(0, 20) : undefined
    });

  } catch (error) {
    return c.json({
      success: false,
      message: 'Erro interno do servidor',
      errors: [String(error)]
    }, 500);
  }
});

// Função para parsing robusto de CSV que detecta o separador automaticamente
function parseCSVLine(line: string): string[] {
  // Detectar se usa vírgula ou ponto e vírgula como separador
  const semicolonCount = (line.match(/;/g) || []).length;
  const commaCount = (line.match(/,/g) || []).length;
  const separator = semicolonCount > commaCount ? ';' : ',';
  
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i += 2;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
        i++;
      }
    } else if (char === separator && !inQuotes) {
      // Field separator
      result.push(current.trim());
      current = '';
      i++;
    } else {
      current += char;
      i++;
    }
  }
  
  // Add the last field
  result.push(current.trim());
  return result;
}

app.post("/api/import", authMiddleware, async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;

    if (!file || !type) {
      return c.json({ success: false, message: 'Arquivo ou tipo não fornecido' }, 400);
    }

    const csvText = await file.text();
    const lines = csvText.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      return c.json({ success: false, message: 'Arquivo CSV deve conter pelo menos um cabeçalho e uma linha de dados' }, 400);
    }

    // Parse headers using robust CSV parsing
    const headers = parseCSVLine(lines[0]).map(h => h.replace(/"/g, '').trim());
    const dataLines = lines.slice(1);
    
    let successCount = 0;
    const errors: string[] = [];

    // Determinar TODOS os DIAS dos dados sendo importados para substituir apenas esses períodos
    // MUDANÇA CRÍTICA: importação incremental por DIA, não por MÊS
    let diasNoArquivo: string[] = [];
    
    if (type === 'vendas') {
      // Analisar TODAS as datas no arquivo para determinar TODOS os DIAS presentes
      const diasUnicos = new Set<string>();
      for (let i = 0; i < dataLines.length; i++) {
        try {
          const values = parseCSVLine(dataLines[i]).map(v => v.replace(/"/g, '').trim());
          const rowData: any = {};
          headers.forEach((header, index) => {
            if (index < values.length) {
              rowData[header] = values[index];
            }
          });
          
          const dtEmissao = rowData['DT Emissao'] || '';
          if (dtEmissao && dtEmissao.includes('/')) {
            const dateParts = dtEmissao.split('/');
            if (dateParts.length === 3) {
              const [day, month, year] = dateParts;
              const dayNum = parseInt(day);
              const monthNum = parseInt(month);
              const yearNum = parseInt(year);
              if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12 && yearNum >= 1900) {
                const dataCompleta = `${yearNum}-${monthNum.toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
                diasUnicos.add(dataCompleta);
              }
            }
          }
        } catch (e) {
          // Ignorar erros na análise prévia
        }
      }
      
      diasNoArquivo = Array.from(diasUnicos).sort();
      console.log('📅 IMPORTAÇÃO INCREMENTAL: Dias detectados no arquivo:', diasNoArquivo);
    }

    if (type === 'forecast') {
      // Limpar dados de forecast existentes
      await c.env.DB.prepare("DELETE FROM previsao_vendas").run();
    } else if (type === 'vendedores') {
      // Limpar dados de vendedores existentes
      await c.env.DB.prepare("DELETE FROM vendedores").run();
    } else if (type === 'budget') {
      // Limpar dados de budget existentes
      await c.env.DB.prepare("DELETE FROM budget").run();
    } else if (type === 'inventory') {
      // Limpar dados de inventory existentes
      await c.env.DB.prepare("DELETE FROM inventory").run();
    } else if (type === 'price_table') {
      // Limpar dados de price_table existentes
      await c.env.DB.prepare("DELETE FROM price_table").run();
    } else if (type === 'clientes') {
      // Limpar dados de clientes existentes (manter estrutura)
      await c.env.DB.prepare("DELETE FROM clientes").run();
    } else if (type === 'vendas') {
      // Para vendas: preservar dados históricos, substituir APENAS os DIAS presentes no arquivo
      // MUDANÇA CRÍTICA: importação incremental por DIA permite atualizações diárias
      // Exemplo: importar 15/12/2025 sem afetar 1-14/12 e 16-31/12
      if (diasNoArquivo.length > 0) {
        // IMPORTANTE: Dividir em lotes MUITO PEQUENOS para respeitar limite de 999 variáveis do SQLite
        const DELETE_BATCH_SIZE = 50; // Reduzido de 200 para 50
        let totalDeletadas = 0;
        
        for (let i = 0; i < diasNoArquivo.length; i += DELETE_BATCH_SIZE) {
          const diasBatch = diasNoArquivo.slice(i, i + DELETE_BATCH_SIZE);
          const placeholders = diasBatch.map(() => '?').join(',');
          
          const deleteResult = await c.env.DB.prepare(
            `DELETE FROM vendas WHERE data_venda IN (${placeholders})`
          ).bind(...diasBatch).run();
          
          totalDeletadas += deleteResult.meta.changes || 0;
        }
        
        console.log(`🗑️ IMPORTAÇÃO INCREMENTAL: ${totalDeletadas} vendas removidas de ${diasNoArquivo.length} dia(s): ${diasNoArquivo.slice(0, 5).join(', ')}${diasNoArquivo.length > 5 ? '...' : ''}`);
      }
      
      // Não limpar produtos - eles serão atualizados/criados conforme necessário
      // Os produtos históricos permanecem intactos
    } else if (type === 'estoque') {
      await c.env.DB.prepare("DELETE FROM estoque").run();
    }

    // OTIMIZAÇÃO: Carregar produtos existentes uma única vez para evitar muitas consultas
    let produtosExistentes: Map<string, any> = new Map();
    let vendedorNegocioCache: Map<string, string> = new Map();
    
    if (type === 'vendas') {
      // Carregar produtos existentes
      const produtosResult = await c.env.DB.prepare(
        "SELECT codigo_produto, nome_produto, preco_unitario, unidade_medida, fabricante FROM produtos"
      ).all();
      
      (produtosResult.results as any[]).forEach(produto => {
        produtosExistentes.set(produto.codigo_produto, produto);
      });
      
      // Carregar cache de vendedor->negócio
      const vendedoresResult = await c.env.DB.prepare(
        "SELECT vendedor, negocio FROM vendedores"
      ).all();
      
      (vendedoresResult.results as any[]).forEach((v: any) => {
        if (v.vendedor && v.negocio) {
          vendedorNegocioCache.set(v.vendedor, v.negocio);
        }
      });
    }

    // Coleções para batch processing
    const produtosParaInserir = new Map();
    const produtosParaAtualizar = new Map();
    const vendasParaInserir: any[] = [];
    
    // Process em lotes para evitar muitas operações de API
    // Aumentar batch size para processar mais rápido
    const BATCH_SIZE = 500; // Aumentado de 50 para 500 para reduzir overhead
    const batches = [];
    for (let i = 0; i < dataLines.length; i += BATCH_SIZE) {
      batches.push(dataLines.slice(i, i + BATCH_SIZE));
    }

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      
      for (let i = 0; i < batch.length; i++) {
        const lineIndex = batchIndex * BATCH_SIZE + i;
      try {
          const values = parseCSVLine(batch[i]).map(v => v.replace(/"/g, '').trim());
          
          const rowData: any = {};
          headers.forEach((header, index) => {
            if (index < values.length) {
              rowData[header] = values[index];
            }
          });

          if (type === 'forecast') {
            // Process forecast data
            const mes = rowData['mes'] || '';
            const ano = rowData['ano'] || '';
            const codigoProduto = rowData['codigo_produto'] || '';
            const nomeProduto = rowData['nome_produto'] || '';
            const quantidadePrevista = rowData['quantidade_prevista'] || '0';
            const precoPrevisto = rowData['preco_previsto'] || '0';
            const negocio = rowData['negocio'] || '';

            if (!mes || !ano || !codigoProduto || !nomeProduto) {
              errors.push(`Linha ${lineIndex + 2}: Campos obrigatórios faltando - mes: "${mes}", ano: "${ano}", codigo_produto: "${codigoProduto}", nome_produto: "${nomeProduto}"`);
              continue;
            }

            // Parse numeric values
            const mesNum = parseInt(mes);
            const anoNum = parseInt(ano);
            const quantidadeNum = parseInt(quantidadePrevista) || 0;
            const precoNum = parseFloat(precoPrevisto.replace(',', '.')) || 0;

            // Validate date
            if (mesNum < 1 || mesNum > 12 || anoNum < 2000) {
              errors.push(`Linha ${lineIndex + 2}: Data inválida - mês: ${mesNum}, ano: ${anoNum}`);
              continue;
            }

            // Add to batch for insertion
            vendasParaInserir.push({
              type: 'forecast',
              data: [mesNum, anoNum, codigoProduto, nomeProduto, quantidadeNum, precoNum, negocio]
            });
          } else if (type === 'budget') {
            // Process budget data
            const negocio = rowData['Negocio'] || '';
            const vendedor = rowData['Vendedor 1'] || '';
            const nomeVendedor = rowData['Nome_Vendedor 1'] || '';
            const regional = rowData['Regional'] || '';
            
            if (!negocio || !vendedor) {
              errors.push(`Linha ${lineIndex + 2}: Campos obrigatórios faltando - Negocio: "${negocio}", Vendedor 1: "${vendedor}"`);
              continue;
            }

            // Parse monthly values (jan/25 through dez/26)
            const meses2025 = ['jan/25', 'fev/25', 'mar/25', 'abr/25', 'mai/25', 'jun/25', 
                          'jul/25', 'ago/25', 'set/25', 'out/25', 'nov/25', 'dez/25'];
            const meses2026 = ['jan/26', 'fev/26', 'mar/26', 'abr/26', 'mai/26', 'jun/26', 
                          'jul/26', 'ago/26', 'set/26', 'out/26', 'nov/26', 'dez/26'];
            
            const parseDecimal = (value: string): number => {
              if (!value) return 0;
              let cleaned = value.replace(/\s/g, '');
              
              if (cleaned.includes('.') && cleaned.includes(',')) {
                cleaned = cleaned.replace(/\./g, '').replace(',', '.');
              } else if (cleaned.includes(',') && !cleaned.includes('.')) {
                cleaned = cleaned.replace(',', '.');
              } else if (cleaned.includes('.') && !cleaned.includes(',')) {
                const parts = cleaned.split('.');
                if (parts.length === 2 && parts[1].length <= 2) {
                  // Keep as decimal
                } else if (parts.length > 2 || (parts.length === 2 && parts[1].length > 2)) {
                  cleaned = cleaned.replace(/\./g, '');
                }
              }
              
              return parseFloat(cleaned) || 0;
            };
            
            const valoresMensais2025 = meses2025.map(mes => parseDecimal(rowData[mes] || '0'));
            const valoresMensais2026 = meses2026.map(mes => parseDecimal(rowData[mes] || '0'));

            vendasParaInserir.push({
              type: 'budget',
              data: [negocio, vendedor, nomeVendedor, regional, ...valoresMensais2025, ...valoresMensais2026]
            });
          } else if (type === 'inventory') {
            // Process inventory data
            const productId = rowData['product_id'] || '';
            const productName = rowData['product_name'] || '';
            const lote = rowData['lote'] || '';
            const validade = rowData['validade'] || '';
            const quantidadeDisponivel = rowData['quantidade_disponivel'] || '0';
            const unidadeMedida = rowData['unidade_medida'] || '';
            const armazem = rowData['armazem'] || '';

            if (!productId || !productName) {
              errors.push(`Linha ${lineIndex + 2}: Campos obrigatórios faltando - product_id: "${productId}", product_name: "${productName}"`);
              continue;
            }

            const quantidadeNum = parseInt(quantidadeDisponivel) || 0;

            let formattedDate = validade;
            if (validade && validade.includes('/')) {
              const dateParts = validade.split('/');
              if (dateParts.length === 3) {
                const [day, month, year] = dateParts;
                const dayNum = parseInt(day);
                const monthNum = parseInt(month);
                const yearNum = parseInt(year);
                
                if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12 && yearNum >= 1900) {
                  formattedDate = `${yearNum}-${monthNum.toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
                }
              }
            }

            vendasParaInserir.push({
              type: 'inventory',
              data: [productId, productName, lote, formattedDate || null, quantidadeNum, unidadeMedida, armazem, new Date().toISOString()]
            });
          } else if (type === 'price_table') {
            // Process price table data
            const productId = rowData['product_id'] || '';
            const productName = rowData['product_name'] || '';
            const precoBase = rowData['preco_base'] || '0';
            const precoMinimo = rowData['preco_minimo'] || '0';
            const maxDescontoPermitido = rowData['max_desconto_permitido'] || '0.11';
            const politicaPreco = rowData['politica_preco'] || 'padrão';

            if (!productId || !productName) {
              errors.push(`Linha ${lineIndex + 2}: Campos obrigatórios faltando - product_id: "${productId}", product_name: "${productName}"`);
              continue;
            }

            const parseDecimal = (value: string): number => {
              if (!value) return 0;
              let cleaned = value.replace(/\s/g, '');
              
              if (cleaned.includes('.') && cleaned.includes(',')) {
                cleaned = cleaned.replace(/\./g, '').replace(',', '.');
              } else if (cleaned.includes(',') && !cleaned.includes('.')) {
                cleaned = cleaned.replace(',', '.');
              }
              
              return parseFloat(cleaned) || 0;
            };

            const precoBaseNum = parseDecimal(precoBase);
            const precoMinimoNum = parseDecimal(precoMinimo);
            const maxDescontoNum = parseDecimal(maxDescontoPermitido);

            vendasParaInserir.push({
              type: 'price_table',
              data: [productId, productName, precoBaseNum, precoMinimoNum, maxDescontoNum, politicaPreco]
            });
          } else if (type === 'clientes') {
            // Process clientes data
            const codigoCliente = rowData['codigo_cliente'] || '';
            const nomeCliente = rowData['nome_cliente'] || '';
            const cnpj = rowData['cnpj'] || '';
            const email = rowData['email'] || '';
            const telefone = rowData['telefone'] || '';
            const endereco = rowData['endereco'] || '';
            const cidade = rowData['cidade'] || '';
            const estado = rowData['estado'] || '';
            const categoria = rowData['categoria'] || '';

            if (!codigoCliente || !nomeCliente) {
              errors.push(`Linha ${lineIndex + 2}: Campos obrigatórios faltando - codigo_cliente: "${codigoCliente}", nome_cliente: "${nomeCliente}"`);
              continue;
            }

            vendasParaInserir.push({
              type: 'clientes',
              data: [codigoCliente, nomeCliente, cnpj, email, telefone, endereco, cidade, estado, categoria, true]
            });
          } else if (type === 'vendedores') {
            // Process vendedores data
            const vendedor = rowData['Vendedor 1'] || '';
            const nomeVendedor = rowData['Nome_Vendedor 1'] || '';
            const regional = rowData['Regional'] || '';
            const negocio = rowData['Negocio'] || '';

            if (!vendedor || !nomeVendedor) {
              errors.push(`Linha ${lineIndex + 2}: Campos obrigatórios faltando - Vendedor 1: "${vendedor}", Nome_Vendedor 1: "${nomeVendedor}"`);
              continue;
            }

            vendasParaInserir.push({
              type: 'vendedores',
              data: [vendedor, nomeVendedor, regional, negocio]
            });
          } else if (type === 'vendas') {
            // Map fields from the CSV structure
            const dtEmissao = rowData['DT Emissao'] || '';
            const produto = rowData['Produto'] || '';
            const descricao = rowData['Descricao'] || '';
            const quantidade = rowData['Quantidade'] || '0';
            const valorUnitario = rowData['Valor Unitario'] || '0';
            const valorTotal = rowData['Valor Mercadoria'] || rowData['Total'] || '0';
            const vendedor = rowData['Vendedor 1'] || null;
            const estado = rowData['Estado'] || null;
            const cliente = rowData['Cliente'] || null;
            const nomeCliente = rowData['Nome'] || null;
            const unidadeMedida = rowData['Um'] || null;
            
            // Buscar negócio do vendedor do cache
            let negocio = vendedor ? vendedorNegocioCache.get(vendedor) || null : null;

            if (!dtEmissao || !produto || !descricao) {
              errors.push(`Linha ${lineIndex + 2}: Campos obrigatórios faltando - DT Emissao: "${dtEmissao}", Produto: "${produto}", Descricao: "${descricao}"`);
              continue;
            }

            // Parse Brazilian currency format (e.g., "2.568,00" -> 2568.00)
            const parseDecimal = (value: string): number => {
              if (!value) return 0;
              // Remove all spaces and handle Brazilian format
              let cleaned = value.replace(/\s/g, '');
              
              // If has both dots and commas, treat dots as thousands separator and comma as decimal
              if (cleaned.includes('.') && cleaned.includes(',')) {
                // Example: "2.568,00" -> remove dots, replace comma with dot
                cleaned = cleaned.replace(/\./g, '').replace(',', '.');
              }
              // If only has comma, treat as decimal separator
              else if (cleaned.includes(',') && !cleaned.includes('.')) {
                // Example: "2568,00" -> replace comma with dot
                cleaned = cleaned.replace(',', '.');
              }
              // If only has dots, check if it's thousands separator or decimal
              else if (cleaned.includes('.') && !cleaned.includes(',')) {
                const parts = cleaned.split('.');
                if (parts.length === 2 && parts[1].length <= 2) {
                  // Likely decimal: "2568.00"
                  // Keep as is
                } else if (parts.length > 2 || (parts.length === 2 && parts[1].length > 2)) {
                  // Likely thousands separator: "2.568" -> remove dots
                  cleaned = cleaned.replace(/\./g, '');
                }
              }
              
              return parseFloat(cleaned) || 0;
            };

            // Clean and parse numeric values
            const cleanQuantidade = parseInt(quantidade.replace(/\s/g, '').replace(',', '.')) || 0;
            const cleanValorUnitario = parseDecimal(valorUnitario);
            const cleanValorTotal = parseDecimal(valorTotal);

            // Otimização: Verificar se produto existe no cache local
            const produtoExistente = produtosExistentes.get(produto);
            
            if (produtoExistente) {
              // Produto existe - adicionar para atualização se dados mudaram
              const dadosMudaram = produtoExistente.nome_produto !== descricao ||
                                  Math.abs((produtoExistente.preco_unitario || 0) - cleanValorUnitario) > 0.01 ||
                                  produtoExistente.unidade_medida !== unidadeMedida ||
                                  produtoExistente.fabricante !== negocio;
              
              if (dadosMudaram) {
                produtosParaAtualizar.set(produto, {
                  nome_produto: descricao,
                  preco_unitario: cleanValorUnitario,
                  unidade_medida: unidadeMedida,
                  fabricante: negocio
                });
              }
            } else {
              // Produto não existe - adicionar para inserção
              produtosParaInserir.set(produto, {
                codigo_produto: produto,
                nome_produto: descricao,
                preco_unitario: cleanValorUnitario,
                unidade_medida: unidadeMedida,
                fabricante: negocio
              });
              
              // Adicionar ao cache local para as próximas linhas
              produtosExistentes.set(produto, {
                codigo_produto: produto,
                nome_produto: descricao,
                preco_unitario: cleanValorUnitario,
                unidade_medida: unidadeMedida,
                fabricante: negocio
              });
            }

            // Convert date from DD/MM/YYYY to YYYY-MM-DD format
            let formattedDate = dtEmissao;
            if (dtEmissao.includes('/')) {
              const dateParts = dtEmissao.split('/');
              if (dateParts.length === 3) {
                const [day, month, year] = dateParts;
                // Validate date parts
                const dayNum = parseInt(day);
                const monthNum = parseInt(month);
                const yearNum = parseInt(year);
                
                if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12 && yearNum >= 1900) {
                  formattedDate = `${yearNum}-${monthNum.toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
                } else {
                  errors.push(`Linha ${lineIndex + 2}: Data inválida - ${dtEmissao}`);
                  continue;
                }
              } else {
                errors.push(`Linha ${lineIndex + 2}: Formato de data inválido - ${dtEmissao}. Use DD/MM/YYYY`);
                continue;
              }
            }

            // Add venda to batch for insertion
            vendasParaInserir.push({
              type: 'vendas',
              data: [formattedDate, produto, descricao, cleanQuantidade, cleanValorUnitario, cleanValorTotal, vendedor, estado, cliente, nomeCliente, negocio]
            });
            
            // Add cliente to batch for insertion/update if not null
            if (cliente && nomeCliente) {
              vendasParaInserir.push({
                type: 'clientes_auto',
                data: [cliente, nomeCliente, estado, negocio]
              });
            }
          } else if (type === 'estoque') {
            vendasParaInserir.push({
              type: 'estoque',
              data: [
                rowData.codigo_produto || '',
                parseInt(rowData.quantidade_estoque) || 0,
                rowData.local_armazenamento || null,
                parseInt(rowData.estoque_minimo) || 10
              ]
            });
          }
          
          successCount++;
        } catch (error) {
          errors.push(`Linha ${lineIndex + 2}: Erro ao processar dados - ${error}`);
        }
      }
      
      // Process batch inserts/updates a cada 5 lotes
      // Balancear entre limite de variáveis SQL e limite de API requests
      if ((batchIndex + 1) % 5 === 0 || batchIndex === batches.length - 1) {
        console.log(`📦 Processando batch ${batchIndex + 1}/${batches.length} - ${successCount} registros processados até agora`);
        try {
          // Inserir novos produtos em batch usando batch API
          if (produtosParaInserir.size > 0) {
            const insertStatements = Array.from(produtosParaInserir.values()).map(dados =>
              c.env.DB.prepare(
                `INSERT OR IGNORE INTO produtos (codigo_produto, nome_produto, categoria, preco_unitario, unidade_medida, fabricante, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`
              ).bind(
                dados.codigo_produto,
                dados.nome_produto,
                null,
                dados.preco_unitario,
                dados.unidade_medida,
                dados.fabricante,
                'Ativo'
              )
            );
            
            if (insertStatements.length > 0) {
              await c.env.DB.batch(insertStatements);
            }
          }
          
          // Atualizar produtos existentes em batch usando batch API
          if (produtosParaAtualizar.size > 0) {
            const updateStatements = Array.from(produtosParaAtualizar.entries()).map(([codigo, dados]) =>
              c.env.DB.prepare(
                `UPDATE produtos 
                 SET nome_produto = ?, preco_unitario = ?, unidade_medida = ?, fabricante = ?, updated_at = CURRENT_TIMESTAMP
                 WHERE codigo_produto = ?`
              ).bind(
                dados.nome_produto,
                dados.preco_unitario,
                dados.unidade_medida,
                dados.fabricante,
                codigo
              )
            );
            
            if (updateStatements.length > 0) {
              await c.env.DB.batch(updateStatements);
            }
          }
          
          // Inserir vendas/forecast/estoque em batch usando batch statements
          // Agrupar por tipo para melhor performance
          const porTipo: { [key: string]: any[] } = {};
          for (const item of vendasParaInserir) {
            if (!porTipo[item.type]) {
              porTipo[item.type] = [];
            }
            porTipo[item.type].push(item.data);
          }
          
          // Processar cada tipo em batch
          // CRÍTICO: Dividir em sub-batches pequenos para respeitar limite de 999 variáveis do SQLite
          // Budget tem 28 parâmetros - com 10 registros = 280 variáveis (seguro)
          // Vendas tem 11 parâmetros - com 10 registros = 110 variáveis (seguro)
          const SUB_BATCH_SIZE = 10;
          
          for (const [tipo, dados] of Object.entries(porTipo)) {
            // Dividir dados em sub-batches
            for (let i = 0; i < dados.length; i += SUB_BATCH_SIZE) {
              const subBatch = dados.slice(i, i + SUB_BATCH_SIZE);
              
              if (tipo === 'vendas') {
                const batch = c.env.DB.batch(
                  subBatch.map(d => c.env.DB.prepare(
                    `INSERT INTO vendas (data_venda, codigo_produto, nome_produto, quantidade, valor_unitario, valor_total, representante, regiao, cliente, nome_cliente, negocio)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
                  ).bind(...d))
                );
                await batch;
              } else if (tipo === 'forecast') {
                const batch = c.env.DB.batch(
                  subBatch.map(d => c.env.DB.prepare(
                    `INSERT INTO previsao_vendas (mes, ano, codigo_produto, nome_produto, quantidade_prevista, preco_previsto, negocio)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`
                  ).bind(...d))
                );
                await batch;
              } else if (tipo === 'budget') {
                const batch = c.env.DB.batch(
                  subBatch.map(d => c.env.DB.prepare(
                    `INSERT INTO budget (negocio, vendedor, nome_vendedor, regional, jan_25, fev_25, mar_25, abr_25, mai_25, jun_25, jul_25, ago_25, set_25, out_25, nov_25, dez_25, jan_26, fev_26, mar_26, abr_26, mai_26, jun_26, jul_26, ago_26, set_26, out_26, nov_26, dez_26)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
                  ).bind(...d))
                );
                await batch;
              } else if (tipo === 'estoque') {
                const batch = c.env.DB.batch(
                  subBatch.map(d => c.env.DB.prepare(
                    `INSERT INTO estoque (codigo_produto, quantidade_estoque, local_armazenamento, estoque_minimo)
                     VALUES (?, ?, ?, ?)`
                  ).bind(...d))
                );
                await batch;
              } else if (tipo === 'inventory') {
                const batch = c.env.DB.batch(
                  subBatch.map(d => c.env.DB.prepare(
                    `INSERT INTO inventory (product_id, product_name, lote, validade, quantidade_disponivel, unidade_medida, armazem, data_atualizacao)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
                  ).bind(...d))
                );
                await batch;
              } else if (tipo === 'price_table') {
                const batch = c.env.DB.batch(
                  subBatch.map(d => c.env.DB.prepare(
                    `INSERT OR REPLACE INTO price_table (product_id, product_name, preco_base, preco_minimo, max_desconto_permitido, politica_preco)
                     VALUES (?, ?, ?, ?, ?, ?)`
                  ).bind(...d))
                );
                await batch;
              } else if (tipo === 'clientes') {
                const batch = c.env.DB.batch(
                  subBatch.map(d => c.env.DB.prepare(
                    `INSERT OR REPLACE INTO clientes (codigo_cliente, nome_cliente, cnpj, email, telefone, endereco, cidade, estado, categoria, ativo)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
                  ).bind(...d))
                );
                await batch;
              } else if (tipo === 'vendedores') {
                const batch = c.env.DB.batch(
                  subBatch.map(d => c.env.DB.prepare(
                    `INSERT OR REPLACE INTO vendedores (vendedor, nome_vendedor, regional, negocio)
                     VALUES (?, ?, ?, ?)`
                  ).bind(...d))
                );
                await batch;
              } else if (tipo === 'clientes_auto') {
                const batch = c.env.DB.batch(
                  subBatch.map(d => c.env.DB.prepare(
                    `INSERT OR REPLACE INTO clientes (codigo_cliente, nome_cliente, estado, negocio, ativo)
                     VALUES (?, ?, ?, ?, 1)`
                  ).bind(...d))
                );
                await batch;
              }
            }
          }
          
          // Limpar buffers
          produtosParaInserir.clear();
          produtosParaAtualizar.clear();
          vendasParaInserir.length = 0;
          
        } catch (batchError) {
          errors.push(`Erro ao processar batch ${batchIndex + 1}: ${batchError}`);
        }
      }
    }

    // PROCEDIMENTOS LEVES AUTOMÁTICOS APÓS IMPORTAÇÃO
    // Apenas correções rápidas que não causam timeout
    let correcoesMensagem = '';
    if (successCount > 0 && (type === 'vendedores' || type === 'budget')) {
      try {
        const db = c.env.DB;
        const etapas: string[] = [];
        
        // PROCEDIMENTO 1: Atualizar id_negocio na tabela vendedores
        if (type === 'vendedores') {
          await db.prepare(
            `UPDATE vendedores 
             SET id_negocio = CASE negocio
               WHEN 'Salmix B2B' THEN '10'
               WHEN 'Ruminantes' THEN '36'
               WHEN 'Ave/Sui' THEN '42'
               ELSE id_negocio
             END
             WHERE negocio IN ('Salmix B2B', 'Ruminantes', 'Ave/Sui')`
          ).run();
          etapas.push('Códigos de negócio atualizados');
        }
        
        // VENDAS: Sem processamento automático pesado (evita timeout)
        if (false) {
          // PROCEDIMENTO 2: Redistribuir vendedores antigos para novos códigos
          const alteracoes = [
            { vendedorAntigo: '000001', vendedorNovo: '1001', estados: null },
            { vendedorAntigo: '1', vendedorNovo: '1001', estados: null },
            { vendedorAntigo: '000033', vendedorNovo: '3633', estados: null },
            { vendedorAntigo: '33', vendedorNovo: '3633', estados: null },
            { vendedorAntigo: '000036', vendedorNovo: '3633', estados: null },
            { vendedorAntigo: '36', vendedorNovo: '3633', estados: null },
            { vendedorAntigo: '3633', vendedorNovo: '3601', estados: ['PR', 'SC', 'RS'] },
            { vendedorAntigo: '000036', vendedorNovo: '3601', estados: ['PR', 'SC', 'RS'] },
            { vendedorAntigo: '36', vendedorNovo: '3601', estados: ['PR', 'SC', 'RS'] },
            { vendedorAntigo: '3633', vendedorNovo: '3602', estados: ['SP', 'MG', 'RJ', 'ES'] },
            { vendedorAntigo: '000036', vendedorNovo: '3602', estados: ['SP', 'MG', 'RJ', 'ES'] },
            { vendedorAntigo: '36', vendedorNovo: '3602', estados: ['SP', 'MG', 'RJ', 'ES'] },
            { vendedorAntigo: '3633', vendedorNovo: '3603', estados: ['GO', 'DF', 'MT', 'MS'] },
            { vendedorAntigo: '000036', vendedorNovo: '3603', estados: ['GO', 'DF', 'MT', 'MS'] },
            { vendedorAntigo: '36', vendedorNovo: '3603', estados: ['GO', 'DF', 'MT', 'MS'] },
            { vendedorAntigo: '3633', vendedorNovo: '3604', estados: ['AC', 'AP', 'AM', 'PA', 'RO', 'RR', 'TO', 'AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE'] },
            { vendedorAntigo: '000036', vendedorNovo: '3604', estados: ['AC', 'AP', 'AM', 'PA', 'RO', 'RR', 'TO', 'AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE'] },
            { vendedorAntigo: '36', vendedorNovo: '3604', estados: ['AC', 'AP', 'AM', 'PA', 'RO', 'RR', 'TO', 'AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE'] },
            { vendedorAntigo: '000042', vendedorNovo: '4201', estados: ['PR', 'SC', 'RS'] },
            { vendedorAntigo: '42', vendedorNovo: '4201', estados: ['PR', 'SC', 'RS'] },
            { vendedorAntigo: '000042', vendedorNovo: '4222', estados: ['SP', 'MG', 'RJ', 'ES'] },
            { vendedorAntigo: '42', vendedorNovo: '4222', estados: ['SP', 'MG', 'RJ', 'ES'] },
            { vendedorAntigo: '000042', vendedorNovo: '4202', estados: ['GO', 'DF', 'MT', 'MS'] },
            { vendedorAntigo: '42', vendedorNovo: '4202', estados: ['GO', 'DF', 'MT', 'MS'] },
            { vendedorAntigo: '000042', vendedorNovo: '4203', estados: ['AC', 'AP', 'AM', 'PA', 'RO', 'RR', 'TO', 'AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE'] },
            { vendedorAntigo: '42', vendedorNovo: '4203', estados: ['AC', 'AP', 'AM', 'PA', 'RO', 'RR', 'TO', 'AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE'] },
            { vendedorAntigo: '000031', vendedorNovo: '4231', estados: null },
            { vendedorAntigo: '31', vendedorNovo: '4231', estados: null },
            { vendedorAntigo: '000022', vendedorNovo: '4222', estados: null },
            { vendedorAntigo: '22', vendedorNovo: '4222', estados: null },
            { vendedorAntigo: '000024', vendedorNovo: '4203', estados: null },
            { vendedorAntigo: '24', vendedorNovo: '4203', estados: null }
          ];

          for (const alteracao of alteracoes) {
            let query: string;
            let params: any[];

            if (alteracao.estados === null || alteracao.estados === undefined) {
              query = `UPDATE vendas SET representante = ? WHERE representante = ?`;
              params = [alteracao.vendedorNovo, alteracao.vendedorAntigo];
            } else {
              const placeholders = alteracao.estados!.map(() => '?').join(',');
              query = `UPDATE vendas SET representante = ? WHERE representante = ? AND regiao IN (${placeholders})`;
              params = [alteracao.vendedorNovo, alteracao.vendedorAntigo, ...alteracao.estados!];
            }

            await db.prepare(query).bind(...params).run();
          }
          etapas.push('Vendedores redistribuídos');
          
          // PROCEDIMENTO 3: Atualizar negócios nas vendas
          await db.prepare(
            `UPDATE vendas 
             SET negocio = (
               SELECT vend.id_negocio 
               FROM vendedores vend 
               WHERE vend.vendedor = vendas.representante
             )
             WHERE representante IS NOT NULL
             AND EXISTS (
               SELECT 1 FROM vendedores vend 
               WHERE vend.vendedor = vendas.representante 
               AND vend.id_negocio IS NOT NULL
             )`
          ).run();
          etapas.push('Negócios classificados');
          
          // PROCEDIMENTO 4: Correção Salmix (representante 1001)
          await db.prepare(
            `UPDATE vendas 
             SET negocio = '10'
             WHERE representante = '1001'
             AND negocio != '10'`
          ).run();
          etapas.push('Salmix B2B corrigido');
          
          // PROCEDIMENTO 5: Remover duplicatas entre 2024 e 2025
          const duplicatasResult = await db.prepare(
            `SELECT v2024.id
             FROM vendas v2024
             INNER JOIN vendas v2025 ON 
               v2024.codigo_produto = v2025.codigo_produto
               AND v2024.quantidade = v2025.quantidade
               AND v2024.valor_unitario = v2025.valor_unitario
               AND v2024.cliente = v2025.cliente
               AND v2024.representante = v2025.representante
             WHERE strftime('%Y', v2024.data_venda) = '2024'
               AND strftime('%Y', v2025.data_venda) = '2025'
             LIMIT 1000`
          ).all();
          
          const duplicatasIds = (duplicatasResult.results as any[]).map(d => d.id);
          if (duplicatasIds.length > 0) {
            const BATCH_SIZE = 200;
            for (let i = 0; i < duplicatasIds.length; i += BATCH_SIZE) {
              const batch = duplicatasIds.slice(i, i + BATCH_SIZE);
              const placeholders = batch.map(() => '?').join(',');
              await db.prepare(
                `DELETE FROM vendas WHERE id IN (${placeholders})`
              ).bind(...batch).run();
            }
            etapas.push(`${duplicatasIds.length} duplicatas removidas`);
          }
          
          // PROCEDIMENTO 6: Limpar nomes genéricos de produtos
          await db.prepare(
            `UPDATE produtos 
             SET nome_produto = (
               SELECT v.nome_produto 
               FROM vendas v 
               WHERE v.codigo_produto = produtos.codigo_produto 
               AND v.nome_produto NOT LIKE 'Produto %'
               AND v.nome_produto NOT LIKE '%Peosuto%'
               AND v.nome_produto NOT LIKE '%Terceiro%'
               AND LENGTH(v.nome_produto) > 3
               GROUP BY v.nome_produto
               ORDER BY COUNT(*) DESC
               LIMIT 1
             ),
             updated_at = CURRENT_TIMESTAMP
             WHERE (produtos.nome_produto LIKE 'Produto %' 
                    OR produtos.nome_produto LIKE '%Peosuto%'
                    OR produtos.nome_produto LIKE '%Terceiro%')
             AND EXISTS (
               SELECT 1 FROM vendas v 
               WHERE v.codigo_produto = produtos.codigo_produto 
               AND v.nome_produto NOT LIKE 'Produto %'
               AND v.nome_produto NOT LIKE '%Peosuto%'
               AND v.nome_produto NOT LIKE '%Terceiro%'
               AND LENGTH(v.nome_produto) > 3
             )`
          ).run();
          
          await db.prepare(
            `UPDATE vendas 
             SET nome_produto = (
               SELECT p.nome_produto 
               FROM produtos p 
               WHERE p.codigo_produto = vendas.codigo_produto
             ),
             updated_at = CURRENT_TIMESTAMP
             WHERE (vendas.nome_produto LIKE 'Produto %'
                    OR vendas.nome_produto LIKE '%Peosuto%'
                    OR vendas.nome_produto LIKE '%Terceiro%')
             AND EXISTS (
               SELECT 1 FROM produtos p 
               WHERE p.codigo_produto = vendas.codigo_produto
               AND p.nome_produto NOT LIKE 'Produto %'
               AND p.nome_produto NOT LIKE '%Peosuto%'
               AND p.nome_produto NOT LIKE '%Terceiro%'
             )`
          ).run();
          
          await db.prepare(
            `UPDATE previsao_vendas 
             SET nome_produto = (
               SELECT p.nome_produto 
               FROM produtos p 
               WHERE p.codigo_produto = previsao_vendas.codigo_produto
             ),
             updated_at = CURRENT_TIMESTAMP
             WHERE (previsao_vendas.nome_produto LIKE 'Produto %'
                    OR previsao_vendas.nome_produto LIKE '%Peosuto%'
                    OR previsao_vendas.nome_produto LIKE '%Terceiro%')
             AND EXISTS (
               SELECT 1 FROM produtos p 
               WHERE p.codigo_produto = previsao_vendas.codigo_produto
               AND p.nome_produto NOT LIKE 'Produto %'
               AND p.nome_produto NOT LIKE '%Peosuto%'
               AND p.nome_produto NOT LIKE '%Terceiro%'
             )`
          ).run();
          
          etapas.push('Nomes de produtos limpos');
          
          correcoesMensagem = ` Procedimentos aplicados: ${etapas.join(', ')}.`;
        }
        
        // PROCEDIMENTO 7: Correções para Budget
        if (type === 'budget') {
          await db.prepare(
            `UPDATE budget 
             SET negocio = (
               SELECT vend.id_negocio 
               FROM vendedores vend 
               WHERE vend.vendedor = budget.vendedor
             )
             WHERE vendedor IS NOT NULL
             AND EXISTS (
               SELECT 1 FROM vendedores vend 
               WHERE vend.vendedor = budget.vendedor 
               AND vend.id_negocio IS NOT NULL
             )`
          ).run();
          
          correcoesMensagem = ' Negócios do budget corrigidos automaticamente.';
        }
      } catch (error) {
        console.error('Erro ao aplicar correções automáticas:', error);
      }
    }

    return c.json({
      success: successCount > 0,
      message: successCount > 0 
        ? `Importação concluída. ${successCount} registros processados com sucesso.${correcoesMensagem}`
        : 'Nenhum registro foi importado',
      recordsProcessed: successCount,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined // Limitar a 10 erros
    });

  } catch (error) {
    return c.json({
      success: false,
      message: 'Erro interno do servidor',
      errors: [String(error)]
    }, 500);
  }
});

export default {
  fetch: app.fetch.bind(app)
};
