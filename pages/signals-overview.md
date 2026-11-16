---
title: Fort Island Signals
hide_title: true
---

<script>
  // Keep these in a script block, not inline props: the Leaflet tile template
  // contains {z}/{x}/{y}, and inline `{...}` in an Evidence markdown page is
  // parsed as a Svelte expression ("'z' is not defined" at build time).
  const osmTileUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  const osmAttribution =
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
</script>

# Signals Overview

**Last refreshed:** {glance[0].built_at} ET

Coverage across property listings, sales activity, renovation scoring, and geographic reach. All activity statistics reflect the **trailing 30 days** and are refreshed each time this page is built.

> **About this data:** Built from live database snapshots. Renovation scores use Fort Island's v2 model; candidate thresholds are reviewed quarterly.

## Geographic Coverage At a Glance

```sql glance
select * from google_cloud_postgresql.signals_overview_glance
```

**Portfolio**

<BigValue data={glance} value="total_properties" title="Total Properties (All Time)" fmt="num0" />

<BigValue data={glance} value="states_covered" title="States Covered (All Time)" fmt="num0" />

<BigValue data={glance} value="municipalities_covered" title="Municipalities Covered (30 Days)" fmt="num0" />

**Market Activity — Trailing 30 Days**

<BigValue data={glance} value="for_sale_observed" title="For-Sale Observed" fmt="num0" />

<BigValue data={glance} value="new_listings" title="New Listings" fmt="num0" />

<BigValue data={glance} value="sales_detected" title="Sales Detected" fmt="num0" />

**Enrichment Pipeline — Trailing 30 Days**

<BigValue data={glance} value="properties_scraped" title="Properties Scraped" fmt="num0" />

<BigValue data={glance} value="properties_scored" title="Properties Scored" fmt="num0" />

<BigValue data={glance} value="renovation_candidates" title="Renovation Candidates" fmt="num0" />

## Nationwide Coverage

```sql state_map_data
select * from google_cloud_postgresql.signals_overview_state_map
```

<AreaMap
    data={state_map_data}
    geoJsonUrl="/geo/us-states.geojson"
    geoId="state"
    areaCol="state"
    value="total_properties"
    valueFmt="num0"
    title="Properties by State (All Time)"
    startingLat=39.5
    startingLong=-98.35
    startingZoom=3
    height=420
    legend=true
    basemap={osmTileUrl}
    attribution={osmAttribution}
/>

Scheduled collection currently runs in Essex and Middlesex counties, Massachusetts. Records outside Massachusetts are earlier or incidental coverage rather than active monitoring, so this map shows reach to date — not where the pipeline is running now. The table below gives the figures behind it.

<DataTable data={state_map_data} rows=10>
    <Column id=state title="State" />
    <Column id=total_properties title="Properties" fmt="num0" contentType=colorscale />
</DataTable>

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
    basemap={osmTileUrl}
    attribution={osmAttribution}
/>

## Renovation Funnel

The funnel covers properties added to the portfolio in the trailing 30 days, across all states. Each stage is a strict subset of the one above it: a detail snapshot, then a computed renovation score, then meeting the renovation candidate threshold. Because properties are added as they are enriched, the first three stages normally track each other closely — the candidate rate at the final stage is the meaningful yield.

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
