/**
 * 简化存储方案 - 使用Vercel KV (Redis)替代Postgres
 * 完全无需人工配置数据库，Vercel会自动创建KV存储
 */

import { kv } from '@vercel/kv';

export interface Company {
  id: string;
  symbol: string;
  name: string;
  category: 'ai_application' | 'ai_supply_chain';
  createdAt: string;
}

export interface FinancialReport {
  id: string;
  companyId: string;
  reportPeriod: string;
  fiscalYear: number;
  fiscalQuarter?: number;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface AnalysisResult {
  id: string;
  reportId: string;
  analysisType: string;
  resultData: any;
  createdAt: string;
}

// 初始化预定义公司
const PREDEFINED_COMPANIES: Omit<Company, 'id' | 'createdAt'>[] = [
  // AI应用类
  { symbol: 'META', name: 'Meta Platforms', category: 'ai_application' },
  { symbol: 'GOOGL', name: 'Alphabet (Google)', category: 'ai_application' },
  { symbol: 'MSFT', name: 'Microsoft', category: 'ai_application' },
  { symbol: 'AMZN', name: 'Amazon', category: 'ai_application' },
  { symbol: 'AAPL', name: 'Apple', category: 'ai_application' },
  { symbol: 'TSLA', name: 'Tesla', category: 'ai_application' },
  { symbol: 'NFLX', name: 'Netflix', category: 'ai_application' },
  { symbol: 'UBER', name: 'Uber', category: 'ai_application' },
  { symbol: 'SNOW', name: 'Snowflake', category: 'ai_application' },
  { symbol: 'CRM', name: 'Salesforce', category: 'ai_application' },
  
  // AI供应链类
  { symbol: 'NVDA', name: 'Nvidia', category: 'ai_supply_chain' },
  { symbol: 'AMD', name: 'AMD', category: 'ai_supply_chain' },
  { symbol: 'AVGO', name: 'Broadcom', category: 'ai_supply_chain' },
  { symbol: 'TSM', name: 'TSMC', category: 'ai_supply_chain' },
  { symbol: '005930.KS', name: 'SK Hynix', category: 'ai_supply_chain' },
  { symbol: 'MU', name: 'Micron', category: 'ai_supply_chain' },
  { symbol: '005930', name: 'Samsung Electronics', category: 'ai_supply_chain' },
  { symbol: 'INTC', name: 'Intel', category: 'ai_supply_chain' },
  { symbol: 'VRT', name: 'Vertiv', category: 'ai_supply_chain' },
  { symbol: 'ETN', name: 'Eaton', category: 'ai_supply_chain' },
  { symbol: 'GEV', name: 'GE Vernova', category: 'ai_supply_chain' },
  { symbol: 'VST', name: 'Vistra', category: 'ai_supply_chain' },
  { symbol: 'ASML', name: 'ASML', category: 'ai_supply_chain' },
  { symbol: 'SNPS', name: 'Synopsys', category: 'ai_supply_chain' },
];

// 自动初始化
export async function initializeStorage() {
  try {
    const initialized = await kv.get('storage:initialized');
    if (!initialized) {
      console.log('初始化存储...');
      
      // 创建预定义公司
      for (const company of PREDEFINED_COMPANIES) {
        const id = `company:${company.symbol}`;
        await kv.set(id, {
          id,
          ...company,
          createdAt: new Date().toISOString(),
        });
      }
      
      // 创建公司索引
      const companyIds = PREDEFINED_COMPANIES.map(c => `company:${c.symbol}`);
      await kv.set('companies:all', companyIds);
      
      await kv.set('storage:initialized', true);
      console.log('存储初始化完成！');
    }
  } catch (error) {
    console.error('存储初始化失败:', error);
  }
}

// 公司操作
export async function getCompanies(): Promise<Company[]> {
  try {
    const companyIds = await kv.get<string[]>('companies:all') || [];
    const companies = await Promise.all(
      companyIds.map(id => kv.get<Company>(id))
    );
    return companies.filter(Boolean) as Company[];
  } catch (error) {
    console.error('获取公司列表失败:', error);
    return [];
  }
}

export async function getCompanyBySymbol(symbol: string): Promise<Company | null> {
  try {
    return await kv.get<Company>(`company:${symbol}`);
  } catch (error) {
    console.error('获取公司失败:', error);
    return null;
  }
}

// 财报操作
export async function createReport(report: Omit<FinancialReport, 'id' | 'uploadedAt'>): Promise<FinancialReport> {
  const id = `report:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
  const newReport: FinancialReport = {
    id,
    ...report,
    uploadedAt: new Date().toISOString(),
  };
  
  await kv.set(id, newReport);
  
  // 添加到报告索引
  const reportIds = await kv.get<string[]>('reports:all') || [];
  reportIds.push(id);
  await kv.set('reports:all', reportIds);
  
  // 添加到公司报告索引
  const companyReports = await kv.get<string[]>(`reports:company:${report.companyId}`) || [];
  companyReports.push(id);
  await kv.set(`reports:company:${report.companyId}`, companyReports);
  
  return newReport;
}

export async function getReports(limit = 50): Promise<FinancialReport[]> {
  try {
    const reportIds = await kv.get<string[]>('reports:all') || [];
    const recentIds = reportIds.slice(-limit).reverse();
    const reports = await Promise.all(
      recentIds.map(id => kv.get<FinancialReport>(id))
    );
    return reports.filter(Boolean) as FinancialReport[];
  } catch (error) {
    console.error('获取报告列表失败:', error);
    return [];
  }
}

export async function getReportById(id: string): Promise<FinancialReport | null> {
  try {
    return await kv.get<FinancialReport>(id);
  } catch (error) {
    console.error('获取报告失败:', error);
    return null;
  }
}

export async function updateReportStatus(id: string, status: FinancialReport['status']): Promise<void> {
  const report = await getReportById(id);
  if (report) {
    report.status = status;
    await kv.set(id, report);
  }
}

// 分析结果操作
export async function saveAnalysis(analysis: Omit<AnalysisResult, 'id' | 'createdAt'>): Promise<AnalysisResult> {
  const id = `analysis:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
  const newAnalysis: AnalysisResult = {
    id,
    ...analysis,
    createdAt: new Date().toISOString(),
  };
  
  await kv.set(id, newAnalysis);
  await kv.set(`analysis:report:${analysis.reportId}`, id);
  
  return newAnalysis;
}

export async function getAnalysisByReportId(reportId: string): Promise<AnalysisResult | null> {
  try {
    const analysisId = await kv.get<string>(`analysis:report:${reportId}`);
    if (!analysisId) return null;
    return await kv.get<AnalysisResult>(analysisId);
  } catch (error) {
    console.error('获取分析结果失败:', error);
    return null;
  }
}
