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
select 1 as step_order, 'MA Properties' as stage, count(*) as record_count from base
union all select 2, 'Detail Snapshot', count(*) from snapshotted
union all select 3, 'Scored (v2 Model)', count(*) from scored
union all select 4, 'Renovation Candidate', count(*) from candidates
order by step_order
