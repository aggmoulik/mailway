import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AttachmentSchema, NormalizedMessageSchema } from '../message';
import { NormalizedWebhookEventSchema } from '../webhooks/events';

const DRAFT_07 = 'http://json-schema.org/draft-07/schema#';

const SCHEMAS: Record<string, object> = {
  'normalized-message': NormalizedMessageSchema,
  attachment: AttachmentSchema,
  'normalized-webhook-event': NormalizedWebhookEventSchema,
};

/** Writes each schema as a `draft-07`-stamped JSON file into `outDir`. Deterministic. */
export function emitSchemas(outDir: string): string[] {
  mkdirSync(outDir, { recursive: true });
  const written: string[] = [];
  for (const [name, schema] of Object.entries(SCHEMAS)) {
    const doc = { $schema: DRAFT_07, ...schema };
    const file = resolve(outDir, `${name}.json`);
    writeFileSync(file, `${JSON.stringify(doc, null, 2)}\n`, 'utf8');
    written.push(file);
  }
  return written;
}

// Run directly (`node dist/schema/emit.js`) -> write to <package>/schemas.
const isMain = resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url);
if (isMain) {
  emitSchemas(resolve(dirname(fileURLToPath(import.meta.url)), '../../schemas'));
}
