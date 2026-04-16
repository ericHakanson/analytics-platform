<script>
  import '@evidence-dev/tailwind/fonts.css';
  import '../app.css';
  import { EvidenceDefaultLayout } from '@evidence-dev/core-components';

  export let data;
</script>

<EvidenceDefaultLayout
  {data}
  title="Fort Island Signals"
  builtWithEvidence={false}
  hideSidebar={true}
  maxWidth={1380}
>
  <slot slot="content" />
</EvidenceDefaultLayout>
