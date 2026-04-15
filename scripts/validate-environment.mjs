import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const envFilePath = path.join(repoRoot, '.env');

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) return {};

  const output = {};
  const raw = readFileSync(filePath, 'utf8');

  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separator = trimmed.indexOf('=');
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    output[key] = value;
  }

  return output;
}

function required(env, key, errors) {
  if (!env[key]) {
    errors.push(`missing required variable ${key}`);
  }
}

const fileEnv = parseEnvFile(envFilePath);
const env = { ...fileEnv, ...process.env };
const errors = [];

required(env, 'PUBLISHING_DATA_MODE', errors);
required(env, 'VITE_PUBLISHING_ENV', errors);
required(env, 'EVIDENCE_VAR__contract_root', errors);
required(env, 'VITE_PUBLIC_SITE_BASE_URL', errors);
required(env, 'VITE_HUBSPOT_FORM_BASE_URL', errors);
required(env, 'VITE_HUBSPOT_CAMPAIGN_UTM_SOURCE', errors);

const allowedModes = new Set(['sample', 'curated_export']);
if (env.PUBLISHING_DATA_MODE && !allowedModes.has(env.PUBLISHING_DATA_MODE)) {
  errors.push(`PUBLISHING_DATA_MODE must be one of: ${Array.from(allowedModes).join(', ')}`);
}

if (env.EVIDENCE_VAR__contract_root) {
  const contractRoot = path.resolve(repoRoot, env.EVIDENCE_VAR__contract_root);
  if (!existsSync(contractRoot)) {
    errors.push(`contract root does not exist: ${contractRoot}`);
  }

  if (env.PUBLISHING_DATA_MODE === 'sample') {
    const requiredFiles = [
      'market_proof_overview.csv',
      'campaign_snapshot.csv',
      'client_pipeline_briefing.csv',
      'signals_overview.csv',
      'signals_overview_county.csv',
      'market_sale_activity.csv',
      'market_sale_activity_weekly.csv',
      'market_sale_activity_geography.csv',
      'geographic_coverage.csv'
    ];

    for (const file of requiredFiles) {
      const target = path.join(contractRoot, file);
      if (!existsSync(target)) {
        errors.push(`sample mode requires contract file: ${target}`);
      }
    }
  }
}

if (errors.length > 0) {
  console.error('Environment validation failed:\n');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`Environment validated for mode "${env.PUBLISHING_DATA_MODE}".`);
