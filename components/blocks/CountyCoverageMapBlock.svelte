<script>
  import { AreaMap } from '@evidence-dev/core-components';

  export let data;
  export let title = 'County Coverage';
  export let description = '';
  export let valueCol = 'total_properties';
  export let areaCol = 'fips_code';
  export let geoId = 'fips_code';
  export let geoJsonUrl = '/geo/ma-counties.geojson';
  export let startingLat = 42.2;
  export let startingLong = -71.8;
  export let startingZoom = 7;
</script>

<section class="rounded-[24px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
  <h2 class="text-2xl font-semibold tracking-tight text-slate-900">{title}</h2>
  {#if description}
    <p class="mt-1 text-sm text-slate-600">{description}</p>
  {/if}
  <div class="mt-4">
    <AreaMap
      data={data}
      geoJsonUrl={geoJsonUrl}
      geoId={geoId}
      areaCol={areaCol}
      value={valueCol}
      startingLat={startingLat}
      startingLong={startingLong}
      startingZoom={startingZoom}
      legend={false}
      height={420}
    />
  </div>
</section>
