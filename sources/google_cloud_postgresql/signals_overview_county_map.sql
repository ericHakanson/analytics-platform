select
  state || '-' || county as state_county_id,
  county,
  count(distinct property_id) as total_properties
from properties
where county is not null
  and county != ''
  and created_at >= now() - interval '30 days'
group by state || '-' || county, county
order by total_properties desc
