/**
 * web-saas router — wraps routes that share pages from @/pages/* (packages/ui)
 * and injects the SaaS API adapter via ApiClientContext.
 *
 * LOCAL-ONLY pages (doctor, validate, config editor, images, runtimes, deploy-tasks)
 * are NOT included — they don't apply in SaaS mode.
 */
import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router'
import React from 'react'
import { ApiClientContext } from '@/lib/api-context'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Layout } from '@/components/Layout'
import { DeploymentNamespacePage } from '@/pages/DeploymentNamespacePage'
import { DeploymentsPage } from '@/pages/DeploymentsPage'
import { DeployWizardPage } from '@/pages/DeployWizardPage'
import { MonitoringPage } from '@/pages/MonitoringPage'
import { MyTemplateDetailPage } from '@/pages/MyTemplateDetailPage'
import { MyTemplatesPage } from '@/pages/MyTemplatesPage'
import { SecretsPage } from '@/pages/SecretsPage'
import { StoreDetailPage } from '@/pages/StoreDetailPage'
import { StorePage } from '@/pages/StorePage'
import { saasApiAdapter } from './api-adapter'

function withErrorBoundary(Page: React.ComponentType) {
  return function WrappedPage() {
    return (
      <ErrorBoundary>
        <Page />
      </ErrorBoundary>
    )
  }
}

const rootRoute = createRootRoute({
  component: () => (
    // Inject SaaS API client — all child pages call useApiClient() to get it
    <ApiClientContext.Provider value={saasApiAdapter}>
      <Layout>
        <Outlet />
      </Layout>
    </ApiClientContext.Provider>
  ),
})

// ── Default redirect ───────────────────────────────────────────────────────

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => { throw redirect({ to: '/store' }) },
})

// ── Template Store ─────────────────────────────────────────────────────────

const storeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/store',
  component: withErrorBoundary(StorePage),
})

const storeDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/store/$name',
  component: withErrorBoundary(StoreDetailPage),
})

const deployWizardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/store/$name/deploy',
  component: withErrorBoundary(DeployWizardPage),
})

// ── My Deployments ─────────────────────────────────────────────────────────

const deploymentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/deployments',
  component: withErrorBoundary(DeploymentsPage),
})

const deploymentNamespaceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/deployments/$namespace',
  component: withErrorBoundary(DeploymentNamespacePage),
})

// ── Monitoring ─────────────────────────────────────────────────────────────

const monitoringRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/monitoring',
  component: withErrorBoundary(MonitoringPage),
})

// ── My Templates ───────────────────────────────────────────────────────────

const myTemplatesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/my-templates',
  component: withErrorBoundary(MyTemplatesPage),
})

const myTemplateDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/my-templates/$name',
  component: withErrorBoundary(MyTemplateDetailPage),
})

// ── Secrets ────────────────────────────────────────────────────────────────

const secretsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/secrets',
  component: withErrorBoundary(SecretsPage),
})

// ── Route tree ─────────────────────────────────────────────────────────────

const routeTree = rootRoute.addChildren([
  indexRoute,
  storeRoute,
  storeDetailRoute,
  deployWizardRoute,
  deploymentsRoute,
  deploymentNamespaceRoute,
  monitoringRoute,
  myTemplatesRoute,
  myTemplateDetailRoute,
  secretsRoute,
])

export const router = createRouter({ routeTree })
