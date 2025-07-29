import { createClient } from '@supabase/supabase-js'
import { Pool } from 'pg'

interface DatabaseConfig {
  directUrl: string
  supabaseUrl: string
  supabaseAnonKey: string
  supabaseServiceRoleKey?: string
}

export class DatabaseConnectionManager {
  private config: DatabaseConfig
  private directConnection: Pool | null = null
  private supabaseClient: any = null
  private isUsingFallback = false

  constructor(config: DatabaseConfig) {
    this.config = config
  }

  async getConnection() {
    // Try direct connection first
    try {
      if (!this.directConnection) {
        await this.initDirectConnection()
      }
      
      // Test the direct connection
      const client = await this.directConnection!.connect()
      await client.query('SELECT 1')
      client.release()
      
      this.isUsingFallback = false
      return this.directConnection
    } catch (error) {
      console.warn('Direct database connection failed, falling back to Supabase:', error.message)
      return this.getFallbackConnection()
    }
  }

  private async initDirectConnection() {
    this.directConnection = new Pool({
      connectionString: this.config.directUrl,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    })
  }

  private async getFallbackConnection() {
    if (!this.supabaseClient) {
      this.supabaseClient = createClient(
        this.config.supabaseUrl,
        this.config.supabaseAnonKey,
        {
          auth: {
            persistSession: false,
          },
        }
      )
    }

    this.isUsingFallback = true
    return this.supabaseClient
  }

  async query(sql: string, params: any[] = []) {
    const connection = await this.getConnection()

    if (this.isUsingFallback) {
      // Use Supabase client for queries
      return this.executeSupabaseQuery(sql, params)
    } else {
      // Use direct PostgreSQL connection
      const client = await connection.connect()
      try {
        const result = await client.query(sql, params)
        return result
      } finally {
        client.release()
      }
    }
  }

  private async executeSupabaseQuery(sql: string, params: any[] = []) {
    // For Supabase, you'll need to adapt queries to use their REST API
    // This is a simplified example - you may need to implement specific query translation
    try {
      const { data, error } = await this.supabaseClient.rpc('execute_sql', {
        query: sql,
        parameters: params
      })

      if (error) throw error
      return { rows: data }
    } catch (error) {
      console.error('Supabase query failed:', error)
      throw error
    }
  }

  isUsingFallbackConnection() {
    return this.isUsingFallback
  }

  async close() {
    if (this.directConnection) {
      await this.directConnection.end()
    }
    // Supabase client doesn't need explicit closing
  }
}

// Factory function to create the connection manager
export function createDatabaseConnection(): DatabaseConnectionManager {
  const config: DatabaseConfig = {
    directUrl: process.env.DATABASE_URL!,
    supabaseUrl: process.env.SUPABASE_URL!,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY!,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  }

  return new DatabaseConnectionManager(config)
}