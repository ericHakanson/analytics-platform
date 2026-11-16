-- Stage 1 was labelled 'MA Properties' until 2026-11-16, left over from the
-- MA-only base that 341f238 removed; the base has covered all states since.
--
-- Caveat worth knowing before reading this funnel: properties.created_at is not
-- a pure creation timestamp. load_zillow_listings.py upserts with
-- `DO UPDATE SET created_at = EXCLUDED.created_at` ("track last seen"), while
-- load_property_details.py preserves it. In practice rows reach `properties`
-- as they are enriched, so stages 1-3 track each other closely and the real
-- information is the stage-4 candidate rate. See
-- docs/architecture/signals-overview-data-flow.md section 6 (finding 3).
with base as (
  select distinct property_id
  from properties
  where created_at >= now() - interval '30 days'
),
snapshotted as (
  select distinct b.property_id
  from base b
  where exists (
    select 1 from property_detail_snapshots d
    where d.property_id = b.property_id
      and d.scraped_at >= now() - interval '30 days'
  )
),
scored as (
  select distinct s.property_id
  from snapshotted s
  where exists (
    select 1 from property_renovation_scores r
    where r.property_id = s.property_id
      and r.model_version = 'v2'
      and r.computed_at >= now() - interval '30 days'
  )
),
candidates as (
  select distinct s.property_id
  from scored s
  where exists (
    select 1 from property_renovation_scores r
    where r.property_id = s.property_id
      and r.model_version = 'v2'
      and r.is_renovation_candidate = true
      and r.computed_at >= now() - interval '30 days'
  )
)
select 1 as step_order, 'Properties Added (30d)' as stage, count(*) as record_count from base
union all select 2, 'Detail Snapshot', count(*) from snapshotted
union all select 3, 'Scored (v2 Model)', count(*) from scored
union all select 4, 'Renovation Candidate', count(*) from candidates
order by step_order
