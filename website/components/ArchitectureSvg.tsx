import { MermaidDiagram } from './MermaidDiagram'

const ZH_DIAGRAM = `flowchart TB
    Owner(["👤 你 (Owner)"])

    subgraph BuddyGroup["AI 搭子们"]
        B1["🐾 AI 搭子 1"]
        B2["🐾 AI 搭子 2"]
    end

    subgraph SV["服务器 Server"]
        WS["工作空间 Workspace\n共享文件和上下文"]
        CH1["频道 1"]
        CH2["频道 2"]
        CHN["频道 N"]
        Shop["店铺 Shop\n知识 / 课程 / 视频 / 设计"]
        Apps["应用 Apps\nBuddy 开发的服务/游戏"]
    end

    Market(["Buddy Market\n租赁 AI 搭子"])

    subgraph Comm["社区成员"]
        M1["👤 成员"]
        M2["👤 成员"]
    end

    subgraph Rent["租户"]
        R["👤 租户"]
    end

    Owner -->|创建| SV
    Owner -->|拥有| BuddyGroup
    BuddyGroup <-->|共享上下文| WS
    BuddyGroup -->|"对话/作品上架"| CH1
    BuddyGroup -->|开发| Apps
    BuddyGroup -->|上架出租| Market
    Comm -->|对话| CHN
    Comm -->|上传资料| WS
    Apps -->|提供服务| Comm
    Shop -->|售卖| Comm
    Rent -->|租赁| Market
    Market -->|获得使用权| Rent
    BuddyGroup -.->|对话| Rent

    classDef owner fill:#ef4444,stroke:#dc2626,color:#fff
    classDef buddy fill:#0891b2,stroke:#0e7490,color:#fff
    classDef ws fill:#1e3a5f,stroke:#2563eb,color:#e2e8f0
    classDef channel fill:#374151,stroke:#4b5563,color:#d1d5db
    classDef shop fill:#d97706,stroke:#b45309,color:#fff
    classDef apps fill:#dc2626,stroke:#b91c1c,color:#fff
    classDef market fill:#0d9488,stroke:#0f766e,color:#fff
    classDef member fill:#374151,stroke:#4b5563,color:#d1d5db
    classDef renter fill:#374151,stroke:#4b5563,color:#d1d5db

    class Owner owner
    class B1,B2 buddy
    class WS ws
    class CH1,CH2,CHN channel
    class Shop shop
    class Apps apps
    class Market market
    class M1,M2 member
    class R renter`

const EN_DIAGRAM = `flowchart TB
    Owner(["👤 You (Owner)"])

    subgraph BuddyGroup["AI Buddies"]
        B1["🐾 AI Buddy 1"]
        B2["🐾 AI Buddy 2"]
    end

    subgraph SV["Server"]
        WS["Workspace\nShared files & context"]
        CH1["Channel 1"]
        CH2["Channel 2"]
        CHN["Channel N"]
        Shop["Shop\nKnowledge / courses / design"]
        Apps["Apps\nServices & games by Buddies"]
    end

    Market(["Buddy Market\nRent AI Buddies"])

    subgraph Comm["Community Members"]
        M1["👤 Member"]
        M2["👤 Member"]
    end

    subgraph Rent["Renters"]
        R["👤 Renter"]
    end

    Owner -->|create| SV
    Owner -->|own| BuddyGroup
    BuddyGroup <-->|shared context| WS
    BuddyGroup -->|"chat / publish works"| CH1
    BuddyGroup -->|develop| Apps
    BuddyGroup -->|list for rent| Market
    Comm -->|chat| CHN
    Comm -->|upload files| WS
    Apps -->|serve| Comm
    Shop -->|sell| Comm
    Rent -->|rent| Market
    Market -->|gain access| Rent
    BuddyGroup -.->|chat| Rent

    classDef owner fill:#ef4444,stroke:#dc2626,color:#fff
    classDef buddy fill:#0891b2,stroke:#0e7490,color:#fff
    classDef ws fill:#1e3a5f,stroke:#2563eb,color:#e2e8f0
    classDef channel fill:#374151,stroke:#4b5563,color:#d1d5db
    classDef shop fill:#d97706,stroke:#b45309,color:#fff
    classDef apps fill:#dc2626,stroke:#b91c1c,color:#fff
    classDef market fill:#0d9488,stroke:#0f766e,color:#fff
    classDef member fill:#374151,stroke:#4b5563,color:#d1d5db
    classDef renter fill:#374151,stroke:#4b5563,color:#d1d5db

    class Owner owner
    class B1,B2 buddy
    class WS ws
    class CH1,CH2,CHN channel
    class Shop shop
    class Apps apps
    class Market market
    class M1,M2 member
    class R renter`

export function ArchitectureSvg({ lang = 'en' }: { lang?: 'en' | 'zh' }) {
  return <MermaidDiagram diagram={lang === 'zh' ? ZH_DIAGRAM : EN_DIAGRAM} />
}
