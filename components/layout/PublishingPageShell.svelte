<script>
  export let assetLabel = 'Publishing asset';
  export let title = '';
  export let summary = '';
  export let market = '';
  export let contractName = '';
  export let contractVersion = '';
</script>

<section class="rounded-[28px] border border-slate-300/70 bg-gradient-to-br from-slate-50 via-stone-50 to-amber-50 px-6 py-8 shadow-sm md:px-10 md:py-10">
  <div class="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-600">
    <span>{assetLabel}</span>
    {#if market}
      <span class="rounded-full border border-slate-300 bg-white px-3 py-1 tracking-[0.18em]">{market}</span>
    {/if}
    {#if contractName && contractVersion}
      <span class="rounded-full border border-amber-300 bg-amber-100/80 px-3 py-1 tracking-[0.12em]">
        {contractName} {contractVersion}
      </span>
    {/if}
  </div>

  <div class="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(260px,0.7fr)]">
    <div class="space-y-4">
      <h1 class="max-w-4xl text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
        {title}
      </h1>
      <p class="max-w-3xl text-base leading-7 text-slate-700 md:text-lg">
        {summary}
      </p>
    </div>

    <div class="grid gap-3 rounded-[24px] border border-slate-200 bg-white/85 p-4 shadow-sm">
      <slot name="heroMetrics" />
    </div>
  </div>
</section>

<div class="mt-8 space-y-8">
  <slot />
</div>
