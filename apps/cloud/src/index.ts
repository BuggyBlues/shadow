/**
 * @shadowob/cloud SDK entry.
 *
 * CLI bootstrap lives in ./cli.ts so importing this package does not trigger
 * process-level side effects.
 */

export {
  CLOUD_SAAS_RUNTIME_KEY,
  extractCloudSaasRuntime,
  prepareCloudSaasConfigSnapshot,
  redactCloudSaasConfigSnapshot,
  sanitizeCloudSaasDeployment,
  validateCloudSaasConfigSnapshot,
} from './application/cloud-saas-config.js'
export { createCLI } from './interfaces/cli/index.js'
export {
  type AgentCostSummary,
  ClusterService,
  ConfigService,
  type CostOverviewSummary,
  createContainer,
  type DeployFromSnapshotOptions,
  type DeploymentRuntimeCluster,
  DeploymentRuntimeService,
  type DeployOptions,
  type DeployResult,
  DeployService,
  type DestroyRuntimeOptions,
  IMAGES,
  type ImageBuildOptions,
  ImageService,
  K8sService,
  ManifestService,
  type NamespaceCostSummary,
  type ProviderUsageSummary,
  RuntimeService,
  rewriteLoopbackKubeconfig,
  type ServiceContainer,
  type TemplateCatalogDetail,
  type TemplateCatalogResponse,
  type TemplateCatalogSummary,
  type TemplateCategoryId,
  type TemplateCategoryInfo,
  type TemplateDifficulty,
  TemplateI18nService,
  type TemplateMeta,
  TemplateService,
  UsageCostService,
} from './services/container.js'
