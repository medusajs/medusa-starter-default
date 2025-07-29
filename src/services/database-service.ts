import { MedusaService } from '@medusajs/framework/utils'
import { createDatabaseConnection } from '../utils/database-connection'

export default class DatabaseService extends MedusaService({}) {
  private connectionManager = createDatabaseConnection()

  async query(sql: string, params: any[] = []) {
    try {
      const result = await this.connectionManager.query(sql, params)
      
      if (this.connectionManager.isUsingFallbackConnection()) {
        console.log('Query executed via Supabase fallback connection')
      } else {
        console.log('Query executed via direct database connection')
      }
      
      return result
    } catch (error) {
      console.error('Database query failed:', error)
      throw error
    }
  }

  async testConnection() {
    try {
      const connection = await this.connectionManager.getConnection()
      
      if (this.connectionManager.isUsingFallbackConnection()) {
        console.log('✅ Connected to database via Supabase fallback')
        return { status: 'connected', method: 'supabase' }
      } else {
        console.log('✅ Connected to database directly')
        return { status: 'connected', method: 'direct' }
      }
    } catch (error) {
      console.error('❌ Database connection failed:', error)
      return { status: 'failed', error: error.message }
    }
  }
}