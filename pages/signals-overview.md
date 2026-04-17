---
title: Fort Island Signals
hide_title: true
---

# Signals Overview

Coverage across property listings, sales activity, renovation scoring, and geographic reach. All activity statistics reflect the **trailing 30 days** and are refreshed each time this page is built.

> **Data freshness:** Built from live database snapshots on {glance[0].built_at}. Renovation scores use Fort Island's v2 model; candidate thresholds are reviewed quarterly.

## Geographic Coverage At a Glance

```sql glance
select * from google_cloud_postgresql.signals_overview_glance
```

**Portfolio**

<BigValue data={glance} value="total_properties" title="Total Properties" fmt="num0" />

<BigValue data={glance} value="states_covered" title="States Covered" fmt="num0" />

<BigValue data={glance} value="municipalities_covered" title="Municipalities Covered" fmt="num0" />

**Market Activity — Trailing 30 Days**

<BigValue data={glance} value="for_sale_observed" title="For-Sale Observed" fmt="num0" />

<BigValue data={glance} value="new_listings" title="New Listings" fmt="num0" />

<BigValue data={glance} value="sales_detected" title="Sales Detected" fmt="num0" />

**Enrichment Pipeline — Trailing 30 Days**

<BigValue data={glance} value="properties_scraped" title="Properties Scraped" fmt="num0" />

<BigValue data={glance} value="properties_scored" title="Properties Scored" fmt="num0" />

<BigValue data={glance} value="renovation_candidates" title="Renovation Candidates" fmt="num0" />

## Properties by County

```sql county_map_data
select * from google_cloud_postgresql.signals_overview_county_map
```

<AreaMap
    data={county_map_data}
    geoJsonUrl="/geo/ma-counties.geojson"
    geoId="NAME"
    areaCol="county"
    value="total_properties"
    valueFmt="num0"
    title="Properties by County (Trailing 30 Days)"
    startingLat=42.2
    startingLong=-71.8
    startingZoom=7
    legend=true
/>

## Renovation Funnel

Properties enter the funnel when first observed in a listing feed. Each subsequent stage requires an additional data signal — a detail snapshot, a computed renovation score, and finally meeting the renovation candidate threshold.

```sql funnel
select * from google_cloud_postgresql.signals_overview_funnel
order by step_order
```

<FunnelChart
    data={funnel}
    nameCol=stage
    valueCol=record_count
    valueFmt=num0
    showPercent=true
    title="Property → Candidate Funnel"
    subtitle="Percent shown relative to first stage"
/>

---

*Fort Island tracks residential properties using automated listing feeds and public records. Renovation scores are produced by a proprietary model trained on historical renovation outcomes. Candidate designation indicates a property meets minimum score and data-completeness thresholds — it is not a recommendation to buy or sell.*
