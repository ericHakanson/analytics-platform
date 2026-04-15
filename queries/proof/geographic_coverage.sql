-- Shared query template: geographic_coverage
-- Contract:  geographic_coverage v1
-- Source:    publishing_contracts.geographic_coverage
--            (sources/publishing_contracts/geographic_coverage.sql)
--
-- Usage: copy this block into a new proof page .md file and replace
--        the county_slug or state_slug literal with the target geography.
--        Do NOT filter by any column not present in the contract schema.
--        Do NOT read from raw scrape tables (zillow_listings, redfin_listings, etc.).
--
-- Columns projected:
--   contract_name              -- always 'geographic_coverage'
--   contract_version           -- always 'v1'
--   state_slug                 -- state/portfolio slug (e.g. massachusetts)
--   county_slug                -- county slug (e.g. essex-county-ma)
--   county_name                -- human-readable county label
--   state_code                 -- two-letter state code
--   fips_code                  -- five-digit county FIPS for county map joins
--   period_start               -- date: window start
--   period_end                 -- date: window end (data_as_of date)
--   zip_count_in_region        -- metric_key: zip_count_in_region
--   zip_count_with_properties  -- metric_key: zip_count_with_properties
--   total_properties           -- metric_key: total_properties
--   data_as_of                 -- date: business-data currency date
--   last_updated_at            -- timestamp: when contract row was last written
--
-- To build a statewide coverage page, filter by state_slug.
-- To build a single-county proof page, filter by county_slug.

select *
from publishing_contracts.geographic_coverage
where county_slug = '<<county_slug>>'   -- :county_slug  replace with target county
