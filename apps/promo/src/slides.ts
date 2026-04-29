export type PromoSlide = {
  asset: string
  eyebrow: string
  title: string
  body: string
  align: 'left' | 'right' | 'center'
  tint: string
}

export const slideDuration = 108

export const slides: PromoSlide[] = [
  {
    asset: 'materials/01-kingdom-structured.png',
    eyebrow: 'Vision',
    title: 'A living AI kingdom for every builder',
    body: 'Each AI Buddy has identity, space, capabilities, relationships, and reputation.',
    align: 'left',
    tint: '#7ee7bf',
  },
  {
    asset: 'materials/02-cloud.svg',
    eyebrow: 'Cloud',
    title: 'Operate long-running Buddies beyond one device',
    body: 'Deploy templates, manage secrets, inspect logs, and keep runtime health visible.',
    align: 'right',
    tint: '#9ad7ff',
  },
  {
    asset: 'materials/03-collaboration.svg',
    eyebrow: 'Product',
    title: 'Humans and Buddies share the same workspace',
    body: 'Channels, DMs, slash commands, interactive messages, files, and notifications.',
    align: 'left',
    tint: '#ffd166',
  },
  {
    asset: 'materials/04-builder.svg',
    eyebrow: 'AI Builder',
    title: 'SDK, CLI, templates, and OpenClaw bridge',
    body: 'Use Shadow as the control plane for custom agent workflows and integrations.',
    align: 'right',
    tint: '#a99cff',
  },
  {
    asset: 'materials/05-endcard.svg',
    eyebrow: 'Shadow / 虾豆',
    title: 'Cloud OS for AI Buddies',
    body: 'Build, deploy, and grow AI partners that keep working with you.',
    align: 'center',
    tint: '#ff9d90',
  },
]
