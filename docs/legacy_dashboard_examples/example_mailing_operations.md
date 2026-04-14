# Mailing Operations

How many pieces were mailed, to which geographies and contractors, at what cost, and what was the engagement (QR scan) rate?

Combines the legacy mailing log (`mailing_sends`) with the new DM platform (`dm_campaigns`, `dm_mail_jobs`, `dm_contractors`). The DM platform handles campaign creation, PostGrid submission, delivery tracking, and QR engagement.

## Overview

```sql mail_overview
SELECT
  count() as total_sends,
  count(DISTINCT property_id) as unique_properties,
  count(DISTINCT batch_id) as batches,
  min(sent_at) as first_send,
  max(sent_at) as last_send,
  countIf(resend_eligible_at <= now()) as resend_eligible,
  countIf(resend_eligible_at > now()) as resend_cooldown
FROM google_cloud_postgresql_public_mailing_sends
```

{% big_value data="mail_overview" value="total_sends" title="Total Legacy Sends" fmt="num0" /%}

{% big_value data="mail_overview" value="unique_properties" title="Unique Properties" fmt="num0" /%}

{% big_value data="mail_overview" value="resend_eligible" title="Resend Eligible" fmt="num0" /%}

{% big_value data="mail_overview" value="resend_cooldown" title="In Cooldown" fmt="num0" /%}

## DM Campaigns

Campaign volume, cost, and delivery status from the new DM platform. Each campaign targets a `service_type` (contractor, plumber, electrician, etc.) for a specific week.

```sql campaign_summary
SELECT
    campaign_week_start,
    service_type,
    status,
    projected_piece_count,
    actual_piece_count,
    projected_total_cost,
    actual_total_cost,
    sold_window_start,
    sold_window_end
FROM google_cloud_postgresql_public_dm_campaigns
ORDER BY campaign_week_start DESC, service_type
```

{% table data="campaign_summary" /%}

### Campaigns Pending Approval

```sql pending_approval
SELECT
    campaign_id,
    service_type,
    campaign_week_start,
    projected_piece_count,
    projected_total_cost,
    created_at
FROM google_cloud_postgresql_public_dm_campaigns
WHERE status = 'draft'
ORDER BY campaign_week_start, service_type
```

{% table data="pending_approval" /%}

## Mail Job Delivery Funnel

Status breakdown of individual postcards (last 90 days). Tracks the lifecycle: draft → submitted → processed → mailed → delivered (or returned / failed / cancelled).

```sql delivery_funnel
SELECT
    status,
    count(*) AS cnt,
    round(count(*) * 100.0 / greatest(sum(count(*)) OVER (), 1), 2) AS pct
FROM google_cloud_postgresql_public_dm_mail_jobs
WHERE created_at >= now() - INTERVAL 90 DAY
GROUP BY 1
ORDER BY cnt DESC
```

{% bar_chart
  data="delivery_funnel"
  x="status"
  y="cnt"
  order="cnt desc"
  title="Mail Job Status (Last 90 Days)"
  y_fmt="num0"
/%}

{% table data="delivery_funnel" /%}

### Cost per Mailed Piece by Service Type

```sql cost_per_piece
SELECT
    service_type,
    count(*) AS pieces_sent,
    sum(unit_cost) AS total_cost,
    round(avg(unit_cost), 4) AS avg_unit_cost
FROM google_cloud_postgresql_public_dm_mail_jobs
WHERE status IN ('mailed', 'delivered')
GROUP BY 1
ORDER BY total_cost DESC
```

{% table data="cost_per_piece" /%}

### Delivery Failures (Last 90 Days)

```sql delivery_failures
SELECT
    mj.status,
    mj.postgrid_postcard_id,
    p.street_address,
    p.city,
    p.state,
    mj.created_at,
    mj.last_status_at
FROM google_cloud_postgresql_public_dm_mail_jobs mj
JOIN google_cloud_postgresql_public_properties p ON p.property_id = mj.property_id
WHERE mj.status IN ('returned', 'failed')
  AND mj.created_at >= now() - INTERVAL 90 DAY
ORDER BY mj.last_status_at DESC
```

{% table data="delivery_failures" /%}

## QR Scan Engagement

Scan rate by completed campaign. A higher scan rate indicates stronger creative or targeting.

```sql qr_scan_rate
SELECT
    c.campaign_week_start,
    c.service_type,
    c.actual_piece_count,
    count(DISTINCT qs.scan_id) AS total_scans,
    count(DISTINCT qs.mail_job_id) AS unique_pieces_scanned,
    round(count(DISTINCT qs.mail_job_id) * 100.0 / nullIf(c.actual_piece_count, 0), 2) AS scan_rate_pct
FROM google_cloud_postgresql_public_dm_campaigns c
LEFT JOIN google_cloud_postgresql_public_dm_qr_scans qs ON qs.campaign_id = c.campaign_id
WHERE c.status = 'completed'
GROUP BY 1, 2, 3
ORDER BY 1 DESC, 2
```

{% table data="qr_scan_rate" /%}

## Legacy Mailing Activity

Historical sends from the legacy mailing system (`mailing_sends`). This data is the all-time dedup record.

```sql mailing_by_month
SELECT
  toStartOfMonth(sent_at) as month,
  count() as sends
FROM google_cloud_postgresql_public_mailing_sends
GROUP BY month
ORDER BY month
```

{% line_chart
    data="mailing_by_month"
    title="Legacy Sends by Month"
    x="month"
    y="sends"
    y_fmt="num0"
/%}

### Sends by Town

```sql sends_by_town
SELECT
  p.city as town,
  count() as sends,
  count(DISTINCT ms.property_id) as unique_properties,
  avg(rs.renovation_score) as avg_score,
  avg(s.sale_price) as avg_sale_price
FROM google_cloud_postgresql_public_mailing_sends ms
JOIN google_cloud_postgresql_public_properties p ON ms.property_id = p.property_id
LEFT JOIN google_cloud_postgresql_public_property_renovation_scores rs ON ms.property_id = rs.property_id AND rs.model_version = 'v2'
LEFT JOIN google_cloud_postgresql_public_sales s ON ms.property_id = s.property_id
WHERE p.city != ''
GROUP BY town
ORDER BY sends DESC
```

{% bar_chart
  data="sends_by_town"
  x="town"
  y="sends"
  order="sends desc"
  title="Legacy Sends by Town"
  y_fmt="num0"
/%}

{% table data="sends_by_town" /%}

### Resend Eligibility

Properties that have cleared their cooldown period and are eligible for a new mailing.

```sql resend_eligible
SELECT
    ms.property_id,
    p.street_address,
    p.city,
    p.state,
    count(*) AS send_count,
    max(ms.sent_at) AS last_sent,
    max(ms.resend_eligible_at) AS resend_eligible
FROM google_cloud_postgresql_public_mailing_sends ms
JOIN google_cloud_postgresql_public_properties p ON p.property_id = ms.property_id
WHERE ms.resend_eligible_at <= now()
GROUP BY 1, 2, 3, 4
ORDER BY send_count DESC, last_sent DESC
LIMIT 50
```

{% table data="resend_eligible" /%}

### Recent Legacy Sends

```sql recent_mailings
select
  m.sent_at,
  p.street_address,
  p.city,
  p.state,
  p.zip_code,
  m.source,
  coalesce(m.mailer_type, 'unknown') as mailer_type,
  m.sent_by,
  m.addressee
from google_cloud_postgresql_public_mailing_sends m
left join google_cloud_postgresql_public_properties p using (property_id)
order by m.sent_at desc
limit 50
```

{% table data="recent_mailings" search=true /%}

## DM Platform Status

Record counts across all DM platform tables. Sections above will populate automatically as campaigns are created.

```sql dm_status
SELECT * FROM (
  SELECT 'Campaigns' as entity, count() as record_count FROM google_cloud_postgresql_public_dm_campaigns
  UNION ALL
  SELECT 'Mail Jobs', count() FROM google_cloud_postgresql_public_dm_mail_jobs
  UNION ALL
  SELECT 'Contractors', count() FROM google_cloud_postgresql_public_dm_contractors
  UNION ALL
  SELECT 'Creatives', count() FROM google_cloud_postgresql_public_dm_creatives
  UNION ALL
  SELECT 'Pricing', count() FROM google_cloud_postgresql_public_dm_pricing
  UNION ALL
  SELECT 'QR Scans', count() FROM google_cloud_postgresql_public_dm_qr_scans
  UNION ALL
  SELECT 'Webhook Events', count() FROM google_cloud_postgresql_public_dm_postgrid_webhook_events
  UNION ALL
  SELECT 'Legacy Sends', count() FROM google_cloud_postgresql_public_mailing_sends
) sub
ORDER BY entity
```

{% table data="dm_status" /%}

## Table Reference

| Table | Purpose |
|---|---|
| `properties` | Canonical property registry |
| `sales` | Sale events with date and price |
| `property_state` | Per-property persistent state (FOR_SALE / SOLD) |
| `property_events` | Event audit trail (NEW_LISTING, NEW_SALE, LATE_SALE, NO_CHANGE) |
| `discovery_runs` | Per-feed scraping run metadata |
| `enrichment_jobs` | Enrichment task queue |
| `property_detail_snapshots` | Zillow detail page scrape results |
| `property_price_history` | Price history events per property |
| `property_renovation_scores` | Scoring output — all model versions |
| `town_runs` | Per-geography per-cycle pipeline health |
| `target_regions` | ZIP → county lookup |
| `mailing_sends` | All-time mailing deduplication log |
| `dm_contractors` | Contractor profiles |
| `dm_creatives` | Postcard template versions |
| `dm_pricing` | Unit cost by service type and date |
| `dm_campaigns` | Weekly campaign batches |
| `dm_mail_jobs` | Individual postcard jobs |
| `dm_campaign_status_history` | Campaign status audit trail |
| `dm_mail_job_status_history` | Mail job status audit trail |
| `dm_postgrid_webhook_events` | Raw PostGrid webhook events |
| `dm_qr_scans` | QR code scan log |
| `run_data_quality_snapshot` | Per-run data quality metrics |
| `detail_enrichment_checkpoints` | Enrichment batch progress tracking |