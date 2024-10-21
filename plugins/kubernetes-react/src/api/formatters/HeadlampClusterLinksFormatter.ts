/*
 * Copyright 2020 The Backstage Authors
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

import {
  ClusterLinksFormatter,
  ClusterLinksFormatterOptions,
} from '../../types';

/** @public */
export class HeadlampClusterLinksFormatter implements ClusterLinksFormatter {
  async formatClusterLink(options: ClusterLinksFormatterOptions): Promise<URL> {
    const { dashboardUrl, dashboardParameters, object, kind } = options;

    if (!dashboardUrl && !dashboardParameters?.internal) {
      throw new Error(
        'Dashboard URL is required or dashboardInternal must be true',
      );
    }

    const clusterName =
      (dashboardParameters?.clusterName as string) ?? 'default';
    const path = this.getHeadlampPath(kind, object, clusterName);
    if (!path) {
      throw new Error(`Could not find path for kind: ${kind}`);
    }

    let baseUrl: URL;

    if (dashboardParameters?.internal) {
      baseUrl = new URL(window.location.origin);
      baseUrl.pathname =
        (dashboardParameters.headlampRoute as string) || '/headlamp';
    } else {
      if (!dashboardUrl?.href) {
        throw new Error(
          'Dashboard URL is required when not using internal dashboard',
        );
      }
      baseUrl = new URL(dashboardUrl.href);
    }

    baseUrl.searchParams.set('to', path);
    return baseUrl;
  }

  private getHeadlampPath(
    kind: string,
    object: any,
    clusterName: string,
  ): string {
    const lowercaseKind = kind.toLocaleLowerCase('en-US');
    const { name, namespace } = object.metadata ?? {};

    const pathMap: Record<string, string> = {
      namespace: `/c/${clusterName}/namespaces/${name}`,
      node: `/c/${clusterName}/nodes/${name}`,
      persistentvolume: `/c/${clusterName}/storage/persistentvolumes/${name}`,
      persistentvolumeclaim: `/c/${clusterName}/storage/persistentvolumeclaims/${namespace}/${name}`,
      pod: `/c/${clusterName}/pods/${namespace}/${name}`,
      deployment: `/c/${clusterName}/deployments/${namespace}/${name}`,
      replicaset: `/c/${clusterName}/replicasets/${namespace}/${name}`,
      statefulset: `/c/${clusterName}/statefulsets/${namespace}/${name}`,
      daemonset: `/c/${clusterName}/daemonsets/${namespace}/${name}`,
      job: `/c/${clusterName}/jobs/${namespace}/${name}`,
      cronjob: `/c/${clusterName}/cronjobs/${namespace}/${name}`,
      service: `/c/${clusterName}/services/${namespace}/${name}`,
      ingress: `/c/${clusterName}/ingresses/${namespace}/${name}`,
      configmap: `/c/${clusterName}/configmaps/${namespace}/${name}`,
      secret: `/c/${clusterName}/secrets/${namespace}/${name}`,
      serviceaccount: `/c/${clusterName}/serviceaccounts/${namespace}/${name}`,
      role: `/c/${clusterName}/roles/${namespace}/${name}`,
      rolebinding: `/c/${clusterName}/rolebindings/${namespace}/${name}`,
      clusterrole: `/c/${clusterName}/clusterroles/${name}`,
      clusterrolebinding: `/c/${clusterName}/clusterrolebindings/${name}`,
      storageclass: `/c/${clusterName}/storage/storageclasses/${name}`,
      networkpolicy: `/c/${clusterName}/networkpolicies/${namespace}/${name}`,
      horizontalpodautoscaler: `/c/${clusterName}/horizontalpodautoscalers/${namespace}/${name}`,
      poddisruptionbudget: `/c/${clusterName}/poddisruptionbudgets/${namespace}/${name}`,
      customresourcedefinition: `/c/${clusterName}/customresourcedefinitions/${name}`,
    };

    return pathMap[lowercaseKind] ?? '';
  }
}
