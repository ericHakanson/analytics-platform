import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { validateAgainstSchema } from './lib/json-schema-lite.mjs';

const repoRoot = process.cwd();
const assetsRoot = path.join(repoRoot, 'content', 'assets');
const schemaPath = path.join(repoRoot, 'contracts', 'publishing', 'asset-metadata.schema.json');
const metricRegistryPath = path.join(repoRoot, 'contracts', 'publishing', 'metric-registry.json');
const allowedFamilies = new Set(['proof', 'campaign', 'briefing']);
const statusValues = new Set(['draft', 'in_review', 'approved', 'published', 'deprecated']);
const assetTypeByPrefix = new Map([
  ['proof', 'evergreen_proof'],
  ['campaigns', 'campaign'],
  ['briefings', 'client_briefing']
]);
const familyByPrefix = new Map([
  ['proof', 'proof'],
  ['campaigns', 'campaign'],
  ['briefings', 'briefing']
]);

async function collectJsonFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectJsonFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      files.push(fullPath);
    }
  }

  return files;
}

function expect(condition, message, errors) {
  if (!condition) {
    errors.push(message);
  }
}

function isKebabCase(value) {
  return /^[a-z0-9-]+$/.test(value);
}

async function main() {
  const assetsStats = await stat(assetsRoot);
  const schema = JSON.parse(await readFile(schemaPath, 'utf8'));
  const metricRegistry = JSON.parse(await readFile(metricRegistryPath, 'utf8'));
  const registeredMetricKeys = new Set(metricRegistry.metrics.map((metric) => metric.metric_key));

  if (!assetsStats.isDirectory()) {
    throw new Error('content/assets is missing');
  }

  const files = await collectJsonFiles(assetsRoot);
  const errors = [];

  for (const file of files) {
    const relativePath = path.relative(repoRoot, file);
    const pathParts = path.relative(assetsRoot, file).split(path.sep);
    const [family, marketSlug, filename] = pathParts;
    const assetSlug = filename.replace(/\.json$/, '');

    expect(pathParts.length === 3, `${relativePath}: expected path content/assets/<family>/<market_slug>/<asset_slug>.json`, errors);
    if (pathParts.length !== 3) {
      continue;
    }

    expect(allowedFamilies.has(family), `${relativePath}: invalid asset family "${family}"`, errors);
    expect(isKebabCase(marketSlug), `${relativePath}: market slug must be lowercase kebab-case`, errors);
    expect(isKebabCase(assetSlug), `${relativePath}: asset slug filename must be lowercase kebab-case`, errors);

    const raw = await readFile(file, 'utf8');
    const metadata = JSON.parse(raw);
    validateAgainstSchema(schema, metadata, relativePath, errors);

    const requiredFields = [
      'title',
      'slug',
      'route_path',
      'asset_type',
      'audience',
      'market',
      'date_range',
      'refresh_cadence',
      'primary_message',
      'why_it_matters',
      'supporting_metrics',
      'cta',
      'channel_suitability',
      'status',
      'owner',
      'freshness',
      'contract'
    ];

    for (const field of requiredFields) {
      expect(metadata[field] !== undefined, `${relativePath}: missing required field "${field}"`, errors);
    }

    if (!metadata.slug || !metadata.route_path || !metadata.asset_type) {
      continue;
    }

    const slugParts = metadata.slug.split('/');
    expect(slugParts.length === 3, `${relativePath}: slug must have three path segments`, errors);

    const [slugPrefix, slugMarket, slugName] = slugParts;
    expect(assetTypeByPrefix.has(slugPrefix), `${relativePath}: slug prefix "${slugPrefix}" is invalid`, errors);

    const expectedFamily = familyByPrefix.get(slugPrefix);
    const expectedAssetType = assetTypeByPrefix.get(slugPrefix);

    expect(expectedFamily === family, `${relativePath}: slug prefix "${slugPrefix}" does not match folder family "${family}"`, errors);
    expect(slugMarket === marketSlug, `${relativePath}: slug market "${slugMarket}" does not match folder market "${marketSlug}"`, errors);
    expect(slugName === assetSlug, `${relativePath}: slug asset "${slugName}" does not match filename "${assetSlug}"`, errors);
    expect(metadata.route_path === `/${metadata.slug}`, `${relativePath}: route_path must equal "/${metadata.slug}"`, errors);
    expect(metadata.asset_type === expectedAssetType, `${relativePath}: asset_type "${metadata.asset_type}" does not match slug prefix "${slugPrefix}"`, errors);

    expect(statusValues.has(metadata.status), `${relativePath}: invalid status "${metadata.status}"`, errors);

    expect(Array.isArray(metadata.audience) && metadata.audience.length > 0, `${relativePath}: audience must be a non-empty array`, errors);
    expect(Array.isArray(metadata.supporting_metrics) && metadata.supporting_metrics.length > 0, `${relativePath}: supporting_metrics must be a non-empty array`, errors);
    expect(typeof metadata.primary_message === 'string' && metadata.primary_message.length > 0, `${relativePath}: primary_message must be a non-empty string`, errors);
    expect(typeof metadata.why_it_matters === 'string' && metadata.why_it_matters.length > 0, `${relativePath}: why_it_matters must be a non-empty string`, errors);
    expect(metadata.cta && typeof metadata.cta.label === 'string' && metadata.cta.label.length > 0, `${relativePath}: cta.label is required`, errors);

    if (Array.isArray(metadata.supporting_metrics)) {
      for (const metric of metadata.supporting_metrics) {
        expect(registeredMetricKeys.has(metric.metric_key), `${relativePath}: metric key "${metric.metric_key}" is not defined in contracts/publishing/metric-registry.json`, errors);
      }
    }

    if (metadata.cta && ['hubspot_form', 'hubspot_landing_page'].includes(metadata.cta.target_type)) {
      expect(typeof metadata.cta.utm_medium === 'string' && metadata.cta.utm_medium.length > 0, `${relativePath}: hubspot CTAs must define cta.utm_medium`, errors);
      expect(typeof metadata.cta.utm_campaign === 'string' && metadata.cta.utm_campaign.length > 0, `${relativePath}: hubspot CTAs must define cta.utm_campaign`, errors);
    }

    expect(metadata.market && metadata.market.slug === marketSlug, `${relativePath}: market.slug must match the folder market slug`, errors);
    expect(metadata.owner && typeof metadata.owner.name === 'string' && metadata.owner.name.length > 0, `${relativePath}: owner.name is required`, errors);
    expect(metadata.freshness && Array.isArray(metadata.freshness.source_systems) && metadata.freshness.source_systems.length > 0, `${relativePath}: freshness.source_systems must be a non-empty array`, errors);
    expect(metadata.contract && /^v[0-9]+$/.test(metadata.contract.version || ''), `${relativePath}: contract.version must look like v1`, errors);
  }

  if (errors.length > 0) {
    console.error('Asset metadata validation failed:\n');
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log(`Validated ${files.length} asset metadata file(s).`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
