<script>
  import { USMap } from '@evidence-dev/core-components';

  export let data;
  export let title = 'County Coverage';
  export let description = '';
  export let valueCol = 'total_properties';
  export let colorScale = 'info';
</script>

<section class="rounded-[24px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
  <h2 class="text-2xl font-semibold tracking-tight text-slate-900">{title}</h2>
  {#if description}
    <p class="mt-1 text-sm text-slate-600">{description}</p>
  {/if}
  <div class="mt-4">
    <USMap
      data={data}
      fips="fips_code"
      value={valueCol}
      geography="county"
      colorScale={colorScale}
    />
  </div>
</section>
