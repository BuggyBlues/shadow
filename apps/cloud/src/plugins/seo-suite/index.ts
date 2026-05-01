import { connectorField, connectorManifest } from '../connector-kit.js'
import { defineConnectorPlugin } from '../helpers.js'

const manifest = connectorManifest({
  id: 'seo-suite',
  name: 'SEO Suite',
  description:
    'SEO and AEO research across Google Search Console, Semrush, and Ahrefs for ranking drops, content gaps, keywords, backlinks, and competitor reports.',
  category: 'search',
  icon: 'search-check',
  website: 'https://developers.google.com/search',
  docs: 'https://developers.google.com/webmaster-tools',
  fields: [
    connectorField('GOOGLE_SEARCH_CONSOLE_SITE_URL', 'Search Console property', {
      description: 'Search Console site URL or sc-domain property.',
      sensitive: false,
      placeholder: 'sc-domain:example.com',
      helpUrl: 'https://developers.google.com/webmaster-tools/v1/how-tos/search_analytics',
    }),
    connectorField('GOOGLE_SEARCH_CONSOLE_CREDENTIALS_JSON', 'Search Console credentials JSON', {
      description: 'Google OAuth or service-account JSON for Search Console APIs.',
      required: false,
      placeholder: '{"type":"service_account","project_id":"..."}',
    }),
    connectorField('SEMRUSH_API_KEY', 'Semrush API key', {
      description: 'Semrush API key for keyword and domain reports.',
      required: false,
      placeholder: 'Semrush API key',
      helpUrl: 'https://developer.semrush.com/api/',
    }),
    connectorField('AHREFS_API_KEY', 'Ahrefs API key', {
      description: 'Ahrefs API token for Site Explorer and keywords data.',
      required: false,
      placeholder: 'Ahrefs API token',
      helpUrl: 'https://docs.ahrefs.com/',
    }),
  ],
  capabilities: ['tool', 'data-source'],
  tags: ['seo', 'aeo', 'gsc', 'semrush', 'ahrefs', 'keywords', 'backlinks'],
  popularity: 95,
})

export default defineConnectorPlugin(manifest, {
  prompt:
    'Use SEO Suite for Search Console diagnostics, ranking drop investigation, keyword and content gap research, backlink review, competitor comparison, and AEO reporting.',
})
