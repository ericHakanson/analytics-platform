<script>
  import { LinkButton } from '@evidence-dev/core-components';

  export let title = 'Next Step';
  export let text = '';
  export let buttonLabel = 'Open CTA';
  export let buttonUrl = '';
</script>

<section class="rounded-[24px] border border-amber-300 bg-amber-50 px-6 py-6 shadow-sm">
  <div class="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
    <div class="max-w-3xl space-y-3">
      <h2 class="text-2xl font-semibold tracking-tight text-slate-900">{title}</h2>
      <p class="text-base leading-7 text-slate-700">{text}</p>
    </div>

    <div class="shrink-0">
      <LinkButton url={buttonUrl}>{buttonLabel}</LinkButton>
    </div>
  </div>
</section>
