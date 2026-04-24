import {
  type AgentCostSummary,
  type CostOverviewSummary,
  collectNamespaceCost,
  type NamespaceCostSummary,
  type ProviderUsageSummary,
  summarizeCostOverview,
  type UsageCostRuntime,
} from '../application/usage-cost.js'
import type { DeploymentStatus, PodStatus } from '../clients/kubectl-client.js'
import { K8sService } from './k8s.service.js'

export class UsageCostService {
  constructor(private k8s: K8sService) {}

  collectNamespace(namespace: string): NamespaceCostSummary {
    const deployments = this.k8s.getDeployments(namespace)
    const summary = collectNamespaceCost({
      namespace,
      agentNames: deployments.map((deployment) => deployment.name),
      billingAmount: null,
      billingUnit: 'usd',
      runtime: this.getRuntime(),
    })

    const agents = summary.agents.map((agent) => ({
      ...agent,
      billingAmount: agent.totalUsd,
      billingUnit: 'usd' as const,
    }))

    return {
      ...summary,
      billingAmount: summary.totalUsd,
      billingUnit: 'usd',
      agents,
    }
  }

  collectOverview(namespaces: string[]): CostOverviewSummary {
    return summarizeCostOverview(
      namespaces.map((namespace) => this.collectNamespace(namespace)),
      'usd',
    )
  }

  private getRuntime(): UsageCostRuntime {
    return {
      listPods: (namespaceName: string) => this.k8s.getPods(namespaceName) as PodStatus[],
      execInPod: ({ namespace: namespaceName, pod, command }) =>
        this.k8s.execInPod(namespaceName, pod, command),
    }
  }
}

export type {
  AgentCostSummary,
  CostOverviewSummary,
  NamespaceCostSummary,
  ProviderUsageSummary,
} from '../application/usage-cost.js'
