/**
 * Handler context — shared dependencies for all HTTP handlers.
 */

import type { ActivityDao } from '../../../dao/activity.dao.js'
import type { ConfigDao } from '../../../dao/config.dao.js'
import type { DeploymentDao } from '../../../dao/deployment.dao.js'
import type { EnvVarDao } from '../../../dao/envvar.dao.js'
import type { SecretDao } from '../../../dao/secret.dao.js'
import type { TemplateDao } from '../../../dao/template.dao.js'
import type { ServiceContainer } from '../../../services/container.js'

export interface HandlerContext {
  container: ServiceContainer
  templateDao: TemplateDao
  configDao: ConfigDao
  secretDao: SecretDao
  deploymentDao: DeploymentDao
  activityDao: ActivityDao
  envVarDao: EnvVarDao
  namespaces: string[]
}
