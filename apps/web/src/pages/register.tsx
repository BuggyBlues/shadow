import { Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchApi } from '../lib/api'
import { getAllCatAvatars, getCatAvatar } from '../lib/pixel-cats'
import { useAuthStore } from '../stores/auth.store'

export function RegisterPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState(getCatAvatar(0))
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const allCats = getAllCatAvatars()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await fetchApi<{
        user: {
          id: string
          email: string
          username: string
          displayName: string | null
          avatarUrl: string | null
        }
        accessToken: string
        refreshToken: string
      }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, username, password, displayName: displayName || undefined }),
      })

      // Set avatar after registration
      try {
        await fetchApi('/api/auth/me', {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${result.accessToken}` },
          body: JSON.stringify({ avatarUrl: selectedAvatar }),
        })
      } catch {
        // Non-critical, continue
      }

      setAuth(
        { ...result.user, avatarUrl: selectedAvatar },
        result.accessToken,
        result.refreshToken,
      )
      navigate({ to: '/app' })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.registerFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-tertiary p-4">
      <div className="w-full max-w-md bg-bg-secondary rounded-2xl p-8 shadow-xl border border-white/5">
        <div className="text-center mb-8">
          <img src="/Logo.svg" alt="Shadow" className="w-12 h-12 mx-auto mb-3" />
          <h1 className="text-3xl font-bold text-text-primary mb-2">{t('auth.registerTitle')}</h1>
          <p className="text-text-muted">{t('auth.registerSubtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Avatar selection */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setShowAvatarPicker(!showAvatarPicker)}
              className="relative group"
            >
              <img
                src={selectedAvatar}
                alt="Avatar"
                className="w-20 h-20 rounded-full bg-bg-tertiary border-2 border-white/10 group-hover:border-primary/50 transition"
              />
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-xs text-white font-bold">
                {t('auth.changeAvatar')}
              </div>
            </button>
          </div>

          {showAvatarPicker && (
            <div className="grid grid-cols-4 gap-2 bg-bg-tertiary rounded-xl p-3">
              {allCats.map((cat) => (
                <button
                  key={cat.index}
                  type="button"
                  onClick={() => {
                    setSelectedAvatar(cat.dataUri)
                    setShowAvatarPicker(false)
                  }}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg transition ${
                    selectedAvatar === cat.dataUri
                      ? 'bg-primary/20 ring-2 ring-primary'
                      : 'hover:bg-white/5'
                  }`}
                >
                  <img src={cat.dataUri} alt={cat.name} className="w-10 h-10 rounded-full" />
                  <span className="text-[10px] text-text-muted">{cat.name}</span>
                </button>
              ))}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase text-text-secondary mb-2">
              {t('auth.emailLabel')}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-bg-tertiary text-text-primary rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-primary transition"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-text-secondary mb-2">
              {t('auth.usernameLabel')}
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full bg-bg-tertiary text-text-primary rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-primary transition"
              placeholder="shadow_user"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-text-secondary mb-2">
              {t('auth.displayNameLabel')}{' '}
              <span className="text-text-muted font-normal">{t('auth.optional')}</span>
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-bg-tertiary text-text-primary rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-primary transition"
              placeholder={t('auth.displayNamePlaceholder')}
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-text-secondary mb-2">
              {t('auth.passwordLabel')}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full bg-bg-tertiary text-text-primary rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-primary transition"
              placeholder={t('auth.passwordPlaceholder')}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3 rounded-lg transition disabled:opacity-50"
          >
            {loading ? t('auth.registerLoading') : t('auth.registerSubmit')}
          </button>
        </form>

        <p className="mt-6 text-center text-text-muted text-sm">
          {t('auth.hasAccount')}{' '}
          <Link to="/login" className="text-primary hover:underline">
            {t('auth.loginLink')}
          </Link>
        </p>
      </div>
    </div>
  )
}
