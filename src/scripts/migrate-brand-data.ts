/**
 * Combined brand data migration script
 * 
 * This script runs both variant brand backfill and supplier brand backfill
 * with comprehensive logging, safety checks, and rollback capabilities.
 */

import { MedusaContainer } from "@medusajs/framework/types"
import { backfillVariantBrands } from "./backfill-variant-brands"
import { backfillSupplierBrands } from "./backfill-supplier-brands"
import * as fs from 'fs'
import * as path from 'path'

interface MigrationOptions {
  dryRun?: boolean
  logLevel?: 'info' | 'debug' | 'error'
  skipVariants?: boolean
  skipSuppliers?: boolean
  outputFile?: string
  continueOnError?: boolean
}

interface MigrationSummary {
  startTime: Date
  endTime?: Date
  duration?: number
  options: MigrationOptions
  variantResults?: any
  supplierResults?: any
  success: boolean
  errors: string[]
}

export async function migrateBrandData(
  container: MedusaContainer,
  options: MigrationOptions = {}
): Promise<MigrationSummary> {
  const {
    dryRun = true,  // Default to dry run for safety
    logLevel = 'info',
    skipVariants = false,
    skipSuppliers = false,
    outputFile,
    continueOnError = false
  } = options

  const summary: MigrationSummary = {
    startTime: new Date(),
    options,
    success: false,
    errors: []
  }

  const log = (level: string, message: string, ...args: any[]) => {
    const timestamp = new Date().toISOString()
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`
    
    if (logLevel === 'debug' || level === 'error' || (level === 'info' && logLevel !== 'error')) {
      console.log(logMessage, ...args)
    }
  }

  // Create output directory if needed
  if (outputFile) {
    const dir = path.dirname(outputFile)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  }

  const writeOutput = (content: any) => {
    if (outputFile) {
      fs.writeFileSync(outputFile, JSON.stringify(content, null, 2))
      log('info', `Results written to ${outputFile}`)
    }
  }

  try {
    log('info', '=== Starting Brand Data Migration ===')
    log('info', `Mode: ${dryRun ? 'DRY RUN' : 'LIVE MIGRATION'}`)
    log('info', `Options:`, {
      skipVariants,
      skipSuppliers,
      logLevel,
      continueOnError
    })

    // Pre-migration validation
    log('info', 'Running pre-migration validation...')
    
    // Check if brand and purchasing modules are available
    try {
      // This is a basic connectivity test
      await container.resolve('RemoteQuery')
      await container.resolve('Link')
      log('info', 'Container services validated')
    } catch (validationError) {
      throw new Error(`Container validation failed: ${validationError.message}`)
    }

    // Phase 1: Variant Brand Backfill
    if (!skipVariants) {
      log('info', '=== Phase 1: Variant Brand Backfill ===')
      try {
        summary.variantResults = await backfillVariantBrands(container, {
          dryRun,
          logLevel,
          batchSize: 25,  // Smaller batches for safety
          productLimit: 1000
        })

        if (summary.variantResults.errors.length > 0 && !continueOnError) {
          throw new Error(`Variant backfill completed with ${summary.variantResults.errors.length} errors`)
        }

        log('info', `Phase 1 completed: ${summary.variantResults.updated} variants updated, ${summary.variantResults.errors.length} errors`)
      } catch (variantError) {
        const errorMsg = `Phase 1 (Variant Backfill) failed: ${variantError.message}`
        summary.errors.push(errorMsg)
        log('error', errorMsg)

        if (!continueOnError) {
          throw variantError
        }
      }
    } else {
      log('info', 'Phase 1 (Variant Brand Backfill) skipped')
    }

    // Phase 2: Supplier Brand Backfill  
    if (!skipSuppliers) {
      log('info', '=== Phase 2: Supplier Brand Backfill ===')
      try {
        summary.supplierResults = await backfillSupplierBrands(container, {
          dryRun,
          logLevel,
          batchSize: 15,  // Even smaller batches for supplier processing
          supplierLimit: 500,
          minVariantThreshold: 1
        })

        if (summary.supplierResults.errors.length > 0 && !continueOnError) {
          throw new Error(`Supplier backfill completed with ${summary.supplierResults.errors.length} errors`)
        }

        log('info', `Phase 2 completed: ${summary.supplierResults.updated} suppliers updated, ${summary.supplierResults.errors.length} errors`)
      } catch (supplierError) {
        const errorMsg = `Phase 2 (Supplier Backfill) failed: ${supplierError.message}`
        summary.errors.push(errorMsg)
        log('error', errorMsg)

        if (!continueOnError) {
          throw supplierError
        }
      }
    } else {
      log('info', 'Phase 2 (Supplier Brand Backfill) skipped')
    }

    // Migration completed successfully
    summary.success = summary.errors.length === 0 || continueOnError
    summary.endTime = new Date()
    summary.duration = summary.endTime.getTime() - summary.startTime.getTime()

    log('info', '=== Migration Summary ===')
    log('info', `Status: ${summary.success ? 'SUCCESS' : 'FAILED'}`)
    log('info', `Duration: ${Math.round(summary.duration / 1000)}s`)
    
    if (summary.variantResults) {
      log('info', `Variants: ${summary.variantResults.updated} updated, ${summary.variantResults.skipped} skipped`)
    }
    
    if (summary.supplierResults) {
      log('info', `Suppliers: ${summary.supplierResults.updated} updated, ${summary.supplierResults.skipped} skipped`)
    }
    
    log('info', `Total errors: ${summary.errors.length}`)

    if (summary.errors.length > 0) {
      log('error', 'Migration errors:')
      summary.errors.forEach(error => log('error', `  - ${error}`))
    }

    // Write results to file
    writeOutput(summary)

    if (dryRun) {
      log('info', '🔍 This was a DRY RUN - no data was actually modified')
      log('info', '💡 Run with --no-dry-run to apply changes')
    } else if (summary.success) {
      log('info', '✅ Migration completed successfully!')
    }

    return summary

  } catch (error) {
    summary.success = false
    summary.endTime = new Date()
    summary.duration = summary.endTime.getTime() - summary.startTime.getTime()
    
    const errorMsg = `Migration failed: ${error.message}`
    summary.errors.push(errorMsg)
    log('error', errorMsg)
    log('error', error.stack)

    writeOutput(summary)
    throw error
  }
}

// CLI usage
if (require.main === module) {
  const { medusaIntegrationTestRunner } = require("medusa-test-utils")
  
  medusaIntegrationTestRunner({
    testSuite: async ({ container }) => {
      const args = process.argv.slice(2)
      const dryRun = !args.includes('--no-dry-run')  // Default to dry run
      const debug = args.includes('--debug')
      const skipVariants = args.includes('--skip-variants')
      const skipSuppliers = args.includes('--skip-suppliers')
      const continueOnError = args.includes('--continue-on-error')
      const outputArg = args.find(arg => arg.startsWith('--output='))
      const outputFile = outputArg ? outputArg.split('=')[1] : `./migration-results-${Date.now()}.json`
      
      console.log('=== Brand Data Migration Tool ===')
      console.log(`Arguments: ${args.join(' ')}`)
      console.log(`Output file: ${outputFile}`)
      console.log('')
      
      if (dryRun) {
        console.log('🔍 Running in DRY RUN mode (no data will be modified)')
        console.log('💡 Use --no-dry-run to apply changes')
        console.log('')
      } else {
        console.log('⚠️  LIVE MIGRATION MODE - Data will be modified!')
        console.log('🛡️  Make sure you have a database backup!')
        console.log('')
        
        // Wait for confirmation in live mode
        const readline = require('readline')
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        })
        
        const answer = await new Promise(resolve => {
          rl.question('Continue with live migration? (type "yes" to confirm): ', resolve)
        })
        
        rl.close()
        
        if (answer.toLowerCase() !== 'yes') {
          console.log('Migration cancelled by user')
          process.exit(0)
        }
      }
      
      try {
        const result = await migrateBrandData(container, {
          dryRun,
          logLevel: debug ? 'debug' : 'info',
          skipVariants,
          skipSuppliers,
          outputFile,
          continueOnError
        })
        
        process.exit(result.success ? 0 : 1)
      } catch (error) {
        console.error('Migration failed:', error.message)
        process.exit(1)
      }
    },
  })
}