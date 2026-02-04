# harmonysync-tests

Shared testing types, mocks, and utilities for the HarmonySync monorepo.

Usage:

- Import shared types/mocks/helpers from the `@harmonysync-tests` alias in code and tests:

```ts
import { createTestServiceContext, MockFileSystem } from '@harmonysync-tests';
```

- Run local tests for this package (monorepo deps required):

```bash
pnpm --filter @harmonysync/tests run test:local
```
