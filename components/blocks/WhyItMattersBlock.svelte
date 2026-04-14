<script>
  export let title = 'Why It Matters';
  export let text = '';
  export let bullets = [];
</script>

<section class="rounded-[24px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
  <div class="max-w-3xl space-y-4">
    <h2 class="text-2xl font-semibold tracking-tight text-slate-900">{title}</h2>
    <p class="text-base leading-7 text-slate-700">{text}</p>

    {#if bullets.length > 0}
      <ul class="space-y-2 text-sm leading-6 text-slate-700">
        {#each bullets as bullet}
          <li class="flex gap-3">
            <span class="mt-2 h-2 w-2 rounded-full bg-amber-500"></span>
            <span>{bullet}</span>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</section>
