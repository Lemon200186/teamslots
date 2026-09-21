# TeamSlots

团队时间协调工具 — 群体涂色对齐空闲时间，自动换算时区，确认后同步 Google 日历并发邮件通知。

## 技术栈

- **Next.js 14**（App Router）+ TypeScript + Tailwind
- **PostgreSQL**，通过 Prisma 访问（推荐 [Supabase](https://supabase.com) 或 [Neon](https://neon.tech)，两者都有免费额度）
- **NextAuth.js**，Google 登录同时获取 Calendar 授权
- **googleapis**，读取 free/busy、写入确认后的日历事件
- **Gmail SMTP**，用发起人自己的 Gmail 账号发确认邮件（免费，能发给任意收件人）

## 本地跑起来

### 1. 准备好三个外部服务

1. **Postgres 数据库**：在 Supabase 或 Neon 建一个免费项目，拿到 `DATABASE_URL`（形如 `postgresql://user:pass@host:5432/db`）。
2. **Google OAuth**：去 [Google Cloud Console](https://console.cloud.google.com) 建一个项目 →
   - 启用 **Google Calendar API**
   - "APIs & Services → OAuth consent screen" 里把自己加为测试用户（应用还没审核之前只有测试用户能登录）
   - "Credentials → Create OAuth client ID"，类型选 Web application，Authorized redirect URI 填：
     `http://localhost:3000/api/auth/callback/google`
   - 拿到 `Client ID` 和 `Client secret`
3. **Gmail 应用专用密码**：Google 账号打开两步验证后，去 [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) 生成一个应用专用密码。免费，且能发给任意收件人（不像 Resend 免费版没自己域名的话只能发给账号主人自己）。

### 2. 配置环境变量

```bash
cp .env.example .env
# 把上一步拿到的值填进去
# NEXTAUTH_SECRET 用 `openssl rand -base64 32` 生成一个随机字符串
```

### 3. 安装依赖、初始化数据库、跑起来

```bash
npm install
npx prisma migrate dev --name init
npm run dev
```

打开 `http://localhost:3000` 即可。

## 部署到 Vercel

1. 把这个项目推到 GitHub，在 Vercel 里 import。
2. 在 Vercel 项目设置里填入和 `.env` 一样的环境变量，`NEXTAUTH_URL` 换成正式域名。
3. 回到 Google Cloud Console，把正式域名的回调地址也加进 Authorized redirect URI：
   `https://你的域名/api/auth/callback/google`
4. 数据库迁移：本地跑 `npx prisma migrate deploy`（指向生产 `DATABASE_URL`），或在 Vercel 的 Build Command 里加上这一步。

## 目录速览

```
src/
  app/
    page.tsx              创建事件（首页，需登录）
    e/[id]/page.tsx        事件涂色页（免登录可参与）
    history/page.tsx       历史记录（需登录）
    api/
      auth/[...nextauth]   NextAuth（Google 登录）
      events                创建事件
      events/[id]           读取事件详情（含"我"的参与记录）
      events/[id]/availability  提交/更新我的空闲时间
      events/[id]/confirm       发起人确认时间 → 触发日历同步 + 邮件
      history                我的历史会议
  components/
    AvailabilityGrid.tsx    核心组件：涂色 / 群组热力图 / 时区切换 / 确认
    Header.tsx
  lib/
    time.ts                 时区换算的核心逻辑（务必先读这个文件）
    auth.ts                  NextAuth 配置（Google + Calendar 授权范围）
    googleCalendar.ts        free/busy 查询、写入确认后的日历事件
    email.ts                 Gmail SMTP 邮件发送 + 模板
    guest.ts                 匿名参与者的 cookie 身份
prisma/schema.prisma          数据模型
```

## 时区是怎么做对的

网格里的每一格只是 `(候选日期, 第几个15分钟格)`，本身没有意义——只有结合"在哪个时区看"才是一个真实的时间点。每个参与者在自己的时区里涂色，提交前换算成 UTC 绝对时间存库；渲染时再把这份 UTC 数据换算回"当前查看者选择的时区"。这样切换时区下拉框时，变化的是热力图里的色块位置，而不是简单地把文字换一下——具体实现在 `src/lib/time.ts` 的注释里写得比较详细，建议改动排期逻辑前先看一遍。

## 已知的 v1 简化 / 后续可以做的

- 匿名参与者的邮箱是可选项，不填就收不到确认邮件——真要上线建议做成必填。
- Google Calendar 冲突检测的 UI 还没接（`lib/googleCalendar.ts` 里的 `getFreeBusyForUser` 已经写好了，`e/[id]` 页面还没调用它做冲突提示）。
- 没有做真正的"团队空间"（固定成员组），符合目前对齐的产品范围。
- 移动端触屏涂色用的是 Pointer Events + `elementFromPoint`，iOS Safari 在极少数情况下对 touch 的隐式指针捕获处理不一致，如果上线前发现拖动偶尔"丢帧"，从这里查起。
- Prisma 的复合唯一键（`eventId_userId` / `eventId_guestId`）在 `availability` 路由里用了一处 `as any` 收敛类型，建议后续拆成两个显式分支让 TypeScript 完全覆盖。
