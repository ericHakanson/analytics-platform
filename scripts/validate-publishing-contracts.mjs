import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { validateAgainstSchema } from './lib/json-schema-lite.mjs';

const repoRoot = process.cwd();
const contractsRoot = path.join(repoRoot, 'contracts', 'publishing');
const dataRoot = path.join(repoRoot, 'data', 'contracts');
const metricRegistryPath = path.join(contractsRoot, 'metric-registry.json');

const expectedContracts = [
  {
    name: 'market_proof_overview',
    version: 'v1',
    schemaFile: 'market_proof_overview.v1.schema.json',
    sampleFile: path.join('market_proof_overview', 'sample.v1.json'),
    requiredMetricKeys: [
      'new_sale_events',
      'late_sale_events',
      'scored_properties_count',
      'high_band_candidate_count',
      'high_band_candidate_rate'
    ]
  },
  {
    name: 'campaign_snapshot',
    version: 'v1',
    schemaFile: 'campaign_snapshot.v1.schema.json',
    sampleFile: path.join('campaign_snapshot', 'sample.v1.json'),
    requiredMetricKeys: [
      'sale_events_30d',
      'enrichment_completion_rate',
      'source_coverage_share'
    ]
  },
  {
    name: 'client_pipeline_briefing',
    version: 'v1',
    schemaFile: 'client_pipeline_briefing.v1.schema.json',
    sampleFile: path.join('client_pipeline_briefing', 'sample.v1.json'),
    requiredMetricKeys: [
      'town_runs_pass_rate',
      'new_sale_events',
      'late_sale_events',
      'enrichment_completion_rate',
      'high_band_candidate_count'
    ]
  },
  {
    name: 'signals_overview',
    version: 'v1',
    schemaFile: 'signals_overview.v1.schema.json',
    sampleFile: path.join('signals_overview', 'sample.v1.json'),
    requiredMetricKeys: [
      'sale_events_30d',
      'scored_properties_count',
      'high_band_candidate_count',
      'high_band_candidate_rate'
    ]
  },
  {
    name: 'market_sale_activity',
    version: 'v1',
    schemaFile: 'market_sale_activity.v1.schema.json',
    sampleFile: path.join('market_sale_activity', 'sample.v1.json'),
    requiredMetricKeys: [
      'sale_events_30d',
      'new_listing_events',
      'active_for_sale_count',
      'median_sale_price_30d'
    ]
  },
  {
    name: 'geographic_coverage',
    version: 'v1',
    schemaFile: 'geographic_coverage.v1.schema.json',
    sampleFile: path.join('geographic_coverage', 'sample.v1.json'),
    requiredMetricKeys: [
      'zip_count_in_region',
      'zip_count_with_properties',
      'total_properties'
    ]
  }
];

function expect(condition, message, errors) {
  if (!condition) {
    errors.push(message);
  }
}

async function loadJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function main() {
  const errors = [];
  const metricRegistry = await loadJson(metricRegistryPath);
  const metricKeys = new Set(metricRegistry.metrics.map((metric) => metric.metric_key));

  expect(metricRegistry.metrics.length > 0, 'metric-registry.json must define at least one metric', errors);

  const contractFiles = await readdir(contractsRoot);
  const schemaFiles = new Set(contractFiles.filter((file) => file.endsWith('.schema.json')));

  for (const contract of expectedContracts) {
    const schemaPath = path.join(contractsRoot, contract.schemaFile);
    const samplePath = path.join(dataRoot, contract.sampleFile);

    expect(schemaFiles.has(contract.schemaFile), `missing schema file ${contract.schemaFile}`, errors);

    const schema = await loadJson(schemaPath);
    const sample = await loadJson(samplePath);

    expect(schema.properties.contract_name.const === contract.name, `${contract.schemaFile}: contract_name const mismatch`, errors);
    expect(schema.properties.contract_version.const === contract.version, `${contract.schemaFile}: contract_version const mismatch`, errors);

    expect(sample.contract_name === contract.name, `${samplePath}: contract_name mismatch`, errors);
    expect(sample.contract_version === contract.version, `${samplePath}: contract_version mismatch`, errors);
    expect(Array.isArray(sample.records) && sample.records.length > 0, `${samplePath}: records must be a non-empty array`, errors);
    validateAgainstSchema(schema, sample, samplePath, errors);

    for (const metricKey of contract.requiredMetricKeys) {
      expect(metricKeys.has(metricKey), `${contract.name}: required metric key "${metricKey}" missing from metric-registry.json`, errors);
    }
  }

  if (errors.length > 0) {
    console.error('Publishing contract validation failed:\n');
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log(`Validated ${expectedContracts.length} publishing contract(s).`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
