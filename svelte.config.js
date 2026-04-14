import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default {
  kit: {
    alias: {
      $content: path.join(rootDir, 'content')
    }
  }
};
