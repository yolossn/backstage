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
import { MiddlewareFactory } from '@backstage/backend-defaults/rootHttpRouter';
import {
  LoggerService,
  RootConfigService,
} from '@backstage/backend-plugin-api';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { spawn } from 'child_process';
import express from 'express';
import Router from 'express-promise-router';
import yaml from 'js-yaml';
import fs from 'fs';

export interface RouterOptions {
  logger: LoggerService;
  config: RootConfigService;
}

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const { logger, config } = options;

  const router = Router();

  // Get binary path from config

  function getKubeConfig() {
    const kubeconfigs: Kubeconfig[] = [];

    const configClusters = config
      .getConfigArray('kubernetes.clusterLocatorMethods')
      .flatMap(clusterLocatorMethod => {
        const type = clusterLocatorMethod.getString('type');
        console.log('Type:', type, clusterLocatorMethod);
        return type === 'config'
          ? clusterLocatorMethod.getConfigArray('clusters')
          : [];
      });

    configClusters.forEach(cluster => {
      console.log('Cluster:', cluster);
      const kubeconfig = convertClusterToKubeconfig(cluster.data);
      kubeconfigs.push(kubeconfig);
    });

    const combinedYaml = combineKubeconfigs(kubeconfigs);
    console.log('Combined Kubeconfigs:');
    console.log(combinedYaml);
    // write to file
    fs.writeFileSync('kubeconfig.yaml', combinedYaml);
    return combinedYaml;
  }

  getKubeConfig();
  config?.subscribe(() => {
    getKubeConfig();
  });

  const binaryPath = config.getString('headlamp-server.binaryPath');

  // Start the Headlamp Server binary
  const headlampProcess = spawn(binaryPath, [
    '--kubeconfig',
    'kubeconfig.yaml',
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

  logger.info('Creating Headlamp Server router');

  router.use(express.json());

  router.get('/health', (_, response) => {
    logger.info('PONG!');
    response.json({ status: 'ok' });
  });

  router.use(
    '/',
    createProxyMiddleware({
      target: 'http://localhost:4466',
      changeOrigin: true,
      pathRewrite: {
        '^/api/headlamp': '',
      },
      onProxyReq: (proxyReq, req, res) => {
        // You can modify headers or perform other operations here if needed
        console.log(`Proxying request to: ${req.url}`);
      },
    }),
  );

  const middleware = MiddlewareFactory.create({ logger, config });

  router.use(middleware.error());
  return router;
}

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

function convertClusterToKubeconfig(cluster: any): Kubeconfig {
  return {
    apiVersion: 'v1',
    kind: 'Config',
    clusters: [
      {
        name: cluster.name,
        cluster: {
          server: cluster.url,
          'insecure-skip-tls-verify': cluster.skipTLSVerify || false,
          ...(cluster.caData && {
            'certificate-authority-data': cluster.caData,
          }),
          ...(cluster.caFile && { 'certificate-authority': cluster.caFile }),
        },
      },
    ],
    users: [
      {
        name: cluster.name,
        user:
          cluster.authProvider === 'serviceAccount'
            ? { token: cluster.serviceAccountToken }
            : {},
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

  return yaml.dump(combinedConfig);
}
