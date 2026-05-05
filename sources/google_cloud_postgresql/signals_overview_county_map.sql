select
  p.state || '-' || tr.county as state_county_id,
  tr.county,
  count(distinct p.property_id) as total_properties
from properties p
left join target_regions tr on p.zip_code = tr.zip_code
where tr.county is not null
  and tr.county != ''
  and p.created_at >= now() - interval '30 days'
group by p.state || '-' || tr.county, tr.county
order by total_properties desc
