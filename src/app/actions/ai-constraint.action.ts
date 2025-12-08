'use server';

import { prisma } from '@/lib/prisma';
import { aiConstraintTranslatorService } from '@/services/ai-constraint-translator.service';
import { SolverConstraintSchema } from '@/lib/validations/solver';

interface TranslateConstraintParams {
  text: string;
}

export async function translateConstraintAction({ text }: TranslateConstraintParams) {
  try {
    if (!text || text.trim().length === 0) {
      return { success: false as const, error: 'Empty input', constraints: [] };
    }

    // Fetch active staff for name → visibleId mapping
    const staff = await prisma.staff.findMany({
      where: { isActive: true, deletedAt: null },
      select: { visibleId: true, user: { select: { name: true } } },
    });
    const nameToEmployee = new Map<string, string>();
    staff.forEach((s) => {
      if (s.user?.name) {
        nameToEmployee.set(s.user.name.toLowerCase(), s.visibleId);
      }
    });

    // AI translation
    const { constraints, raw } = await aiConstraintTranslatorService.translate(text);

    // Normalize resources (map names to employee IDs if possible) and clean config
    const normalized = constraints.map((c) => {
      const cfg = { ...c.config };

      // CRITICAL: Remove 'type' from config if it exists (should only be at top level)
      delete cfg.type;

      // Map staff names to employee IDs
      if (cfg.resource && typeof cfg.resource === 'string') {
        const originalResource = cfg.resource;
        const mapped = nameToEmployee.get(cfg.resource.toLowerCase());
        if (mapped) {
          cfg.resource = mapped;
          console.log(`✓ Mapped staff name "${originalResource}" to employee ID "${mapped}"`);
        } else {
          console.warn(
            `✗ Could not map staff name "${originalResource}". Available staff:`,
            Array.from(nameToEmployee.keys())
          );
          throw new Error(
            `Staff member "${originalResource}" not found. Please use exact staff name or employee ID.`
          );
        }
      }
      return { ...c, config: cfg };
    });

    // Persist each constraint
    const created = [] as Array<{ id: string; type: string; name: string }>;
    for (const c of normalized) {
      // Build solver constraint shape for validation
      type SolverShape =
        | { type: 'point'; resource: string; time_slot: number; state: number }
        | {
            type: 'vertical_sum';
            time_slot: number | 'ALL';
            target_state: number;
            operator: '>=' | '<=' | '==';
            value: number;
          }
        | {
            type: 'horizontal_sum';
            resource: string;
            time_slots: number[];
            target_state: number;
            operator: '>=' | '<=' | '==';
            value: number;
          }
        | {
            type: 'sliding_window';
            resource: string;
            work_days: number;
            rest_days: number;
            target_state: number;
          };
      let solverShape: SolverShape;
      switch (c.type) {
        case 'point':
          {
            const cfg = c.config as {
              resource: string;
              time_slot: number;
              state: number;
            };
            solverShape = {
              type: 'point',
              resource: cfg.resource,
              time_slot: cfg.time_slot,
              state: cfg.state,
            };
          }
          break;
        case 'vertical_sum':
          {
            const cfg = c.config as {
              time_slot: number | 'ALL';
              target_state: number;
              operator: '>=' | '<=' | '==';
              value: number;
            };
            solverShape = {
              type: 'vertical_sum',
              time_slot: cfg.time_slot,
              target_state: cfg.target_state,
              operator: cfg.operator,
              value: cfg.value,
            };
          }
          break;
        case 'horizontal_sum':
          {
            const cfg = c.config as {
              resource: string;
              time_slots: number[];
              target_state: number;
              operator: '>=' | '<=' | '==';
              value: number;
            };
            solverShape = {
              type: 'horizontal_sum',
              resource: cfg.resource,
              time_slots: cfg.time_slots,
              target_state: cfg.target_state,
              operator: cfg.operator,
              value: cfg.value,
            };
          }
          break;
        case 'sliding_window':
          {
            const cfg = c.config as {
              resource: string;
              work_days: number;
              rest_days: number;
              target_state: number;
            };
            solverShape = {
              type: 'sliding_window',
              resource: cfg.resource,
              work_days: cfg.work_days,
              rest_days: cfg.rest_days,
              target_state: cfg.target_state,
            };
          }
          break;
        default:
          throw new Error(`Unsupported constraint type: ${c.type}`);
      }

      // Validate via zod
      SolverConstraintSchema.parse(solverShape);

      // Persist
      const saved = await prisma.constraint.create({
        data: {
          name: c.name || `${c.type} constraint`,
          type: c.type,
          config: c.config as any,
          description: 'Created via AI translator',
          isActive: true,
        },
        select: { id: true, type: true, name: true },
      });
      created.push(saved);
    }

    return { success: true as const, constraints: created, raw };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Unknown error',
      constraints: [],
    };
  }
}
