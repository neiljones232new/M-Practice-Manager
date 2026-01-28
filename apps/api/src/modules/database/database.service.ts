import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';
import {
  QueryResult,
  OperationResult,
  Client,
  TaxCalculationResult,
  GeneratedReport,
  PRACTICE_FIELDS
} from './interfaces/database.interface';

@Injectable()
export class DatabaseService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseService.name);
  private db: Database.Database;
  private readonly dbPath: string;

  constructor(private configService: ConfigService) {
    const storagePath = this.configService.get<string>('STORAGE_PATH') || './mdj-data';
    this.dbPath = path.join(storagePath, 'practice-manager.db');
  }

  async onModuleInit() {
    await this.initializeDatabase();
  }

  private async initializeDatabase() {
    try {
      // Ensure storage directory exists
      const storageDir = path.dirname(this.dbPath);
      if (!existsSync(storageDir)) {
        await fs.mkdir(storageDir, { recursive: true });
      }

      // Open SQLite database
      this.db = Database(this.dbPath);

      // Enable foreign keys and WAL mode for better performance
      this.db.exec('PRAGMA foreign_keys = ON');
      this.db.exec('PRAGMA journal_mode = WAL');
      this.db.exec('PRAGMA synchronous = NORMAL');
      this.db.exec('PRAGMA cache_size = 1000');
      this.db.exec('PRAGMA temp_store = MEMORY');

      // Create tables
      this.createTables();

      this.logger.log(`Database initialized at: ${this.dbPath}`);
    } catch (error) {
      this.logger.error('Failed to initialize database:', error);
      throw error;
    }
  }

  private createTables() {
    // Clients table (consolidating practice and CH data)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS clients (
        company_number TEXT PRIMARY KEY,
        company_name TEXT NOT NULL,
        trading_name TEXT,
        status TEXT,
        company_type TEXT,
        incorporation_date TEXT,
        registered_address TEXT,
        
        -- Practice fields
        corporation_tax_utr TEXT,
        vat_number TEXT,
        vat_registration_date TEXT,
        vat_scheme TEXT,
        paye_reference TEXT,
        paye_accounts_office_reference TEXT,
        authentication_code TEXT,
        accounts_office_reference TEXT,
        employee_count INTEGER,
        payroll_frequency TEXT,
        cis_registered BOOLEAN,
        cis_utr TEXT,
        main_contact_name TEXT,
        contact_position TEXT,
        telephone TEXT,
        mobile TEXT,
        email TEXT,
        preferred_contact_method TEXT,
        correspondence_address TEXT,
        client_manager TEXT,
        partner_responsible TEXT,
        engagement_type TEXT,
        onboarding_date TEXT,
        disengagement_date TEXT,
        engagement_letter_signed BOOLEAN,
        aml_completed BOOLEAN,
        fee_arrangement TEXT,
        monthly_fee REAL,
        annual_fee REAL,
        accounting_period_end TEXT,
        next_accounts_due_date TEXT,
        next_corporation_tax_due_date TEXT,
        vat_return_frequency TEXT,
        vat_quarter TEXT,
        payroll_rti_required BOOLEAN,
        business_bank_name TEXT,
        account_last_four TEXT,
        direct_debit_in_place BOOLEAN,
        payment_issues TEXT,
        notes TEXT,
        special_circumstances TEXT,
        seasonal_business BOOLEAN,
        dormant BOOLEAN,
        client_risk_rating TEXT,
        do_not_contact BOOLEAN,
        
        -- Personal client fields
        personal_utr TEXT,
        national_insurance_number TEXT,
        date_of_birth TEXT,
        personal_address TEXT,
        personal_tax_year TEXT,
        self_assessment_required BOOLEAN,
        self_assessment_filed BOOLEAN,
        linked_company_number TEXT,
        director_role TEXT,
        client_type TEXT,
        
        -- Companies House fields
        company_status_detail TEXT,
        jurisdiction TEXT,
        registered_office_full TEXT,
        sic_codes TEXT,
        sic_descriptions TEXT,
        accounts_overdue BOOLEAN,
        confirmation_statement_overdue BOOLEAN,
        next_accounts_made_up_to TEXT,
        next_accounts_due_by TEXT,
        last_accounts_made_up_to TEXT,
        next_confirmation_statement_date TEXT,
        confirmation_statement_due_by TEXT,
        last_confirmation_statement_date TEXT,
        director_count INTEGER,
        psc_count INTEGER,
        current_directors TEXT,
        current_pscs TEXT,
        last_ch_refresh TEXT,
        
        -- Metadata
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.ensureClientSchema();

    // Tax calculations table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tax_calculations (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        company_id TEXT,
        calculation_type TEXT NOT NULL,
        tax_year TEXT NOT NULL,
        parameters TEXT, -- JSON
        optimized_salary REAL,
        optimized_dividend REAL,
        total_take_home REAL,
        total_tax_liability REAL,
        estimated_savings REAL,
        recommendations TEXT, -- JSON
        calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        calculated_by TEXT,
        notes TEXT,
        FOREIGN KEY (client_id) REFERENCES clients(company_number)
      )
    `);

    // Tax scenarios table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tax_scenarios (
        id TEXT PRIMARY KEY,
        calculation_id TEXT NOT NULL,
        scenario_name TEXT,
        salary REAL,
        dividend REAL,
        income_tax REAL,
        employee_ni REAL,
        employer_ni REAL,
        dividend_tax REAL,
        corporation_tax REAL,
        total_tax REAL,
        take_home REAL,
        effective_rate REAL,
        FOREIGN KEY (calculation_id) REFERENCES tax_calculations(id)
      )
    `);

    // Generated reports table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS generated_reports (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        calculation_id TEXT,
        template_id TEXT,
        title TEXT NOT NULL,
        content TEXT, -- JSON
        format TEXT NOT NULL,
        file_path TEXT,
        generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        generated_by TEXT,
        FOREIGN KEY (client_id) REFERENCES clients(company_number),
        FOREIGN KEY (calculation_id) REFERENCES tax_calculations(id)
      )
    `);

    // Directors table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS directors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_number TEXT NOT NULL,
        name TEXT,
        officer_role TEXT,
        appointed_on TEXT,
        resigned_on TEXT,
        nationality TEXT,
        country_of_residence TEXT,
        person_number TEXT,
        FOREIGN KEY (company_number) REFERENCES clients(company_number)
      )
    `);

    // PSCs table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS psc (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_number TEXT NOT NULL,
        name TEXT,
        kind TEXT,
        nature_of_control TEXT,
        notified_on TEXT,
        ceased_on TEXT,
        country_of_residence TEXT,
        FOREIGN KEY (company_number) REFERENCES clients(company_number)
      )
    `);

    // Create indexes for better performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_clients_company_name ON clients(company_name);
      CREATE INDEX IF NOT EXISTS idx_clients_client_manager ON clients(client_manager);
      CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
      CREATE INDEX IF NOT EXISTS idx_tax_calculations_client_id ON tax_calculations(client_id);
      CREATE INDEX IF NOT EXISTS idx_tax_calculations_calculated_at ON tax_calculations(calculated_at);
      CREATE INDEX IF NOT EXISTS idx_tax_scenarios_calculation_id ON tax_scenarios(calculation_id);
      CREATE INDEX IF NOT EXISTS idx_reports_client_id ON generated_reports(client_id);
      CREATE INDEX IF NOT EXISTS idx_directors_company_number ON directors(company_number);
      CREATE INDEX IF NOT EXISTS idx_psc_company_number ON psc(company_number);
    `);

    this.logger.log('Database tables created successfully');
  }

  private ensureClientSchema() {
    const columns = this.db.prepare("PRAGMA table_info('clients')").all() as Array<{ name: string }>;
    const existing = new Set(columns.map((col) => col.name));

    const desired: Array<{ name: string; type: string }> = [
      { name: 'lifecycle_status', type: 'TEXT' },
      { name: 'onboarding_started_at', type: 'TEXT' },
      { name: 'went_live_at', type: 'TEXT' },
      { name: 'ceased_at', type: 'TEXT' },
      { name: 'dormant_since', type: 'TEXT' },
      { name: 'statutory_year_end', type: 'TEXT' },
      { name: 'vat_period_start', type: 'TEXT' },
      { name: 'vat_period_end', type: 'TEXT' },
      { name: 'vat_stagger', type: 'TEXT' },
      { name: 'payroll_pay_day', type: 'INTEGER' },
      { name: 'payroll_period_end_day', type: 'INTEGER' },
    ];

    for (const column of desired) {
      if (!existing.has(column.name)) {
        this.db.exec(`ALTER TABLE clients ADD COLUMN ${column.name} ${column.type}`);
      }
    }
  }

  async executeQuery<T = any>(query: string, params: any[] = []): Promise<QueryResult<T>> {
    try {
      if (query.trim().toUpperCase().startsWith('SELECT')) {
        const stmt = this.db.prepare(query);
        const rows = stmt.all(params);
        return {
          success: true,
          data: rows as T[],
          rowCount: rows.length
        };
      } else {
        const stmt = this.db.prepare(query);
        const result = stmt.run(params);
        return {
          success: true,
          rowCount: result.changes || 0
        };
      }
    } catch (error) {
      this.logger.error(`Database query failed: ${error.message}`, error);
      return {
        success: false,
        error: this.formatError(error),
        rowCount: 0
      };
    }
  }

  private formatError(error: any): string {
    const errorStr = error.message?.toLowerCase() || '';
    
    if (errorStr.includes('no such file') || errorStr.includes('not found')) {
      return 'Database not found. Please contact your administrator.';
    } else if (errorStr.includes('locked')) {
      return 'Database is currently busy. Please try again.';
    } else if (errorStr.includes('constraint')) {
      return 'Data validation error. Please check your input.';
    } else if (errorStr.includes('unique')) {
      return 'A record with this identifier already exists.';
    } else {
      return 'A database error occurred. Please try again.';
    }
  }

  // Client operations
  async getClientByNumber(companyNumber: string): Promise<Client | null> {
    const result = await this.executeQuery<Client>(
      'SELECT * FROM clients WHERE company_number = ?',
      [companyNumber]
    );
    
    if (result.success && result.data && result.data.length > 0) {
      return this.transformClientFromDb(result.data[0]);
    }
    return null;
  }

  async searchClientsByName(name: string, limit: number = 50): Promise<Client[]> {
    const searchTerm = `%${name}%`;
    const result = await this.executeQuery<Client>(
      `SELECT * FROM clients 
       WHERE LOWER(company_name) LIKE LOWER(?) 
          OR LOWER(trading_name) LIKE LOWER(?)
       ORDER BY company_name
       LIMIT ?`,
      [searchTerm, searchTerm, limit]
    );
    
    if (result.success && result.data) {
      return result.data.map(client => this.transformClientFromDb(client));
    }
    return [];
  }

  async addClient(clientData: Partial<Client>): Promise<OperationResult> {
    const companyNumber = clientData.companyNumber;
    if (!companyNumber || (typeof companyNumber === 'string' && !companyNumber.trim())) {
      return { success: false, message: 'Company number is required' };
    }

    // Check if client already exists
    const existing = await this.getClientByNumber(companyNumber);
    if (existing) {
      return { success: false, message: `Client ${companyNumber} already exists` };
    }

    if (!clientData.lifecycleStatus) {
      clientData.lifecycleStatus = 'ACTIVE';
    }

    // Transform client data to database format
    const dbData = this.transformClientToDb(clientData);
    
    // Build INSERT query dynamically
    const fields = Object.keys(dbData);
    const placeholders = fields.map(() => '?').join(', ');
    const fieldNames = fields.join(', ');
    const values = Object.values(dbData);

    const query = `INSERT INTO clients (${fieldNames}) VALUES (${placeholders})`;
    const result = await this.executeQuery(query, values);

    if (result.success) {
      return { success: true, message: 'Client added successfully', id: companyNumber };
    } else {
      return { success: false, message: result.error || 'Failed to add client' };
    }
  }

  async updateClient(companyNumber: string, updates: Partial<Client>): Promise<OperationResult> {
    if (!updates || Object.keys(updates).length === 0) {
      return { success: false, message: 'No updates provided' };
    }

    // Filter to only allow practice fields for safety
    const safeUpdates: any = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined) continue;
      const dbKey = this.camelToSnake(key);
      if (PRACTICE_FIELDS.includes(key)) {
        safeUpdates[dbKey] = value;
      }
    }

    if (Object.keys(safeUpdates).length === 0) {
      return { success: false, message: 'No valid practice fields to update' };
    }

    // Add updated timestamp
    safeUpdates.updated_at = new Date().toISOString();

    // Build UPDATE query
    const setClause = Object.keys(safeUpdates).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(safeUpdates), companyNumber];

    const query = `UPDATE clients SET ${setClause} WHERE company_number = ?`;
    const result = await this.executeQuery(query, values);

    if (result.success) {
      if (result.rowCount > 0) {
        return { success: true, message: 'Client updated successfully' };
      } else {
        return { success: false, message: 'Client not found' };
      }
    } else {
      return { success: false, message: result.error || 'Failed to update client' };
    }
  }

  async getClientList(filters: any = {}, fields?: string[]): Promise<Client[]> {
    // Default display fields for performance
    const defaultFields = [
      'company_number', 'company_name', 'trading_name', 'status',
      'client_type', 'client_manager', 'corporation_tax_utr',
      'vat_number', 'telephone', 'email'
    ];

    const selectFields = fields ? fields.map(f => this.camelToSnake(f)) : defaultFields;
    const fieldList = selectFields.join(', ');
    
    const whereClauses: string[] = [];
    const params: any[] = [];

    if (filters.status) {
      whereClauses.push('status = ?');
      params.push(filters.status);
    }

    if (filters.clientType) {
      whereClauses.push('client_type = ?');
      params.push(filters.clientType);
    }

    if (filters.clientManager) {
      whereClauses.push('client_manager = ?');
      params.push(filters.clientManager);
    }

    if (filters.accountsOverdue) {
      whereClauses.push('accounts_overdue = ?');
      params.push(filters.accountsOverdue);
    }

    const whereClause = whereClauses.length > 0 ? whereClauses.join(' AND ') : '1=1';

    const query = `
      SELECT ${fieldList}
      FROM clients
      WHERE ${whereClause}
      ORDER BY company_name
    `;

    const result = await this.executeQuery<Client>(query, params);
    
    if (result.success && result.data) {
      return result.data.map(client => this.transformClientFromDb(client));
    }
    return [];
  }

  // Tax calculation operations
  async storeCalculation(calculation: TaxCalculationResult): Promise<OperationResult> {
    try {
      this.db.exec('BEGIN TRANSACTION');

      // Store main calculation
      const calcStmt = this.db.prepare(`
        INSERT OR REPLACE INTO tax_calculations 
        (id, client_id, company_id, calculation_type, tax_year, parameters,
         optimized_salary, optimized_dividend, total_take_home, total_tax_liability,
         estimated_savings, recommendations, calculated_by, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      calcStmt.run([
        calculation.id, calculation.clientId, calculation.companyId, calculation.calculationType,
        calculation.taxYear, JSON.stringify(calculation.parameters || {}),
        calculation.optimizedSalary || 0, calculation.optimizedDividend || 0, calculation.totalTakeHome || 0,
        calculation.totalTaxLiability || 0, calculation.estimatedSavings || 0,
        JSON.stringify(calculation.recommendations || []), calculation.calculatedBy, calculation.notes
      ]);

      // Store scenarios if provided
      if (calculation.scenarios && calculation.scenarios.length > 0) {
        // First, delete existing scenarios for this calculation
        const deleteStmt = this.db.prepare('DELETE FROM tax_scenarios WHERE calculation_id = ?');
        deleteStmt.run([calculation.id]);

        // Insert new scenarios
        const scenarioStmt = this.db.prepare(`
          INSERT INTO tax_scenarios 
          (id, calculation_id, scenario_name, salary, dividend, income_tax,
           employee_ni, employer_ni, dividend_tax, corporation_tax, total_tax,
           take_home, effective_rate)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const scenario of calculation.scenarios) {
          const scenarioId = scenario.id || `${calculation.id}_${scenario.salary}_${scenario.dividend}`;
          scenarioStmt.run([
            scenarioId, calculation.id, scenario.name || `Salary £${scenario.salary}`,
            scenario.salary, scenario.dividend, scenario.incomeTax,
            scenario.employeeNI, scenario.employerNI, scenario.dividendTax,
            scenario.corporationTax, scenario.totalTax, scenario.takeHome,
            scenario.effectiveRate
          ]);
        }
      }

      this.db.exec('COMMIT');
      return { success: true, message: 'Tax calculation stored successfully', id: calculation.id };
    } catch (error) {
      this.db.exec('ROLLBACK');
      this.logger.error('Failed to store tax calculation:', error);
      return { success: false, message: this.formatError(error) };
    }
  }

  async getCalculationById(id: string): Promise<TaxCalculationResult | null> {
    const result = await this.executeQuery<any>(
      'SELECT * FROM tax_calculations WHERE id = ?',
      [id]
    );

    if (result.success && result.data && result.data.length > 0) {
      const calculation = this.transformCalculationFromDb(result.data[0]);
      
      // Get scenarios
      const scenariosResult = await this.executeQuery<any>(
        'SELECT * FROM tax_scenarios WHERE calculation_id = ? ORDER BY take_home DESC',
        [id]
      );

      if (scenariosResult.success && scenariosResult.data) {
        calculation.scenarios = scenariosResult.data.map(this.transformScenarioFromDb);
      }

      return calculation;
    }
    return null;
  }

  async getClientCalculations(clientId: string, limit: number = 10): Promise<TaxCalculationResult[]> {
    const result = await this.executeQuery<any>(
      `SELECT * FROM tax_calculations 
       WHERE client_id = ? 
       ORDER BY calculated_at DESC 
       LIMIT ?`,
      [clientId, limit]
    );

    if (result.success && result.data) {
      const calculations = await Promise.all(
        result.data.map(async (calc) => {
          const calculation = this.transformCalculationFromDb(calc);
          
          // Get scenarios for each calculation
          const scenariosResult = await this.executeQuery<any>(
            'SELECT * FROM tax_scenarios WHERE calculation_id = ? ORDER BY take_home DESC',
            [calc.id]
          );

          if (scenariosResult.success && scenariosResult.data) {
            calculation.scenarios = scenariosResult.data.map(this.transformScenarioFromDb);
          }

          return calculation;
        })
      );
      return calculations;
    }
    return [];
  }

  async getCalculationHistory(
    clientId?: string, 
    taxYear?: string, 
    calculationType?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ calculations: TaxCalculationResult[], total: number }> {
    const whereClauses: string[] = [];
    const params: any[] = [];

    if (clientId) {
      whereClauses.push('client_id = ?');
      params.push(clientId);
    }

    if (taxYear) {
      whereClauses.push('tax_year = ?');
      params.push(taxYear);
    }

    if (calculationType) {
      whereClauses.push('calculation_type = ?');
      params.push(calculationType);
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Get total count
    const countResult = await this.executeQuery<{ count: number }>(
      `SELECT COUNT(*) as count FROM tax_calculations ${whereClause}`,
      params
    );

    const total = countResult.success && countResult.data ? countResult.data[0].count : 0;

    // Get calculations with pagination
    const result = await this.executeQuery<any>(
      `SELECT * FROM tax_calculations 
       ${whereClause}
       ORDER BY calculated_at DESC 
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    if (result.success && result.data) {
      const calculations = await Promise.all(
        result.data.map(async (calc) => {
          const calculation = this.transformCalculationFromDb(calc);
          
          // Get scenarios for each calculation
          const scenariosResult = await this.executeQuery<any>(
            'SELECT * FROM tax_scenarios WHERE calculation_id = ? ORDER BY take_home DESC',
            [calc.id]
          );

          if (scenariosResult.success && scenariosResult.data) {
            calculation.scenarios = scenariosResult.data.map(this.transformScenarioFromDb);
          }

          return calculation;
        })
      );
      return { calculations, total };
    }

    return { calculations: [], total };
  }

  async getTaxCalculationStats(clientId?: string): Promise<{
    totalCalculations: number;
    calculationsByType: Record<string, number>;
    calculationsByTaxYear: Record<string, number>;
    averageSavings: number;
    latestCalculation?: TaxCalculationResult;
  }> {
    const whereClause = clientId ? 'WHERE client_id = ?' : '';
    const params = clientId ? [clientId] : [];

    // Get total calculations
    const totalResult = await this.executeQuery<{ count: number }>(
      `SELECT COUNT(*) as count FROM tax_calculations ${whereClause}`,
      params
    );

    const totalCalculations = totalResult.success && totalResult.data ? totalResult.data[0].count : 0;

    // Get calculations by type
    const typeResult = await this.executeQuery<{ calculation_type: string, count: number }>(
      `SELECT calculation_type, COUNT(*) as count 
       FROM tax_calculations ${whereClause}
       GROUP BY calculation_type`,
      params
    );

    const calculationsByType: Record<string, number> = {};
    if (typeResult.success && typeResult.data) {
      typeResult.data.forEach(row => {
        calculationsByType[row.calculation_type] = row.count;
      });
    }

    // Get calculations by tax year
    const yearResult = await this.executeQuery<{ tax_year: string, count: number }>(
      `SELECT tax_year, COUNT(*) as count 
       FROM tax_calculations ${whereClause}
       GROUP BY tax_year`,
      params
    );

    const calculationsByTaxYear: Record<string, number> = {};
    if (yearResult.success && yearResult.data) {
      yearResult.data.forEach(row => {
        calculationsByTaxYear[row.tax_year] = row.count;
      });
    }

    // Get average savings
    const savingsResult = await this.executeQuery<{ avg_savings: number }>(
      `SELECT AVG(estimated_savings) as avg_savings 
       FROM tax_calculations 
       ${whereClause} AND estimated_savings > 0`,
      params
    );

    const averageSavings = savingsResult.success && savingsResult.data ? 
      (savingsResult.data[0].avg_savings || 0) : 0;

    // Get latest calculation
    let latestCalculation: TaxCalculationResult | undefined;
    if (totalCalculations > 0) {
      const latestResult = await this.executeQuery<any>(
        `SELECT * FROM tax_calculations 
         ${whereClause}
         ORDER BY calculated_at DESC 
         LIMIT 1`,
        params
      );

      if (latestResult.success && latestResult.data && latestResult.data.length > 0) {
        latestCalculation = this.transformCalculationFromDb(latestResult.data[0]);
      }
    }

    return {
      totalCalculations,
      calculationsByType,
      calculationsByTaxYear,
      averageSavings,
      latestCalculation,
    };
  }

  async deleteCalculation(id: string): Promise<OperationResult> {
    try {
      this.db.exec('BEGIN TRANSACTION');

      // Delete scenarios first (foreign key constraint)
      const deleteScenarios = this.db.prepare('DELETE FROM tax_scenarios WHERE calculation_id = ?');
      deleteScenarios.run([id]);

      // Delete calculation
      const deleteCalc = this.db.prepare('DELETE FROM tax_calculations WHERE id = ?');
      const result = deleteCalc.run([id]);

      this.db.exec('COMMIT');

      if (result.changes > 0) {
        return { success: true, message: 'Tax calculation deleted successfully' };
      } else {
        return { success: false, message: 'Tax calculation not found' };
      }
    } catch (error) {
      this.db.exec('ROLLBACK');
      this.logger.error('Failed to delete tax calculation:', error);
      return { success: false, message: this.formatError(error) };
    }
  }

  // Report operations
  async storeReport(report: GeneratedReport): Promise<OperationResult> {
    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO generated_reports 
        (id, client_id, calculation_id, template_id, title, content, format, file_path, generated_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run([
        report.id, report.clientId, report.calculationId, report.templateId,
        report.title, JSON.stringify(report.content), report.format,
        report.filePath, report.generatedBy
      ]);

      return { success: true, message: 'Report stored successfully', id: report.id };
    } catch (error) {
      this.logger.error('Failed to store report:', error);
      return { success: false, message: this.formatError(error) };
    }
  }

  async getClientReports(clientId: string, limit: number = 10): Promise<GeneratedReport[]> {
    const result = await this.executeQuery<any>(
      `SELECT * FROM generated_reports 
       WHERE client_id = ? 
       ORDER BY generated_at DESC 
       LIMIT ?`,
      [clientId, limit]
    );

    if (result.success && result.data) {
      return result.data.map(this.transformReportFromDb);
    }
    return [];
  }

  async getReportById(id: string): Promise<GeneratedReport | null> {
    const result = await this.executeQuery<any>(
      'SELECT * FROM generated_reports WHERE id = ?',
      [id]
    );

    if (result.success && result.data && result.data.length > 0) {
      return this.transformReportFromDb(result.data[0]);
    }
    return null;
  }

  private transformReportFromDb(dbReport: any): GeneratedReport {
    return {
      id: dbReport.id,
      clientId: dbReport.client_id,
      calculationId: dbReport.calculation_id,
      templateId: dbReport.template_id,
      title: dbReport.title,
      content: JSON.parse(dbReport.content || '{}'),
      format: dbReport.format,
      filePath: dbReport.file_path,
      generatedAt: new Date(dbReport.generated_at),
      generatedBy: dbReport.generated_by,
    };
  }

  // Utility methods for data transformation
  private transformClientFromDb(dbClient: any): Client {
    const client: any = {};
    
    // Transform snake_case to camelCase
    for (const [key, value] of Object.entries(dbClient)) {
      const camelKey = this.snakeToCamel(key);
      client[camelKey] = value;
    }

    // Transform dates
    if (client.createdAt) client.createdAt = new Date(client.createdAt);
    if (client.updatedAt) client.updatedAt = new Date(client.updatedAt);

    return client as Client;
  }

  private transformClientToDb(client: Partial<Client>): any {
    const dbClient: any = {};
    
    // Transform camelCase to snake_case
    for (const [key, value] of Object.entries(client)) {
      if (value !== undefined) {
        const snakeKey = this.camelToSnake(key);
        dbClient[snakeKey] = value;
      }
    }

    return dbClient;
  }

  private transformCalculationFromDb(dbCalc: any): TaxCalculationResult {
    return {
      id: dbCalc.id,
      clientId: dbCalc.client_id,
      companyId: dbCalc.company_id,
      calculationType: dbCalc.calculation_type,
      taxYear: dbCalc.tax_year,
      parameters: JSON.parse(dbCalc.parameters || '{}'),
      optimizedSalary: dbCalc.optimized_salary,
      optimizedDividend: dbCalc.optimized_dividend,
      totalTakeHome: dbCalc.total_take_home,
      totalTaxLiability: dbCalc.total_tax_liability,
      estimatedSavings: dbCalc.estimated_savings,
      recommendations: JSON.parse(dbCalc.recommendations || '[]'),
      calculatedAt: new Date(dbCalc.calculated_at),
      calculatedBy: dbCalc.calculated_by,
      notes: dbCalc.notes,
      scenarios: [] // Will be populated separately
    };
  }

  private transformScenarioFromDb(dbScenario: any): any {
    return {
      id: dbScenario.id,
      name: dbScenario.scenario_name,
      salary: dbScenario.salary,
      dividend: dbScenario.dividend,
      incomeTax: dbScenario.income_tax,
      employeeNI: dbScenario.employee_ni,
      employerNI: dbScenario.employer_ni,
      dividendTax: dbScenario.dividend_tax,
      corporationTax: dbScenario.corporation_tax,
      totalTax: dbScenario.total_tax,
      takeHome: dbScenario.take_home,
      effectiveRate: dbScenario.effective_rate,
      netCost: dbScenario.salary + dbScenario.employer_ni + dbScenario.corporation_tax,
    };
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  private snakeToCamel(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  async testConnection(): Promise<OperationResult> {
    try {
      const result = await this.executeQuery('SELECT COUNT(*) as count FROM clients');
      if (result.success) {
        const count = result.data?.[0]?.count || 0;
        return { success: true, message: `Database connection successful. Found ${count} clients.` };
      } else {
        return { success: false, message: result.error || 'Database connection failed' };
      }
    } catch (error) {
      return { success: false, message: `Database connection failed: ${error.message}` };
    }
  }

  // Tax recommendation operations
  async storeRecommendations(calculationId: string, recommendations: any[]): Promise<OperationResult> {
    try {
      // For now, we'll store recommendations as JSON in the tax_calculations table
      // In a more complex system, we might create a separate recommendations table
      const stmt = this.db.prepare('UPDATE tax_calculations SET recommendations = ? WHERE id = ?');
      stmt.run([JSON.stringify(recommendations), calculationId]);

      return { success: true, message: 'Recommendations stored successfully' };
    } catch (error) {
      this.logger.error('Failed to store recommendations:', error);
      return { success: false, message: this.formatError(error) };
    }
  }

  async getRecommendations(calculationId: string): Promise<any[]> {
    try {
      const result = await this.executeQuery<any>(
        'SELECT recommendations FROM tax_calculations WHERE id = ?',
        [calculationId]
      );

      if (result.success && result.data && result.data.length > 0) {
        const recommendationsJson = result.data[0].recommendations;
        return recommendationsJson ? JSON.parse(recommendationsJson) : [];
      }
      return [];
    } catch (error) {
      this.logger.error('Failed to get recommendations:', error);
      return [];
    }
  }

  async getClientRecommendations(
    clientId: string,
    options: {
      priority?: 'HIGH' | 'MEDIUM' | 'LOW';
      type?: string;
      implemented?: boolean;
      limit?: number;
    } = {}
  ): Promise<any[]> {
    try {
      const limit = options.limit || 50;
      
      // Get all calculations for the client with recommendations
      const result = await this.executeQuery<any>(
        `SELECT id, recommendations FROM tax_calculations 
         WHERE client_id = ? AND recommendations IS NOT NULL AND recommendations != '[]'
         ORDER BY calculated_at DESC 
         LIMIT ?`,
        [clientId, limit]
      );

      if (result.success && result.data) {
        const allRecommendations: any[] = [];
        
        for (const calc of result.data) {
          if (calc.recommendations) {
            const recommendations = JSON.parse(calc.recommendations);
            
            // Filter recommendations based on options
            const filteredRecommendations = recommendations.filter((rec: any) => {
              if (options.priority && rec.priority !== options.priority) return false;
              if (options.type && rec.type !== options.type) return false;
              if (options.implemented !== undefined && rec.implemented !== options.implemented) return false;
              return true;
            });

            // Add calculation ID to each recommendation for reference
            filteredRecommendations.forEach((rec: any) => {
              rec.calculationId = calc.id;
            });

            allRecommendations.push(...filteredRecommendations);
          }
        }

        // Sort by priority and potential savings
        allRecommendations.sort((a, b) => {
          const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
          const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
          if (priorityDiff !== 0) return priorityDiff;
          
          return (b.potentialSaving || 0) - (a.potentialSaving || 0);
        });

        return allRecommendations.slice(0, limit);
      }
      return [];
    } catch (error) {
      this.logger.error('Failed to get client recommendations:', error);
      return [];
    }
  }

  // Transaction support
  async beginTransaction(): Promise<void> {
    this.db.exec('BEGIN TRANSACTION');
  }

  async commitTransaction(): Promise<void> {
    this.db.exec('COMMIT');
  }

  async rollbackTransaction(): Promise<void> {
    this.db.exec('ROLLBACK');
  }

  // Get database instance for advanced operations
  getDatabase(): Database.Database {
    return this.db;
  }
}
