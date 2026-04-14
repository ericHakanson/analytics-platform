<script>
  export let title = 'Methodology And Caveats';
  export let items = [];
</script>

<section class="rounded-[24px] border border-slate-200 bg-slate-950 px-6 py-6 text-slate-100 shadow-sm">
  <div class="space-y-4">
    <h2 class="text-2xl font-semibold tracking-tight">{title}</h2>
    <ul class="space-y-3 text-sm leading-6 text-slate-200">
      {#each items as item}
        <li class="flex gap-3">
          <span class="mt-2 h-2 w-2 rounded-full bg-amber-400"></span>
          <span>{item}</span>
        </li>
      {/each}
    </ul>
  </div>
</section>
