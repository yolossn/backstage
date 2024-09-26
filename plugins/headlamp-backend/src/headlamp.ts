/*
 * Copyright 2024 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { KubernetesBuilder } from '@backstage/plugin-kubernetes-backend';
import { getCombinedClusterSupplier } from './cluster-locator';
import { DispatchStrategy } from '@backstage/plugin-kubernetes-backend';
import { createLogger } from 'winston';
import { Duration } from 'luxon';
import { Config } from '@backstage/config';
import { CatalogClient } from '@backstage/catalog-client';
import { HostDiscovery } from '@backstage/backend-defaults/discovery';
import { AuthMetadata } from '@backstage/plugin-kubernetes-node';
import {
  ANNOTATION_KUBERNETES_OIDC_TOKEN_PROVIDER,
  ANNOTATION_KUBERNETES_AUTH_PROVIDER,
} from '@backstage/plugin-kubernetes-common';
import { KubernetesRequestAuth } from '@backstage/plugin-kubernetes-common';
import { KubernetesCredential } from '@backstage/plugin-kubernetes-node';
import yaml from 'js-yaml';
import { LoggerService } from '@backstage/backend-plugin-api';
import fs from 'fs';
import os from 'os';
import { spawn } from 'child_process';
import path from 'path';

interface KubeconfigCluster {
  name: string;
  cluster: {
    server: string;
    'insecure-skip-tls-verify'?: boolean;
    'certificate-authority-data'?: string;
    'certificate-authority'?: string;
  };
}

interface KubeconfigUser {
  name: string;
  user: {
    'client-certificate-data'?: string;
    'client-key-data'?: string;
    token?: string;
    exec?: {
      apiVersion: string;
      command: string;
      args: string[];
    };
  };
}

interface KubeconfigContext {
  name: string;
  context: {
    cluster: string;
    user: string;
  };
}

interface Kubeconfig {
  apiVersion: string;
  kind: string;
  clusters: KubeconfigCluster[];
  users: KubeconfigUser[];
  contexts: KubeconfigContext[];
  'current-context'?: string;
}

function combineKubeconfigs(kubeconfigs: Kubeconfig[]): string {
  const combinedConfig: Kubeconfig = {
    apiVersion: 'v1',
    kind: 'Config',
    clusters: [],
    users: [],
    contexts: [],
  };

  kubeconfigs.forEach(config => {
    combinedConfig.clusters.push(...config.clusters);
    combinedConfig.users.push(...config.users);
    combinedConfig.contexts.push(...config.contexts);
  });

  // Set the current-context to the first context if available
  if (combinedConfig.contexts.length > 0) {
    combinedConfig['current-context'] = combinedConfig.contexts[0].name;
  }

  return yaml.dump(combinedConfig, {
    lineWidth: -1, // Disable line wrapping
    noRefs: true, // Avoid aliases for repeated nodes
    quotingType: '"', // Use double quotes for strings
  });
}

class ExtendedKubernetesBuilder extends KubernetesBuilder {
  public async listClusterDetails(config: Config): Promise<
    Array<{
      name: string;
      url: string;
      skipTLSVerify: boolean;
      credential: KubernetesCredential;
      caData: string;
    }>
  > {
    const logger = createLogger();
    const duration = Duration.fromObject({
      minutes: 60,
    });

    const clusterSupplier = getCombinedClusterSupplier(
      config,
      new DispatchStrategy({ authStrategyMap: this.getAuthStrategyMap() }),
      logger,
      duration,
    );

    const clusterDetails = await clusterSupplier.getClusters();

    const clusterInfo = clusterDetails.map(async cd => {
      const oidcTokenProvider =
        cd.authMetadata[ANNOTATION_KUBERNETES_OIDC_TOKEN_PROVIDER];
      const authProvider = cd.authMetadata[ANNOTATION_KUBERNETES_AUTH_PROVIDER];
      const strategy = this.getAuthStrategyMap()[authProvider];
      let auth: AuthMetadata = {};
      if (strategy) {
        auth = strategy.presentAuthMetadata(cd.authMetadata);
      }

      const authStrategyMap = this.getAuthStrategyMap();
      const emptyAuth: KubernetesRequestAuth = {};

      const currentAuthStrategy = authStrategyMap[authProvider];

      const currentCredential = await currentAuthStrategy.getCredential(
        cd,
        emptyAuth,
      );

      return {
        name: cd.name,
        url: cd.url,
        skipTLSVerify: cd.skipTLSVerify ?? false,
        title: cd.title,
        caData: cd.caData,
        credential: currentCredential,
        authProvider,
        ...(oidcTokenProvider && { oidcTokenProvider }),
        ...(auth && Object.keys(auth).length !== 0 && { auth }),
      };
    });

    return Promise.all(clusterInfo).then(clusters =>
      clusters.map(cluster => ({
        name: cluster.name,
        url: cluster.url,
        skipTLSVerify: cluster.skipTLSVerify,
        credential: cluster.credential,
        caData: cluster.caData || '',
      })),
    );
  }

  private convertClusterToKubeconfig(cluster: {
    name: string;
    url: string;
    skipTLSVerify: boolean;
    credential: KubernetesCredential;
    caData: string;
  }): Kubeconfig {
    const kubeconfig: Kubeconfig = {
      apiVersion: 'v1',
      kind: 'Config',
      clusters: [
        {
          name: cluster.name,
          cluster: {
            server: cluster.url,
            'insecure-skip-tls-verify': cluster.skipTLSVerify,
            'certificate-authority-data': cluster.caData,
          },
        },
      ],
      users: [
        {
          name: cluster.name,
          user: {},
        },
      ],
      contexts: [
        {
          name: cluster.name,
          context: {
            cluster: cluster.name,
            user: cluster.name,
          },
        },
      ],
      'current-context': cluster.name,
    };

    // Handle different credential types
    switch (cluster.credential.type) {
      case 'bearer token':
        kubeconfig.users[0].user.token = cluster.credential.token;
        break;
      case 'x509 client certificate':
        kubeconfig.users[0].user = {
          'client-certificate-data': cluster.credential.cert,
          'client-key-data': cluster.credential.key,
        };
        break;
      case 'anonymous':
        // No additional configuration needed for anonymous
        break;
      default:
        break;
    }

    return kubeconfig;
  }

  public async getKubeconfig(config: Config): Promise<string> {
    const clusters = await this.listClusterDetails(config);

    const kubeconfigs = clusters.map(cluster =>
      this.convertClusterToKubeconfig(cluster),
    );

    return combineKubeconfigs(kubeconfigs);
  }
}

async function getKubeconfig(
  logger: LoggerService,
  config: Config,
): Promise<string> {
  const discovery = HostDiscovery.fromConfig(config);

  const catalogApi = new CatalogClient({ discoveryApi: discovery });

  // TODO: Fix this
  const permissions = {} as any; // Note: In a real scenario, you'd use a proper PermissionEvaluator

  const kubernetesBuilder = new ExtendedKubernetesBuilder({
    logger,
    config,
    catalogApi,
    discovery,
    permissions,
  });

  return kubernetesBuilder.getKubeconfig(config);
}

export async function spawnHeadlamp(
  logger: LoggerService,
  config: Config,
  binaryPath: string,
) {
  const kubeconfig = await getKubeconfig(logger, config);
  const tempKubeconfigPath = path.join(os.tmpdir(), 'temp_kubeconfig.yaml');

  fs.writeFileSync(tempKubeconfigPath, kubeconfig);

  const headlampProcess = spawn(binaryPath, [
    '--kubeconfig',
    tempKubeconfigPath,
  ]);

  headlampProcess.stdout.on('data', data => {
    logger.info(`Headlamp Server stdout: ${data}`);
  });

  headlampProcess.stderr.on('data', data => {
    logger.error(`Headlamp Server stderr: ${data}`);
  });

  headlampProcess.on('close', code => {
    logger.info(`Headlamp Server process exited with code ${code}`);
  });
}
