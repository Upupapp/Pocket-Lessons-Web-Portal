/**
 * Production build (Netlify). An empty apiUrl keeps the pilot preview: data stays in this browser.
 * Set it to the staging or production API address once that server is live.
 */
export const environment = {
  apiUrl: '',
  /** "staging" shows a ribbon: test accounts only. Empty everywhere else. */
  stage: '',
};
