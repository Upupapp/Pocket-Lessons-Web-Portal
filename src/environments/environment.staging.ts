/**
 * Private staging build (second Netlify site, `staging` branch). scripts/netlify-build.mjs writes the real API
 * address here from the site's POCKET_API_URL setting before building; this placeholder is never deployed.
 */
export const environment = {
  apiUrl: 'https://staging-api.invalid/api/v1',
  stage: 'staging',
};
