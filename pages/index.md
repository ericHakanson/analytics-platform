<script>
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  if (browser) goto('/signals-overview', { replaceState: true });
</script>
