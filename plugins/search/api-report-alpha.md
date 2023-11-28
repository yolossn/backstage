## API Report File for "@backstage/plugin-search"

> Do not edit this file. It is a report generated by [API Extractor](https://api-extractor.com/).

```ts
import { BackstagePlugin } from '@backstage/frontend-plugin-api';
import { ExtensionDefinition } from '@backstage/frontend-plugin-api';
import { RouteRef } from '@backstage/frontend-plugin-api';

// @alpha (undocumented)
const _default: BackstagePlugin<
  {
    root: RouteRef<undefined>;
  },
  {}
>;
export default _default;

// @alpha (undocumented)
export const SearchApi: ExtensionDefinition<{}>;

// @alpha (undocumented)
export const SearchNavItem: ExtensionDefinition<{
  title: string;
}>;

// @alpha (undocumented)
export const SearchPage: ExtensionDefinition<{
  path: string;
  noTrack: boolean;
}>;

// (No @packageDocumentation comment for this package)
```