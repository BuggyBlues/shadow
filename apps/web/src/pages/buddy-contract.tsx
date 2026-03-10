import { Link, useParams, useNavigate } from '@tanstack/react-router'
import { ChevronLeft, Code, FileText, Palette, Search, Wrench } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PublicNav, PublicFooter } from './home'

const buddyData = {
  'codingcat': {
    nameKey: 'buddies.codingCat',
    descKey: 'buddies.codingCatDesc',
    icon: Code,
    color: 'from-cyan-400 to-blue-400',
    number: 'B-001X',
    tags: ['Code', 'Review', 'Debug'],
    duration: '1 Year',
  },
  'documeow': {
    nameKey: 'buddies.docuMeow',
    descKey: 'buddies.docuMeowDesc',
    icon: FileText,
    color: 'from-yellow-400 to-orange-400',
    number: 'B-002D',
    tags: ['Docs', 'Summary', 'API'],
    duration: '1 Year',
  },
  'designcat': {
    nameKey: 'buddies.designCat',
    descKey: 'buddies.designCatDesc',
    icon: Palette,
    color: 'from-pink-400 to-rose-400',
    number: 'B-003U',
    tags: ['UI/UX', 'Colors', 'Visual'],
    duration: '1 Year',
  },
  'detectivecat': {
    nameKey: 'buddies.detectiveCat',
    descKey: 'buddies.detectiveCatDesc',
    icon: Search,
    color: 'from-green-400 to-emerald-400',
    number: 'B-004S',
    tags: ['Debug', 'Logs', 'Analysis'],
    duration: '6 Months',
  },
  'opscat': {
    nameKey: 'buddies.opsCat',
    descKey: 'buddies.opsCatDesc',
    icon: Wrench,
    color: 'from-purple-400 to-violet-400',
    number: 'B-005O',
    tags: ['DevOps', 'Deploy', 'Monitor'],
    duration: '2 Years',
  },
}

export function BuddyContractPage() {
  const { t } = useTranslation()
  const { buddyId } = useParams({ strict: false }) as { buddyId: string }
  const navigate = useNavigate()
  
  const [signed, setSigned] = useState(false)
  const buddyKey = (buddyId || '').toLowerCase()
  const buddy = buddyData[buddyKey as keyof typeof buddyData] || buddyData.codingcat
  
  const Icon = buddy.icon
  
  const today = new Date()
  const endDate = new Date()
  if (buddy.duration.includes('Year')) {
    endDate.setFullYear(today.getFullYear() + parseInt(buddy.duration, 10))
  } else if (buddy.duration.includes('Months')) {
    endDate.setMonth(today.getMonth() + parseInt(buddy.duration, 10))
  }
  
  const formatDate = (date: Date) => date.toLocaleDateString()

  const handleSign = () => {
    setSigned(true)
    setTimeout(() => {
      // Simulate navigate back to the market or onboarding success page
      navigate({ to: '/buddies' })
    }, 2500)
  }

  // Pre-generate random doc number
  const [docNumber] = useState(() => Math.floor(Math.random() * 90000) + 10000)

  return (
    <div
      className="min-h-screen bg-[#f2f7fc] text-gray-800 flex flex-col selection:bg-amber-200"
      style={{ fontFamily: "'Nunito', 'ZCOOL KuaiLe', sans-serif" }}
    >
      <PublicNav />
      
      <main className="flex-1 flex flex-col items-center py-24 px-4 relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-1/4 left-10 w-80 h-80 bg-yellow-300/20 rounded-full blur-3xl -z-10 animate-pulse" />
        <div className="absolute bottom-1/4 right-10 w-96 h-96 bg-cyan-300/20 rounded-full blur-3xl -z-10 animate-pulse" style={{ animationDelay: '1s' }} />

        <Link
          to="/buddies"
          className="self-start md:ml-20 mb-8 inline-flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors font-bold z-10"
        >
          <ChevronLeft className="w-5 h-5" />
          {t('common.back', 'Back')}
        </Link>

        {/* Contract Paper */}
        <div 
          className="relative max-w-3xl w-full bg-[#fdfaf5] rounded-xl shadow-2xl p-8 md:p-16 border border-amber-900/10 animate-fade-in-up"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E")`,
            boxShadow: '0 25px 50px -12px rgba(135, 120, 80, 0.25), 0 0 15px rgba(220, 200, 160, 0.3) inset',
            animation: 'fadeInUp 0.6s ease-out forwards',
          }}
        >
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes fadeInUp {
              from { opacity: 0; transform: translateY(30px) scale(0.98); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes stampIn {
              0% { opacity: 0; transform: scale(3) rotate(-30deg); }
              50% { opacity: 1; transform: scale(0.9) rotate(-15deg); }
              100% { opacity: 0.85; transform: scale(1) rotate(-15deg); }
            }
            @keyframes watermarkFade {
              from { opacity: 0; transform: translate(-50%, -50%) scale(0.8) rotate(-20deg); }
              to { opacity: 0.03; transform: translate(-50%, -50%) scale(1) rotate(-20deg); }
            }
          `}} />

          {/* Paper Watermark */}
          <div 
            className="absolute top-1/2 left-1/2 pointer-events-none select-none -z-0"
            style={{ animation: 'watermarkFade 1s ease-out forwards' }}
          >
            <div className="text-8xl md:text-9xl font-black text-amber-900 uppercase tracking-widest whitespace-nowrap" style={{ fontFamily: "'ZCOOL KuaiLe', cursive" }}>
              SHADOW
            </div>
          </div>

          {/* Paw Stamp Animation */}
          {signed && (
            <div
              className="absolute right-8 md:right-16 bottom-24 pointer-events-none z-20 mix-blend-multiply"
              style={{
                animation: 'stampIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
              }}
            >
              <div className="relative">
                <svg viewBox="0 0 100 100" className="w-40 h-40 text-red-600/90 drop-shadow-sm fill-current" 
                     style={{ filter: 'url(#stamp-texture)' }}>
                  <title>Cat paw stamp</title>
                  <defs>
                    <filter id="stamp-texture">
                      <feTurbulence type="fractalNoise" baseFrequency="0.5" numOctaves="2" result="noise" />
                      <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" />
                    </filter>
                  </defs>
                  <path d="M50 85 C30 85, 20 70, 25 55 C30 40, 45 45, 50 45 C55 45, 70 40, 75 55 C80 70, 70 85, 50 85 Z" />
                  <circle cx="25" cy="40" r="10" />
                  <circle cx="40" cy="25" r="11" />
                  <circle cx="60" cy="25" r="11" />
                  <circle cx="75" cy="40" r="10" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center -rotate-12 mt-12">
                  <span className="text-red-700/90 text-2xl font-bold border-2 border-red-700/90 px-3 py-1 rounded-sm transform -translate-y-4 tracking-widest" style={{ fontFamily: "'ZCOOL KuaiLe', cursive" }}>
                    {t('contract.approved', 'APPROVED')}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="relative z-10">
            {/* Header */}
            <div className="text-center mb-10 border-b-2 border-amber-900/10 pb-8 relative">
              <div className="absolute -top-4 left-0 text-amber-900/20">
                <FileText className="w-16 h-16 transform -rotate-12" />
              </div>
              <h1 
                className="text-4xl md:text-5xl font-bold text-amber-950 mb-3 tracking-wide"
                style={{ fontFamily: "'ZCOOL KuaiLe', cursive" }}
              >
                {t('contract.contractTitle')}
              </h1>
              <p className="text-amber-800/60 font-bold uppercase tracking-[0.2em] text-sm">
                {t('contract.officialDoc')} {docNumber}
              </p>
            </div>

            {/* Intro Text */}
            <p className="text-lg text-amber-900/80 leading-relaxed mb-10 font-medium text-justify">
              {t('contract.introText')}
            </p>

            {/* Buddy Profile */}
            <div className="flex flex-col md:flex-row gap-8 items-center md:items-start bg-white/60 p-6 rounded-2xl border border-amber-900/10 mb-10 shadow-sm backdrop-blur-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-100/50 to-transparent -z-10 rounded-bl-full" />
              
              <div className={`shrink-0 flex items-center justify-center w-28 h-28 rounded-[2rem] bg-gradient-to-br ${buddy.color} shadow-lg ring-4 ring-white/80 group-hover:scale-105 transition-transform duration-500`}>
                {Icon ? <Icon className="w-14 h-14 text-white" /> : <img src="/Logo.svg" alt="Avatar" className="w-14 h-14" />}
              </div>
              
              <div className="flex-1 text-center md:text-left z-10">
                <div className="flex flex-col md:flex-row items-center gap-3 mb-2">
                  <h2 className="text-3xl font-bold text-amber-950" style={{ fontFamily: "'ZCOOL KuaiLe', cursive" }}>
                    {t(buddy.nameKey)}
                  </h2>
                  <span className="bg-amber-100/80 border border-amber-200 text-amber-800 text-xs px-2 py-1 rounded font-bold font-mono">
                    {buddy.number}
                  </span>
                </div>
                <p className="text-amber-900/70 font-medium mb-4 leading-relaxed">
                  {t(buddy.descKey)}
                </p>
                <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                  {buddy.tags.map(tag => (
                    <span key={tag} className="border border-amber-900/15 text-amber-800/80 text-xs px-3 py-1 rounded-full bg-white/60 shadow-sm">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Terms */}
            <div className="space-y-5 mb-14 text-amber-950/80 bg-white/30 p-6 rounded-xl border border-amber-900/5">
              <div className="flex items-center justify-between border-b border-amber-900/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                  <span className="font-bold">{t('contract.effectiveDate')}</span>
                </div>
                <span className="font-mono font-medium px-3 py-1 rounded bg-white/50">{formatDate(today)}</span>
              </div>
              <div className="flex items-center justify-between border-b border-amber-900/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                  <span className="font-bold">{t('contract.expirationDate')}</span>
                </div>
                <span className="font-mono font-medium px-3 py-1 rounded bg-white/50">{formatDate(endDate)}</span>
              </div>
              <div className="flex items-center justify-between border-b border-amber-900/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-400"></div>
                  <span className="font-bold">{t('contract.serviceLevel')}</span>
                </div>
                <span className="font-mono font-bold px-3 py-1 rounded bg-green-50 text-green-700">{t('contract.serviceUnlimited')}</span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
                  <span className="font-bold">{t('contract.compensation')}</span>
                </div>
                <span className="font-mono font-medium px-3 py-1 rounded bg-white/50 italic text-cyan-800">{t('contract.commensationDesc')}</span>
              </div>
            </div>

            {/* Signatures */}
            <div className="mt-16 flex flex-col sm:flex-row justify-between items-end gap-12 sm:gap-8 px-2 md:px-8">
              <div className="w-full sm:w-2/5">
                <div className="border-b-[3px] border-amber-900/30 h-16 flex items-end justify-center pb-2 relative">
                  <span className="font-medium text-amber-900/40 italic text-2xl" style={{ fontFamily: "cursive, 'ZCOOL KuaiLe'" }}>
                    {t('contract.repSignature')}
                  </span>
                </div>
                <p className="text-center text-xs text-amber-900/60 mt-3 uppercase tracking-widest font-semibold">{t('contract.authSignature')}</p>
              </div>
              
              <div className="w-full sm:w-2/5 relative flex flex-col items-center min-h-[4rem]">
                {!signed ? (
                  <button
                    type="button"
                    onClick={handleSign}
                    className="absolute bottom-6 w-full max-w-[200px] bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-lg font-bold py-3 px-6 rounded-full shadow-xl shadow-amber-900/20 hover:shadow-amber-900/30 transition-all transform hover:-translate-y-1 hover:scale-105 active:scale-95 z-30 ring-4 ring-amber-100"
                    style={{ fontFamily: "'ZCOOL KuaiLe', cursive" }}
                  >
                    {t('contract.signBtn')}
                  </button>
                ) : (
                  <div className="border-b-[3px] border-amber-900/30 h-16 w-full flex items-end justify-center pb-2 animate-fade-in-up">
                    <span 
                      className="font-medium text-amber-900 font-serif text-3xl italic drop-shadow-sm text-center w-full"
                    >
                      {t('contract.signedUser')}
                    </span>
                  </div>
                )}
                
                <div className={`${signed ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500 mt-auto`}>
                  <p className="text-center text-xs text-amber-900/60 mt-3 uppercase tracking-widest font-semibold">{t('contract.employerSignature')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
