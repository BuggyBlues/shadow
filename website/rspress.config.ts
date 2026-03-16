import { defineConfig } from 'rspress/config'

const BASE = process.env.DOCS_BASE ?? '/'

export default defineConfig({
  root: 'docs',
  base: BASE,
  title: 'Shadow API',
  description: 'Shadow API Documentation — REST API, WebSocket events, and multi-language SDKs',
  icon: '',
  logo: '',
  lang: 'en',
  locales: [
    {
      lang: 'en',
      label: 'English',
    },
    {
      lang: 'zh',
      label: '中文',
    },
  ],
  themeConfig: {
    socialLinks: [
      { icon: 'github', mode: 'link', content: 'https://github.com/anthropics/shadow' },
    ],
    locales: [
      {
        lang: 'en',
        label: 'English',
        nav: [
          { text: 'Guide', link: '/guide/introduction' },
          { text: 'API Reference', link: '/api/auth' },
        ],
        sidebar: {
          '/guide/': [
            {
              text: 'Getting Started',
              items: [
                { text: 'Introduction', link: '/guide/introduction' },
                { text: 'Authentication', link: '/guide/authentication' },
                { text: 'SDKs', link: '/guide/sdks' },
                { text: 'Errors', link: '/guide/errors' },
              ],
            },
          ],
          '/api/': [
            {
              text: 'Core',
              items: [
                { text: 'Authentication', link: '/api/auth' },
                { text: 'Servers', link: '/api/servers' },
                { text: 'Channels', link: '/api/channels' },
                { text: 'Messages', link: '/api/messages' },
                { text: 'Threads', link: '/api/threads' },
                { text: 'DMs', link: '/api/dms' },
              ],
            },
            {
              text: 'Social',
              items: [
                { text: 'Friendships', link: '/api/friendships' },
                { text: 'Invites', link: '/api/invites' },
                { text: 'Notifications', link: '/api/notifications' },
              ],
            },
            {
              text: 'Agents',
              items: [
                { text: 'Agents', link: '/api/agents' },
                { text: 'Marketplace', link: '/api/marketplace' },
              ],
            },
            {
              text: 'Commerce',
              items: [{ text: 'Shop', link: '/api/shop' }],
            },
            {
              text: 'Platform',
              items: [
                { text: 'OAuth', link: '/api/oauth' },
                { text: 'Apps', link: '/api/apps' },
                { text: 'Workspace', link: '/api/workspace' },
                { text: 'Search', link: '/api/search' },
                { text: 'Media', link: '/api/media' },
                { text: 'Task Center', link: '/api/tasks' },
              ],
            },
            {
              text: 'Real-time',
              items: [{ text: 'WebSocket Events', link: '/api/websocket' }],
            },
          ],
        },
      },
      {
        lang: 'zh',
        label: '中文',
        nav: [
          { text: '指南', link: '/zh/guide/introduction' },
          { text: 'API 参考', link: '/zh/api/auth' },
        ],
        sidebar: {
          '/zh/guide/': [
            {
              text: '快速开始',
              items: [
                { text: '简介', link: '/zh/guide/introduction' },
                { text: '认证', link: '/zh/guide/authentication' },
                { text: 'SDK', link: '/zh/guide/sdks' },
                { text: '错误处理', link: '/zh/guide/errors' },
              ],
            },
          ],
          '/zh/api/': [
            {
              text: '核心',
              items: [
                { text: '认证', link: '/zh/api/auth' },
                { text: '服务器', link: '/zh/api/servers' },
                { text: '频道', link: '/zh/api/channels' },
                { text: '消息', link: '/zh/api/messages' },
                { text: '线程', link: '/zh/api/threads' },
                { text: '私信', link: '/zh/api/dms' },
              ],
            },
            {
              text: '社交',
              items: [
                { text: '好友', link: '/zh/api/friendships' },
                { text: '邀请码', link: '/zh/api/invites' },
                { text: '通知', link: '/zh/api/notifications' },
              ],
            },
            {
              text: 'AI 代理',
              items: [
                { text: '代理', link: '/zh/api/agents' },
                { text: '市场', link: '/zh/api/marketplace' },
              ],
            },
            {
              text: '商业',
              items: [{ text: '商店', link: '/zh/api/shop' }],
            },
            {
              text: '平台',
              items: [
                { text: 'OAuth', link: '/zh/api/oauth' },
                { text: '应用', link: '/zh/api/apps' },
                { text: '工作区', link: '/zh/api/workspace' },
                { text: '搜索', link: '/zh/api/search' },
                { text: '媒体', link: '/zh/api/media' },
                { text: '任务中心', link: '/zh/api/tasks' },
              ],
            },
            {
              text: '实时通信',
              items: [{ text: 'WebSocket 事件', link: '/zh/api/websocket' }],
            },
          ],
        },
      },
    ],
  },
})
