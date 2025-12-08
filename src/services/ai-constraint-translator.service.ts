import { SolverConstraintSchema } from '@/lib/validations/solver';

interface RawAIConstraint {
  name?: string;
  type: string;
  config: Record<string, unknown>;
}

export interface AITranslationResult {
  constraints: RawAIConstraint[];
  raw: string;
}

const SYSTEM_PROMPT = `You are an expert constraint translator for a nurse rostering optimization system.
Convert natural language scheduling rules into STRICT valid JSON.
Return either a single JSON object or an array of objects. Do NOT wrap in markdown.

Supported constraint types and JSON config schemas:

1. point
{"name": string, "type": "point", "config": {"resource": "STAFF_ID", "time_slot": 0, "state": 0}}

2. vertical_sum
{"name": string, "type": "vertical_sum", "config": {"time_slot": "ALL" | 0, "target_state": 1, "operator": ">=" | "<=" | "==", "value": 2}}

3. horizontal_sum
{"name": string, "type": "horizontal_sum", "config": {"resource": "STAFF_ID", "time_slots": [0,1,2], "target_state": 1, "operator": "<=", "value": 3}}

4. sliding_window
{"name": string, "type": "sliding_window", "config": {"resource": "STAFF_ID", "work_days": 5, "rest_days": 2, "target_state": 1}}

CRITICAL: Do NOT include "type" field inside the "config" object. The type is only at the top level.

Examples:
User: Amy cannot work on Monday
{"name": "Amy cannot work Monday", "type": "point", "config": {"resource": "Amy", "time_slot": 0, "state": 0}}

User: At least 3 nurses must be working every day
{"name": "At least 3 nurses daily", "type": "vertical_sum", "config": {"time_slot": "ALL", "target_state": 1, "operator": ">=", "value": 3}}

User: Bob max 3 consecutive work days
{"name": "Bob max 3 consecutive work days", "type": "horizontal_sum", "config": {"resource": "Bob", "time_slots": [0,1,2,3,4,5,6], "target_state": 1, "operator": "<=", "value": 3}}

User: Alice needs 2 days off after 5 work days
{"name": "Alice 2 off after 5 work days", "type": "sliding_window", "config": {"resource": "Alice", "work_days": 5, "rest_days": 2, "target_state": 1}}

Return ONLY JSON. If multiple rules given, return an array of objects.
If content is unclear, ask for clarification by returning: {"error": "clarification needed"}`;

export class AIConstraintTranslatorService {
  private readonly apiKey: string | undefined;
  private readonly model: string | undefined;

  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY;
    this.model = process.env.OPENROUTER_MODEL;
    if (!this.apiKey) {
      throw new Error('Missing OPENROUTER_API_KEY');
    }
    if (!this.model) {
      throw new Error('Missing OPENROUTER_MODEL');
    }
  }

  async translate(text: string): Promise<AITranslationResult> {
    const body = {
      model: this.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: text },
      ],
      temperature: 0.3,
    };

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        ...(process.env.OPENROUTER_SITE_URL
          ? { 'HTTP-Referer': process.env.OPENROUTER_SITE_URL }
          : {}),
        ...(process.env.OPENROUTER_APP_NAME ? { 'X-Title': process.env.OPENROUTER_APP_NAME } : {}),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status} ${await response.text()}`);
    }

    const json = await response.json();
    const content: string | undefined = json?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('No content returned from AI');
    }

    // Attempt to parse JSON robustly
    const parsed = this.safeJsonParse(content);
    if (!parsed) {
      throw new Error('Failed to parse AI JSON output');
    }

    // Normalize to array
    const constraintsArray: unknown[] = Array.isArray(parsed) ? parsed : [parsed];

    // Filter out error response
    if (constraintsArray.length === 1) {
      const single = constraintsArray[0] as Record<string, unknown>;
      if (typeof single === 'object' && single && 'error' in single) {
        throw new Error('AI clarification needed: input ambiguous');
      }
    }

    // Basic shape validation & map
    const cleaned: RawAIConstraint[] = constraintsArray.map((cRaw) => {
      const c = cRaw as Record<string, unknown>;
      return {
        name: (c.name as string) || 'AI Constraint',
        type: c.type as string,
        config: (c.config as Record<string, unknown>) || {},
      };
    });

    // Further validation using zod (only for known types). Unknown types will throw later.
    type PointConfig = { resource: string; time_slot: number; state: number };
    type VerticalConfig = {
      time_slot: number | 'ALL';
      target_state: number;
      operator: '>=' | '<=' | '==';
      value: number;
    };
    type HorizontalConfig = {
      resource: string;
      time_slots: number[];
      target_state: number;
      operator: '>=' | '<=' | '==';
      value: number;
    };
    type SlidingConfig = {
      resource: string;
      work_days: number;
      rest_days: number;
      target_state: number;
    };

    cleaned.forEach((c) => {
      try {
        const cfg = c.config as Record<string, unknown>;
        if (c.type === 'point') {
          const pc: PointConfig = {
            resource: cfg.resource as string,
            time_slot: cfg.time_slot as number,
            state: cfg.state as number,
          };
          SolverConstraintSchema.parse({ type: 'point', ...pc });
        } else if (c.type === 'vertical_sum') {
          const vc: VerticalConfig = {
            time_slot: cfg.time_slot as number | 'ALL',
            target_state: cfg.target_state as number,
            operator: cfg.operator as '>=' | '<=' | '==',
            value: cfg.value as number,
          };
          SolverConstraintSchema.parse({ type: 'vertical_sum', ...vc });
        } else if (c.type === 'horizontal_sum') {
          const hc: HorizontalConfig = {
            resource: cfg.resource as string,
            time_slots: (cfg.time_slots as number[]) || [],
            target_state: cfg.target_state as number,
            operator: cfg.operator as '>=' | '<=' | '==',
            value: cfg.value as number,
          };
          SolverConstraintSchema.parse({ type: 'horizontal_sum', ...hc });
        } else if (c.type === 'sliding_window') {
          const sc: SlidingConfig = {
            resource: cfg.resource as string,
            work_days: cfg.work_days as number,
            rest_days: cfg.rest_days as number,
            target_state: cfg.target_state as number,
          };
          SolverConstraintSchema.parse({ type: 'sliding_window', ...sc });
        }
      } catch (err) {
        throw new Error(
          `Constraint validation failed for type ${c.type}: ${(err as Error).message}`
        );
      }
    });

    return { constraints: cleaned, raw: content };
  }

  private safeJsonParse(raw: string): unknown | null {
    // Find first '{' or '[' and last '}' or ']' to slice JSON portion
    const startIdxObj = raw.indexOf('{');
    const startIdxArr = raw.indexOf('[');
    const startIdx =
      startIdxObj === -1
        ? startIdxArr
        : startIdxArr === -1
          ? startIdxObj
          : Math.min(startIdxObj, startIdxArr);
    const endIdxObj = raw.lastIndexOf('}');
    const endIdxArr = raw.lastIndexOf(']');
    const endIdx =
      endIdxObj === -1 ? endIdxArr : endIdxArr === -1 ? endIdxObj : Math.max(endIdxObj, endIdxArr);
    if (startIdx === -1 || endIdx === -1) return null;
    const slice = raw.slice(startIdx, endIdx + 1).trim();
    try {
      return JSON.parse(slice);
    } catch {
      return null;
    }
  }
}

export const aiConstraintTranslatorService = new AIConstraintTranslatorService();
