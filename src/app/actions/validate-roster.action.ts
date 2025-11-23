'use server'

import { SolverIntegrationService } from '@/services/solver-integration.service'

/**
 * Server Action to validate an existing roster against its constraints
 * Part of FN/BE/ENG/002 - Roster Validator (Audit Mode)
 */
export async function validateRosterAction(rosterId: string) {
  try {
    const service = new SolverIntegrationService()
    const validationResult = await service.validateRoster(rosterId)

    return {
      success: true as const,
      data: validationResult,
    }
  } catch (error) {
    console.error('Validate roster error:', error)
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: null,
    }
  }
}
