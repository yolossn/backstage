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
import React, { useState, useEffect } from 'react';
import { Progress } from '@backstage/core-components';

export function HeadlampComponent() {
  const [isLoaded, setIsLoaded] = useState(false);
  const refreshInterval = 5000;
  const headlampUrl = 'http://localhost:4466';

  useEffect(() => {
    const checkHeadlampReady = async () => {
      try {
        const response = await fetch(`${headlampUrl}/config`);
        if (response.ok) {
          setIsLoaded(true);
        } else {
          throw new Error(`Headlamp not ready: ${response.statusText}`);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to check Headlamp readiness:', err);
      }
    };

    if (!isLoaded) {
      checkHeadlampReady();
      const timer = setInterval(checkHeadlampReady, refreshInterval);
      return () => clearInterval(timer);
    }
    return undefined;
  }, [isLoaded, headlampUrl]);

  if (!isLoaded) {
    return <Progress />;
  }

  return (
    <iframe
      src={headlampUrl}
      title="Headlamp"
      style={{
        width: '100%',
        height: '100vh',
        border: 'none',
      }}
    />
  );
}
