import { createApp } from './app';
import { env } from './config/env';

const app = createApp();
const port = parseInt(env.PORT, 10);

app.listen(port, () => {
  console.log(`[server] byte API running on http://localhost:${port}`);
  console.log(`[server] SpacetimeDB module: ${env.SPACETIMEDB_MODULE}`);
});
