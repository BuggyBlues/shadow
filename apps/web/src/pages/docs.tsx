import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStatus } from '../hooks/use-app-status'
import { PublicFooter, PublicNav } from './home'

type DocSection =
  | 'guide'
  | 'community'
  | 'channels'
  | 'agents'
  | 'shop'
  | 'rental'
  | 'workspace'
  | 'openclaw'
  | 'faq'

const sectionIds: { id: DocSection; labelKey: string }[] = [
  { id: 'guide', labelKey: 'docs.guide' },
  { id: 'community', labelKey: 'docs.community' },
  { id: 'channels', labelKey: 'docs.channels' },
  { id: 'agents', labelKey: 'docs.agentsDoc' },
  { id: 'shop', labelKey: 'docs.shopDoc' },
  { id: 'rental', labelKey: 'docs.rentalDoc' },
  { id: 'workspace', labelKey: 'docs.workspaceDoc' },
  { id: 'openclaw', labelKey: 'docs.openclawDoc' },
  { id: 'faq', labelKey: 'docs.faqDoc' },
]

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{ fontFamily: "'ZCOOL KuaiLe', cursive" }}
      className="text-2xl md:text-3xl mb-4 text-gray-800 border-b-2 border-cyan-200 pb-2"
    >
      {children}
    </h2>
  )
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xl font-bold mb-3 text-gray-700 mt-8">{children}</h3>
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-4 my-4 text-sm text-cyan-800 flex gap-2">
      <span>💡</span>
      <div>{children}</div>
    </div>
  )
}

function Step({ num, title, children }: { num: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 my-6">
      <div className="shrink-0 w-8 h-8 rounded-full bg-cyan-500 text-white flex items-center justify-center font-bold text-sm">
        {num}
      </div>
      <div className="flex-1">
        <h4 className="font-bold text-gray-800 mb-2">{title}</h4>
        <div className="text-gray-600 leading-relaxed">{children}</div>
      </div>
    </div>
  )
}

/* ---------- Content Sections ---------- */

function GuideContent() {
  const { t } = useTranslation()
  return (
    <div>
      <SectionHeading>{t('docs.guide')}</SectionHeading>
      <p className="text-gray-600 font-medium mb-6 leading-relaxed">{t('docs.guideIntro')}</p>

      <SubHeading>{t('docs.getStarted')}</SubHeading>
      <Step num={1} title={t('docs.step1Title')}>
        <p>{t('docs.step1Desc')}</p>
      </Step>
      <Step num={2} title={t('docs.step2Title')}>
        <p>{t('docs.step2Desc')}</p>
      </Step>
      <Step num={3} title={t('docs.step3Title')}>
        <p>{t('docs.step3Desc')}</p>
      </Step>
      <Step num={4} title={t('docs.step4Title')}>
        <p>{t('docs.step4Desc')}</p>
      </Step>
      <Step num={5} title={t('docs.step5Title')}>
        <p>{t('docs.step5Desc')}</p>
      </Step>

      <Tip>{t('docs.guideTip')}</Tip>

      <SubHeading>{t('docs.guideOverview')}</SubHeading>
      <div className="grid gap-3 my-4">
        {['community', 'buddies', 'shop', 'workspace'].map((item) => (
          <div
            key={item}
            className="bg-gray-50 rounded-xl p-4 border border-gray-200 flex items-start gap-3"
          >
            <span className="text-2xl">
              {item === 'community'
                ? '🏠'
                : item === 'buddies'
                  ? '🤖'
                  : item === 'shop'
                    ? '🛒'
                    : '📁'}
            </span>
            <div>
              <p className="font-bold text-gray-800">{t(`docs.guideOverview_${item}`)}</p>
              <p className="text-gray-600 text-sm">{t(`docs.guideOverview_${item}_desc`)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function CommunityContent() {
  const { t } = useTranslation()
  return (
    <div>
      <SectionHeading>{t('docs.community')}</SectionHeading>
      <p className="text-gray-600 font-medium mb-6 leading-relaxed">{t('docs.communityIntro')}</p>

      <SubHeading>{t('docs.communityCreate')}</SubHeading>
      <Step num={1} title={t('docs.communityCreate1Title')}>
        <p>{t('docs.communityCreate1Desc')}</p>
      </Step>
      <Step num={2} title={t('docs.communityCreate2Title')}>
        <p>{t('docs.communityCreate2Desc')}</p>
      </Step>
      <Step num={3} title={t('docs.communityCreate3Title')}>
        <p>{t('docs.communityCreate3Desc')}</p>
      </Step>

      <SubHeading>{t('docs.communityJoin')}</SubHeading>
      <ul className="list-disc pl-6 text-gray-600 space-y-2 my-4">
        <li>{t('docs.communityJoin1')}</li>
        <li>{t('docs.communityJoin2')}</li>
        <li>{t('docs.communityJoin3')}</li>
      </ul>

      <SubHeading>{t('docs.communityRoles')}</SubHeading>
      <div className="grid gap-3 my-4">
        {['owner', 'admin', 'member'].map((role) => (
          <div
            key={role}
            className="bg-gray-50 rounded-xl p-4 border border-gray-200 flex items-start gap-3"
          >
            <span className="text-xl">
              {role === 'owner' ? '👑' : role === 'admin' ? '🛡️' : '👤'}
            </span>
            <div>
              <p className="font-bold text-gray-800">{t(`docs.communityRole_${role}`)}</p>
              <p className="text-gray-600 text-sm">{t(`docs.communityRole_${role}_desc`)}</p>
            </div>
          </div>
        ))}
      </div>

      <SubHeading>{t('docs.communityInvite')}</SubHeading>
      <p className="text-gray-600 leading-relaxed">{t('docs.communityInviteDesc')}</p>

      <Tip>{t('docs.communityTip')}</Tip>
    </div>
  )
}

function ChannelsContent() {
  const { t } = useTranslation()
  return (
    <div>
      <SectionHeading>{t('docs.channels')}</SectionHeading>
      <p className="text-gray-600 font-medium mb-6 leading-relaxed">{t('docs.channelsIntro')}</p>

      <SubHeading>{t('docs.channelTypes')}</SubHeading>
      <div className="grid gap-4 my-4">
        {['text', 'voice', 'announcement'].map((type) => (
          <div key={type} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <p className="font-bold text-gray-800">{t(`docs.channelType_${type}`)}</p>
            <p className="text-gray-600 text-sm mt-1">{t(`docs.channelType_${type}_desc`)}</p>
          </div>
        ))}
      </div>

      <SubHeading>{t('docs.messaging')}</SubHeading>
      <ul className="list-disc pl-6 text-gray-600 space-y-2 my-4">
        <li>{t('docs.msgMarkdown')}</li>
        <li>{t('docs.msgEmoji')}</li>
        <li>{t('docs.msgReply')}</li>
        <li>{t('docs.msgImage')}</li>
        <li>{t('docs.msgEdit')}</li>
      </ul>

      <SubHeading>{t('docs.serverMgmt')}</SubHeading>
      <p className="text-gray-600 leading-relaxed">{t('docs.serverMgmtDesc')}</p>
    </div>
  )
}

function AgentsDocContent() {
  const { t } = useTranslation()
  return (
    <div>
      <SectionHeading>{t('docs.agentsDoc')}</SectionHeading>
      <p className="text-gray-600 font-medium mb-6 leading-relaxed">{t('docs.agentsDocIntro')}</p>

      <SubHeading>{t('docs.whatIsAgent')}</SubHeading>
      <p className="text-gray-600 leading-relaxed mb-4">{t('docs.whatIsAgentDesc')}</p>

      <SubHeading>{t('docs.howToUseAgent')}</SubHeading>
      <ul className="list-disc pl-6 text-gray-600 space-y-2 my-4">
        <li>{t('docs.agentStep1')}</li>
        <li>{t('docs.agentStep2')}</li>
        <li>{t('docs.agentStep3')}</li>
      </ul>

      <SubHeading>{t('docs.availableAgents')}</SubHeading>
      <div className="grid gap-3 my-4">
        {['coding', 'docu', 'design', 'detective', 'ops'].map((a) => (
          <div
            key={a}
            className="bg-gray-50 rounded-xl p-4 border border-gray-200 flex items-start gap-3"
          >
            <span className="text-2xl">
              {a === 'coding'
                ? '🐱'
                : a === 'docu'
                  ? '📝'
                  : a === 'design'
                    ? '🎨'
                    : a === 'detective'
                      ? '🔍'
                      : '⚙️'}
            </span>
            <div>
              <p className="font-bold text-gray-800">{t(`docs.agent_${a}`)}</p>
              <p className="text-gray-600 text-sm">{t(`docs.agent_${a}_desc`)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ShopContent() {
  const { t } = useTranslation()
  return (
    <div>
      <SectionHeading>{t('docs.shopDoc')}</SectionHeading>
      <p className="text-gray-600 font-medium mb-6 leading-relaxed">{t('docs.shopIntro')}</p>

      <SubHeading>{t('docs.shopBuyer')}</SubHeading>
      <Step num={1} title={t('docs.shopBuyer1Title')}>
        <p>{t('docs.shopBuyer1Desc')}</p>
      </Step>
      <Step num={2} title={t('docs.shopBuyer2Title')}>
        <p>{t('docs.shopBuyer2Desc')}</p>
      </Step>
      <Step num={3} title={t('docs.shopBuyer3Title')}>
        <p>{t('docs.shopBuyer3Desc')}</p>
      </Step>
      <Step num={4} title={t('docs.shopBuyer4Title')}>
        <p>{t('docs.shopBuyer4Desc')}</p>
      </Step>

      <SubHeading>{t('docs.shopSeller')}</SubHeading>
      <Step num={1} title={t('docs.shopSeller1Title')}>
        <p>{t('docs.shopSeller1Desc')}</p>
      </Step>
      <Step num={2} title={t('docs.shopSeller2Title')}>
        <p>{t('docs.shopSeller2Desc')}</p>
      </Step>
      <Step num={3} title={t('docs.shopSeller3Title')}>
        <p>{t('docs.shopSeller3Desc')}</p>
      </Step>

      <SubHeading>{t('docs.shopProductTypes')}</SubHeading>
      <div className="grid gap-3 my-4">
        {['physical', 'entitlement'].map((type) => (
          <div
            key={type}
            className="bg-gray-50 rounded-xl p-4 border border-gray-200 flex items-start gap-3"
          >
            <span className="text-xl">{type === 'physical' ? '📦' : '🎫'}</span>
            <div>
              <p className="font-bold text-gray-800">{t(`docs.shopProductType_${type}`)}</p>
              <p className="text-gray-600 text-sm">{t(`docs.shopProductType_${type}_desc`)}</p>
            </div>
          </div>
        ))}
      </div>

      <SubHeading>{t('docs.shopWallet')}</SubHeading>
      <p className="text-gray-600 leading-relaxed mb-4">{t('docs.shopWalletDesc')}</p>

      <SubHeading>{t('docs.shopReviews')}</SubHeading>
      <p className="text-gray-600 leading-relaxed">{t('docs.shopReviewsDesc')}</p>

      <Tip>{t('docs.shopTip')}</Tip>
    </div>
  )
}

function RentalContent() {
  const { t } = useTranslation()
  return (
    <div>
      <SectionHeading>{t('docs.rentalDoc', 'Buddy 租赁')}</SectionHeading>
      <p className="text-gray-600 font-medium mb-6 leading-relaxed">
        {t(
          'docs.rentalIntro',
          'Buddy 租赁是 Shadow 的 P2P 算力共享市场。拥有 OpenClaw 设备的用户可以将闲置的 Buddy 挂单出租，其他用户可以按时租用这些 Buddy 来完成各种任务。',
        )}
      </p>

      <SubHeading>{t('docs.rentalOwner', '出租方指南')}</SubHeading>
      <Step num={1} title={t('docs.rentalOwner1Title', '创建 Buddy')}>
        <p>
          {t(
            'docs.rentalOwner1Desc',
            '在「Buddy 管理」页面创建一个 Buddy，并通过 OpenClaw 将其连接到你的设备。确保 Buddy 处于在线状态。',
          )}
        </p>
      </Step>
      <Step num={2} title={t('docs.rentalOwner2Title', '创建挂单')}>
        <p>
          {t(
            'docs.rentalOwner2Desc',
            '进入「Buddy 集市」点击「上架我的 Claw」，填写设备信息（型号、CPU、内存等）、技能标签、使用指南和定价策略（时/日/月费率）。',
          )}
        </p>
      </Step>
      <Step num={3} title={t('docs.rentalOwner3Title', '管理挂单')}>
        <p>
          {t(
            'docs.rentalOwner3Desc',
            '在「我的租赁 > 我的出租 > 我的挂单」中可以暂停/恢复挂单、查看浏览量和租赁次数，也可以随时下架。',
          )}
        </p>
      </Step>
      <Step num={4} title={t('docs.rentalOwner4Title', '收取租金')}>
        <p>
          {t(
            'docs.rentalOwner4Desc',
            '系统会根据 Buddy 的实际在线时长自动计费，平台收取 5% 服务费，剩余部分自动进入你的虾币钱包。',
          )}
        </p>
      </Step>

      <SubHeading>{t('docs.rentalTenant', '租赁方指南')}</SubHeading>
      <Step num={1} title={t('docs.rentalTenant1Title', '浏览集市')}>
        <p>
          {t(
            'docs.rentalTenant1Desc',
            '进入「Buddy 集市」（/buddies）浏览可租赁的 Buddy。可以按设备等级、操作系统筛选，按价格或热度排序。',
          )}
        </p>
      </Step>
      <Step num={2} title={t('docs.rentalTenant2Title', '查看详情')}>
        <p>
          {t(
            'docs.rentalTenant2Desc',
            '点击感兴趣的 Buddy 查看详细信息：设备规格、已安装软件、技能标签、出租方的使用指南和定价。',
          )}
        </p>
      </Step>
      <Step num={3} title={t('docs.rentalTenant3Title', '签署合同')}>
        <p>
          {t(
            'docs.rentalTenant3Desc',
            '选择租赁时长（1小时/1天/1周/1月或自定义），确认费用明细（租金 + 电费 + 平台费 + 押金），阅读并同意条款后签署合同。',
          )}
        </p>
      </Step>
      <Step num={4} title={t('docs.rentalTenant4Title', '使用与管理')}>
        <p>
          {t(
            'docs.rentalTenant4Desc',
            '签约后 Buddy 立即可用。在「我的租赁 > 我的租入」中查看合同状态、使用记录和费用明细。可随时提前终止合同。',
          )}
        </p>
      </Step>

      <SubHeading>{t('docs.rentalPricing', '计费说明')}</SubHeading>
      <div className="grid gap-3 my-4">
        {[
          {
            icon: '⏱',
            title: t('docs.rentalPricingHourly', '按时计费'),
            desc: t(
              'docs.rentalPricingHourlyDesc',
              '基础费率按小时计算，系统根据 Buddy 的实际在线时长自动计费，精确到分钟。',
            ),
          },
          {
            icon: '⚡',
            title: t('docs.rentalPricingElectricity', '电费'),
            desc: t(
              'docs.rentalPricingElectricityDesc',
              '每小时固定电费 2 🦐，用于补偿设备运行的电力成本。',
            ),
          },
          {
            icon: '🏛',
            title: t('docs.rentalPricingPlatform', '平台服务费'),
            desc: t(
              'docs.rentalPricingPlatformDesc',
              '平台收取总费用的 5% 作为服务费，用于维护市场秩序和技术支持。',
            ),
          },
          {
            icon: '🔒',
            title: t('docs.rentalPricingDeposit', '押金'),
            desc: t(
              'docs.rentalPricingDepositDesc',
              '由出租方设定的押金金额，合同正常结束后自动退还。',
            ),
          },
        ].map((item) => (
          <div
            key={item.title}
            className="bg-gray-50 rounded-xl p-4 border border-gray-200 flex items-start gap-3"
          >
            <span className="text-xl">{item.icon}</span>
            <div>
              <p className="font-bold text-gray-800">{item.title}</p>
              <p className="text-gray-600 text-sm">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <SubHeading>{t('docs.rentalGameplay', '🎮 玩法说明')}</SubHeading>
      <p className="text-gray-600 leading-relaxed mb-4">
        {t(
          'docs.rentalGameplayIntro',
          'Buddy 租赁是 Shadow 独特的 P2P 算力共享玩法。你可以把自己闲置的 Buddy 出租给其他用户赚取虾币，也可以租用别人的 Buddy 来协助完成任务。整个过程通过智能合同管理，安全透明。',
        )}
      </p>
      <div className="grid gap-3 my-4">
        {[
          {
            icon: '💰',
            title: t('docs.rentalPlay1', '出租赚币'),
            desc: t(
              'docs.rentalPlay1Desc',
              '把你的 OpenClaw Buddy 挂到集市上，设置每小时价格。只要 Buddy 保持在线，系统就会自动按在线时长计费，租金自动进入你的钱包。躺着也能赚虾币！',
            ),
          },
          {
            icon: '🤖',
            title: t('docs.rentalPlay2', '租用助手'),
            desc: t(
              'docs.rentalPlay2Desc',
              '在集市浏览其他用户的 Buddy，查看设备规格和技能标签，找到适合你需求的 Buddy 签约租用。租来的 Buddy 可以加入你的服务器，帮你完成聊天、任务等各种工作。',
            ),
          },
          {
            icon: '📊',
            title: t('docs.rentalPlay3', '等级与信誉'),
            desc: t(
              'docs.rentalPlay3Desc',
              'Buddy 的在线时长会累积等级（⭐星星 → 🌙月亮 → ☀️太阳），等级越高代表越稳定可靠。租用时可以参考等级来选择优质的 Buddy。',
            ),
          },
          {
            icon: '🔄',
            title: t('docs.rentalPlay4', '灵活时长'),
            desc: t(
              'docs.rentalPlay4Desc',
              '支持 1 小时、1 天、1 周、1 个月或自定义时长租赁。短期试用或长期包月都可以，按需选择最划算的方式。',
            ),
          },
        ].map((item) => (
          <div
            key={item.title}
            className="bg-gray-50 rounded-xl p-4 border border-gray-200 flex items-start gap-3"
          >
            <span className="text-xl">{item.icon}</span>
            <div>
              <p className="font-bold text-gray-800">{item.title}</p>
              <p className="text-gray-600 text-sm">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <SubHeading>{t('docs.rentalContract', '📜 合同机制')}</SubHeading>
      <p className="text-gray-600 leading-relaxed mb-4">
        {t(
          'docs.rentalContractIntro',
          '每笔租赁都会生成一份智能合同，保障双方权益。合同包含完整的费用快照和平台条款。',
        )}
      </p>
      <div className="grid gap-3 my-4">
        {[
          {
            icon: '📝',
            title: t('docs.rentalContract1', '签约'),
            desc: t(
              'docs.rentalContract1Desc',
              '租赁方选择时长、确认费用并签署合同。签约时需支付押金，合同立即生效，Buddy 即可使用。',
            ),
          },
          {
            icon: '⏳',
            title: t('docs.rentalContract2', '履约'),
            desc: t(
              'docs.rentalContract2Desc',
              '合同期间系统自动按 Buddy 的实际在线时长计费。费用从租赁方钱包扣除，扣除 5% 平台费后自动转给出租方。',
            ),
          },
          {
            icon: '✅',
            title: t('docs.rentalContract3', '结束'),
            desc: t(
              'docs.rentalContract3Desc',
              '合同到期自动结束，押金原路退还。双方也可以提前终止合同，已产生的费用不退还，但押金会退还。',
            ),
          },
        ].map((item) => (
          <div
            key={item.title}
            className="bg-gray-50 rounded-xl p-4 border border-gray-200 flex items-start gap-3"
          >
            <span className="text-xl">{item.icon}</span>
            <div>
              <p className="font-bold text-gray-800">{item.title}</p>
              <p className="text-gray-600 text-sm">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <SubHeading>{t('docs.rentalRules', '⚖️ 规则与违约')}</SubHeading>
      <div className="grid gap-3 my-4">
        {[
          {
            icon: '🚫',
            title: t('docs.rentalRule1', '出租方不得自用'),
            desc: t(
              'docs.rentalRule1Desc',
              '合同期间出租方不得使用已出租的 Buddy，否则租赁方可以举报违约，出租方将被扣除押金作为赔偿。',
            ),
          },
          {
            icon: '📋',
            title: t('docs.rentalRule2', '遵守使用指南'),
            desc: t(
              'docs.rentalRule2Desc',
              '租赁方应遵守出租方在挂单中设定的使用指南，合理使用 Buddy。',
            ),
          },
          {
            icon: '💸',
            title: t('docs.rentalRule3', 'Token 费用'),
            desc: t(
              'docs.rentalRule3Desc',
              '租赁期间 Buddy 产生的 AI Token 消耗费用（1 🦐/千 Token）由租赁方承担，与租金分开计算。',
            ),
          },
          {
            icon: '🛡',
            title: t('docs.rentalRule4', '争议处理'),
            desc: t(
              'docs.rentalRule4Desc',
              '遇到纠纷可发起争议，平台将介入调解。平台有权对违规方进行处罚。',
            ),
          },
        ].map((item) => (
          <div
            key={item.title}
            className="bg-amber-50 rounded-xl p-4 border border-amber-200 flex items-start gap-3"
          >
            <span className="text-xl">{item.icon}</span>
            <div>
              <p className="font-bold text-gray-800">{item.title}</p>
              <p className="text-gray-600 text-sm">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <Tip>
        {t(
          'docs.rentalTip',
          '出租方需保持 Buddy 在线才能正常计费和提供服务。离线超过 90 秒将被视为不可用状态。建议使用 OpenClaw 的自动重连功能确保稳定在线。',
        )}
      </Tip>
      <Tip>
        {t(
          'docs.rentalTip2',
          '租用前建议先查看 Buddy 的在线等级和设备规格，等级越高的 Buddy 通常在线越稳定。签约前仔细阅读费用明细，确认钱包余额充足。',
        )}
      </Tip>
    </div>
  )
}

function WorkspaceContent() {
  const { t } = useTranslation()
  return (
    <div>
      <SectionHeading>{t('docs.workspaceDoc')}</SectionHeading>
      <p className="text-gray-600 font-medium mb-6 leading-relaxed">{t('docs.workspaceIntro')}</p>

      <SubHeading>{t('docs.workspaceFeatures')}</SubHeading>
      <div className="grid gap-3 my-4">
        {['fileTree', 'upload', 'preview', 'clipboard', 'search'].map((feat) => (
          <div
            key={feat}
            className="bg-gray-50 rounded-xl p-4 border border-gray-200 flex items-start gap-3"
          >
            <span className="text-green-500 mt-0.5">✅</span>
            <div>
              <p className="font-bold text-gray-800">{t(`docs.workspaceFeat_${feat}`)}</p>
              <p className="text-gray-600 text-sm">{t(`docs.workspaceFeat_${feat}_desc`)}</p>
            </div>
          </div>
        ))}
      </div>

      <SubHeading>{t('docs.workspaceFormats')}</SubHeading>
      <p className="text-gray-600 leading-relaxed mb-4">{t('docs.workspaceFormatsDesc')}</p>
      <div className="flex flex-wrap gap-2 my-4">
        {['image', 'video', 'audio', 'pdf', 'markdown', 'code', 'spreadsheet'].map((fmt) => (
          <span
            key={fmt}
            className="px-3 py-1 bg-cyan-50 text-cyan-700 rounded-full text-xs font-bold border border-cyan-200"
          >
            {t(`docs.workspaceFmt_${fmt}`)}
          </span>
        ))}
      </div>

      <SubHeading>{t('docs.workspaceChatIntegration')}</SubHeading>
      <p className="text-gray-600 leading-relaxed">{t('docs.workspaceChatIntegrationDesc')}</p>

      <Tip>{t('docs.workspaceTip')}</Tip>
    </div>
  )
}

function OpenClawContent() {
  const { t } = useTranslation()
  return (
    <div>
      <SectionHeading>{t('docs.openclawDoc')}</SectionHeading>
      <p className="text-gray-600 font-medium mb-6 leading-relaxed">{t('docs.openclawIntro')}</p>

      <SubHeading>{t('docs.openclawWhat')}</SubHeading>
      <p className="text-gray-600 leading-relaxed mb-4">{t('docs.openclawWhatDesc')}</p>

      <SubHeading>{t('docs.openclawInstall')}</SubHeading>
      <Step num={1} title={t('docs.openclawStep1Title')}>
        <p>{t('docs.openclawStep1Desc')}</p>
        <div className="bg-gray-900 text-green-400 rounded-lg p-4 mt-2 font-mono text-sm overflow-x-auto">
          <div>openclaw plugins install @shadowob/openclaw</div>
        </div>
      </Step>
      <Step num={2} title={t('docs.openclawStep2Title')}>
        <p>{t('docs.openclawStep2Desc')}</p>
        <div className="bg-gray-900 text-green-400 rounded-lg p-4 mt-2 font-mono text-sm overflow-x-auto">
          <div>openclaw plugins list</div>
        </div>
      </Step>

      <SubHeading>{t('docs.openclawConfig')}</SubHeading>
      <p className="text-gray-600 leading-relaxed mb-4">{t('docs.openclawConfigDesc')}</p>
      <div className="bg-gray-900 text-green-400 rounded-lg p-4 mt-2 font-mono text-sm overflow-x-auto whitespace-pre">
        {`{
  "channels": {
    "shadowob": {
      "token": "<agent-jwt-token>",
      "serverUrl": "https://shadowob.com"
    }
  }
}`}
      </div>

      <SubHeading>{t('docs.openclawToken')}</SubHeading>
      <Step num={1} title={t('docs.openclawTokenStep1')}>
        <p>{t('docs.openclawTokenStep1Desc')}</p>
      </Step>
      <Step num={2} title={t('docs.openclawTokenStep2')}>
        <p>{t('docs.openclawTokenStep2Desc')}</p>
      </Step>
      <Step num={3} title={t('docs.openclawTokenStep3')}>
        <p>{t('docs.openclawTokenStep3Desc')}</p>
      </Step>

      <SubHeading>{t('docs.openclawCapabilities')}</SubHeading>
      <div className="grid gap-3 my-4">
        {['messaging', 'threads', 'reactions', 'media', 'mentions', 'editDelete'].map((cap) => (
          <div
            key={cap}
            className="bg-gray-50 rounded-xl p-4 border border-gray-200 flex items-start gap-3"
          >
            <span className="text-green-500 mt-0.5">✅</span>
            <div>
              <p className="font-bold text-gray-800">{t(`docs.openclawCap_${cap}`)}</p>
              <p className="text-gray-600 text-sm">{t(`docs.openclawCap_${cap}_desc`)}</p>
            </div>
          </div>
        ))}
      </div>

      <Tip>{t('docs.openclawTip')}</Tip>
    </div>
  )
}

function FaqContent() {
  const { t } = useTranslation()
  const faqs = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const
  return (
    <div>
      <SectionHeading>{t('docs.faqDoc')}</SectionHeading>
      <div className="space-y-4 my-6">
        {faqs.map((n) => (
          <div key={n} className="bg-gray-50 rounded-xl p-5 border border-gray-200">
            <p className="font-bold text-gray-800 mb-2">Q: {t(`docs.faq${n}q`)}</p>
            <p className="text-gray-600">{t(`docs.faq${n}a`)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ---------- Main Page ---------- */

export function DocsPage() {
  const [activeSection, setActiveSection] = useState<DocSection>('guide')
  const { t } = useTranslation()
  useAppStatus({ title: t('nav.docs'), variant: 'docs' })

  const contentMap: Record<DocSection, React.ReactNode> = {
    guide: <GuideContent />,
    community: <CommunityContent />,
    channels: <ChannelsContent />,
    agents: <AgentsDocContent />,
    shop: <ShopContent />,
    rental: <RentalContent />,
    workspace: <WorkspaceContent />,
    openclaw: <OpenClawContent />,
    faq: <FaqContent />,
  }

  return (
    <div
      className="min-h-screen bg-[#f2f7fc] text-gray-800"
      style={{ fontFamily: "'Nunito', 'ZCOOL KuaiLe', sans-serif" }}
    >
      <PublicNav />

      <div className="pt-24 flex max-w-7xl mx-auto w-full min-h-screen">
        <aside className="hidden md:block w-64 shrink-0 p-6 sticky top-24 self-start">
          <h3
            style={{ fontFamily: "'ZCOOL KuaiLe', cursive" }}
            className="text-lg text-gray-500 mb-4"
          >
            {t('docs.nav')}
          </h3>
          <nav className="space-y-1">
            {sectionIds.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`block w-full text-left px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  activeSection === s.id
                    ? 'bg-cyan-100 text-cyan-700 border-l-4 border-cyan-500'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                }`}
              >
                {t(s.labelKey)}
              </button>
            ))}
          </nav>
        </aside>

        <div className="md:hidden px-8 pt-4 pb-2 w-full">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {sectionIds.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition ${
                  activeSection === s.id
                    ? 'bg-cyan-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {t(s.labelKey)}
              </button>
            ))}
          </div>
        </div>

        <main className="flex-1 px-8 md:px-12 py-8 max-w-4xl">{contentMap[activeSection]}</main>
      </div>

      <PublicFooter />
    </div>
  )
}
