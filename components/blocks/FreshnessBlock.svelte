<script>
  import { DataTable, Column, LastRefreshed } from '@evidence-dev/core-components';

  export let data;
  export let title = 'Contract Window And Freshness';
  export let pagePrefix = 'Page last built:';
</script>

<section class="rounded-[24px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
  <div class="space-y-4">
    <div>
      <h2 class="text-2xl font-semibold tracking-tight text-slate-900">{title}</h2>
      <p class="mt-2 max-w-3xl text-sm leading-6 text-slate-700">
        Window boundaries, data currency, and build freshness should be visible on every publishable asset.
      </p>
    </div>

    <DataTable data={data} title="Contract freshness details">
      <Column id="contract_version" title="Contract version" />
      <Column id="period_start" title="Window start" />
      <Column id="period_end" title="Window end" />
      <Column id="data_as_of" title="Data as of" />
      <Column id="last_updated_at" title="Contract updated at" />
    </DataTable>

    <LastRefreshed prefix={pagePrefix} />
  </div>
</section>
