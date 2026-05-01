import { connectorField, connectorManifest } from '../connector-kit.js'
import { defineConnectorPlugin } from '../helpers.js'

const manifest = connectorManifest({
  id: 'taobao-aipaas',
  name: 'Taobao Open Platform / Alibaba AI PAAS',
  description:
    'Taobao Open Platform and Alibaba AI PAAS workflows for ecommerce operations, products, customer service, marketing, shopping guidance, and store workflows.',
  category: 'automation',
  icon: 'store',
  website: 'https://developer.alibaba.com',
  docs: 'https://developer.alibaba.com/docs/doc.htm?articleId=122221&docType=1&treeId=843',
  fields: [
    connectorField('TAOBAO_APP_KEY', 'App key', {
      description: 'Taobao Open Platform app key.',
      sensitive: false,
      placeholder: 'App key',
    }),
    connectorField('TAOBAO_APP_SECRET', 'App secret', {
      description: 'Taobao Open Platform app secret.',
      placeholder: 'App secret',
    }),
    connectorField('TAOBAO_SESSION', 'Session token', {
      description: 'Optional Taobao session token for authorized shop operations.',
      required: false,
      placeholder: 'Session token',
    }),
  ],
  capabilities: ['tool', 'data-source', 'action', 'mcp'],
  tags: ['taobao', 'alibaba', 'aipaas', 'ecommerce', 'products', 'customer-service', 'mcp'],
  popularity: 90,
})

export default defineConnectorPlugin(manifest, {
  prompt:
    'Use Taobao Open Platform / Alibaba AI PAAS for ecommerce operations, product and order workflows, customer-service support, marketing, shopping guidance, and store automation. Confirm write actions before modifying shop, product, customer, or order data.',
})
