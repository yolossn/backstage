## API Report File for "@backstage/plugin-search-backend-module-catalog"

> Do not edit this file. It is a report generated by [API Extractor](https://api-extractor.com/).

```ts
/// <reference types="node" />

import { AuthService } from '@backstage/backend-plugin-api';
import { CatalogApi } from '@backstage/catalog-client';
import { CatalogEntityDocument } from '@backstage/plugin-catalog-common';
import { Config } from '@backstage/config';
import { DocumentCollatorFactory } from '@backstage/plugin-search-common';
import { Entity } from '@backstage/catalog-model';
import { GetEntitiesRequest } from '@backstage/catalog-client';
import { Permission } from '@backstage/plugin-permission-common';
import { PluginEndpointDiscovery } from '@backstage/backend-common';
import { Readable } from 'stream';
import { TokenManager } from '@backstage/backend-common';

// @public (undocumented)
export type CatalogCollatorEntityTransformer = (
  entity: Entity,
) => Omit<CatalogEntityDocument, 'location' | 'authorization'>;

// @public (undocumented)
export const defaultCatalogCollatorEntityTransformer: CatalogCollatorEntityTransformer;

// @public
export class DefaultCatalogCollatorFactory implements DocumentCollatorFactory {
  // (undocumented)
  static fromConfig(
    configRoot: Config,
    options: DefaultCatalogCollatorFactoryOptions,
  ): DefaultCatalogCollatorFactory;
  // (undocumented)
  getCollator(): Promise<Readable>;
  // (undocumented)
  readonly type = 'software-catalog';
  // (undocumented)
  readonly visibilityPermission: Permission;
}

// @public (undocumented)
export type DefaultCatalogCollatorFactoryOptions = {
  auth?: AuthService;
  discovery: PluginEndpointDiscovery;
  tokenManager?: TokenManager;
  locationTemplate?: string;
  filter?: GetEntitiesRequest['filter'];
  batchSize?: number;
  catalogClient?: CatalogApi;
  entityTransformer?: CatalogCollatorEntityTransformer;
};
```