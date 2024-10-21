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
import React, { useState, useEffect, useCallback } from 'react';
import { Progress } from '@backstage/core-components';
import { useNavigate, useLocation } from 'react-router-dom';

interface HeadlampMessage {
  action: string;
  redirectPath: string;
}

export function HeadlampComponent() {
  const [isLoaded, setIsLoaded] = useState(false);
  const refreshInterval = 5000;
  const headlampUrl = 'http://localhost:4466';
  const navigate = useNavigate();
  const location = useLocation();

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

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      // Ensure the message is from the Headlamp origin
      if (event.origin !== new URL(headlampUrl).origin) return;

      const data: HeadlampMessage = event.data;

      if (data.redirectPath) {
        // Navigate to the catalog page for the specific component
        navigate(data.redirectPath);
      }

      // Store the received data
    },
    [headlampUrl, navigate],
  );

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage]);

  if (!isLoaded) {
    return <Progress />;
  }

  // Get query parameters
  const queryParams = new URLSearchParams(location.search).toString();
  const iframeSrc = queryParams ? `${headlampUrl}?${queryParams}` : headlampUrl;

  return (
    <>
      <iframe
        src={iframeSrc}
        title="Headlamp"
        style={{
          width: '100%',
          height: '100vh',
          border: 'none',
        }}
      />
    </>
  );
}
