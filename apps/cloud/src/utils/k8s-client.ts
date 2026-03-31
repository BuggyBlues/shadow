/**
 * Re-export from split clients for backward compatibility.
 * @see ../clients/pulumi-client.ts
 * @see ../clients/kubectl-client.ts
 */

export {
  type DeploymentStatus,
  getDeployments,
  getPods,
  type PodStatus,
  scaleDeployment,
  streamLogs,
} from '../clients/kubectl-client.js'
export {
  deployStack,
  destroyStack,
  getOrCreateStack,
  getStackOutputs,
  type StackOptions,
} from '../clients/pulumi-client.js'
