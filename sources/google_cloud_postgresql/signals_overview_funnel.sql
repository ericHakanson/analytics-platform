select * from (
  select 1 as step_order, 'MA Properties' as stage, count(distinct property_id) as record_count
  from properties
  where state = 'MA'
    and created_at >= now() - interval '30 days'

  union all

  select 2, 'With Sale Record', count(distinct p.property_id)
  from properties p
  join sales s on p.property_id = s.property_id
  where p.state = 'MA'
    and s.sale_date >= (now() - interval '30 days')::date

  union all

  select 3, 'With Detail Snapshot', count(distinct p.property_id)
  from properties p
  join property_detail_snapshots d on p.property_id = d.property_id
  where p.state = 'MA'
    and d.scraped_at >= now() - interval '30 days'

  union all

  select 4, 'Scored (v2 Model)', count(distinct property_id)
  from property_renovation_scores
  where model_version = 'v2'
    and computed_at >= now() - interval '30 days'

  union all

  select 5, 'Renovation Candidate', count(distinct property_id)
  from property_renovation_scores
  where model_version = 'v2'
    and is_renovation_candidate = true
    and computed_at >= now() - interval '30 days'
) sub
order by step_order
