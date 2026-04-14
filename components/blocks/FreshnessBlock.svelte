<script>
  import { DataTable, Column, LastRefreshed } from '@evidence-dev/core-components';

  export let data;
  export let title = 'Contract Window And Freshness';
  export let pagePrefix = 'Page last built:';
  export let contractVersion = '';
  export let startField = 'period_start';
  export let startTitle = 'Window start';
  export let endField = 'period_end';
  export let endTitle = 'Window end';
</script>

<section class="rounded-[24px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
  <div class="space-y-4">
    <div>
      <h2 class="text-2xl font-semibold tracking-tight text-slate-900">{title}</h2>
      <p class="mt-2 max-w-3xl text-sm leading-6 text-slate-700">
        Window boundaries, data currency, and build freshness should be visible on every publishable asset.
      </p>
      {#if contractVersion}
        <p class="mt-2 text-sm font-medium text-slate-700">
          Contract version: <code>{contractVersion}</code>
        </p>
      {/if}
    </div>

    <DataTable data={data} title="Contract freshness details">
      <Column id={startField} title={startTitle} />
      <Column id={endField} title={endTitle} />
      <Column id="data_as_of" title="Data as of" />
      <Column id="last_updated_at" title="Contract updated at" />
    </DataTable>

    <LastRefreshed prefix={pagePrefix} />
  </div>
</section>
