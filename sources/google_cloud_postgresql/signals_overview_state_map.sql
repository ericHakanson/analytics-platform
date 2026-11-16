-- Nationwide coverage by state, ALL TIME.
--
-- Deliberately all-time, to match the "States Covered (All Time)" tile: the
-- scheduled pipeline covers Essex + Middlesex MA only, so a trailing-30-day
-- cut would be Massachusetts and almost nothing else. Everything outside MA is
-- therefore history or address-parse residue rather than current coverage —
-- read the companion table before reading anything into the map.
--
-- properties.state holds USPS two-letter codes; static/geo/us-states.geojson is
-- keyed on a matching `state` property. A row whose state is not a two-letter
-- code simply does not join and is excluded here, so the map and the table
-- agree.
select
  upper(trim(state)) as state,
  count(distinct property_id) as total_properties
from properties
where state is not null
  and trim(state) <> ''
  and length(trim(state)) = 2
group by upper(trim(state))
order by total_properties desc
