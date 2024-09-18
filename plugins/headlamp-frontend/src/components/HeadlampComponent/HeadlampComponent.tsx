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
import React from 'react';
import { Typography, Grid } from '@material-ui/core';
import {
  InfoCard,
  Header,
  Page,
  Content,
  ContentHeader,
  HeaderLabel,
  SupportButton,
} from '@backstage/core-components';
import { useApi, configApiRef } from '@backstage/core-plugin-api';
import { kubernetesApiRef } from '@backstage/plugin-kubernetes';

export function HeadlampComponent() {
  // const config = useApi(configApiRef);
  // const kubernetesApi = useApi(kubernetesApiRef);

  // const clusters = kubernetesApi.getClusters()
  // eslint-disable-next-line no-console
  // console.log("Clusters:", clusters);
  // const headlampUrl = config.getString('headlamp.serverUrl')
  // eslint-disable-next-line no-console
  // console.log("Headlamp URL:", headlampUrl);

  return (
    <iframe
      // src={`${headlampUrl}`}
      src="http://localhost:4466/"
      title="Headlamp"
      style={{
        width: '100%',
        height: '100vh',
        border: 'none',
      }}
    />
  );
}
