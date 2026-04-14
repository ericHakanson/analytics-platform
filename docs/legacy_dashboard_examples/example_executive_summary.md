# Executive Summary

```sql portfolio_overview
select
  (select count(*) from google_cloud_postgresql_public_zillow_listings)
    + (select count(*) from google_cloud_postgresql_public_redfin_listings) as listed_count,
  (select count(distinct property_id) from google_cloud_postgresql_public_sales) as sold_count,
  (select count(distinct property_id) from google_cloud_postgresql_public_property_renovation_scores) as scored_count,
  (select count(*) from google_cloud_postgresql_public_property_renovation_scores where is_renovation_candidate) as candidate_count,
  (select count(*) from google_cloud_postgresql_public_mailing_sends) as mailing_send_count
```

{% big_value data="portfolio_overview" value="listed_count" title="Properties Listed" fmt="num0" /%}
{% big_value data="portfolio_overview" value="sold_count" title="Properties Sold" fmt="num0" /%}
{% big_value data="portfolio_overview" value="scored_count" title="Renovation Scores" fmt="num0" /%}
{% big_value data="portfolio_overview" value="candidate_count" title="Renovation Candidates" fmt="num0" /%}
{% big_value data="portfolio_overview" value="mailing_send_count" title="Mailing Sends" fmt="num0" /%}

```sql candidate_cities
select
  p.city,
  count(*) as candidate_count,
  round(avg(r.renovation_score), 1) as avg_score
from google_cloud_postgresql_public_property_renovation_scores r
join google_cloud_postgresql_public_properties p using (property_id)
where r.is_renovation_candidate
group by 1
order by candidate_count desc, avg_score desc
limit 12
```

```sql renovation_bands
select
  renovation_band,
  count(*) as properties,
  case renovation_band
    when 'Low' then 1
    when 'Medium' then 2
    when 'High' then 3
    else 4
  end as sort_order
from google_cloud_postgresql_public_property_renovation_scores
group by 1
order by sort_order
```

```sql mailing_by_month
select
  date_trunc('month', sent_at) as month,
  count(*) as sends
from google_cloud_postgresql_public_mailing_sends
group by 1
order by 1
```

## Candidate Coverage

{% horizontal_bar_chart
    data="candidate_cities"
    title="Top Cities by Renovation Candidates"
    y="city"
    x="candidate_count"
    order="candidate_count desc"
/%}

{% bar_chart
    data="renovation_bands"
    title="Renovation Score Bands"
    x="renovation_band"
    y="properties"
    order="sort_order"
/%}