## API Report File for "@backstage/plugin-auth-backend-module-google-provider"

> Do not edit this file. It is a report generated by [API Extractor](https://api-extractor.com/).

```ts
import { BackendFeatureCompat } from '@backstage/backend-plugin-api';
import { OAuthAuthenticator } from '@backstage/plugin-auth-node';
import { OAuthAuthenticatorResult } from '@backstage/plugin-auth-node';
import { PassportOAuthAuthenticatorHelper } from '@backstage/plugin-auth-node';
import { PassportProfile } from '@backstage/plugin-auth-node';
import { SignInResolverFactory } from '@backstage/plugin-auth-node';

// @public (undocumented)
const authModuleGoogleProvider: BackendFeatureCompat;
export default authModuleGoogleProvider;

// @public (undocumented)
export const googleAuthenticator: OAuthAuthenticator<
  PassportOAuthAuthenticatorHelper,
  PassportProfile
>;

// @public
export namespace googleSignInResolvers {
  const emailMatchingUserEntityAnnotation: SignInResolverFactory<
    OAuthAuthenticatorResult<PassportProfile>,
    unknown
  >;
}

// (No @packageDocumentation comment for this package)
```