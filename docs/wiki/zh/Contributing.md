# 参与贡献

感谢你有兴趣为 Shadow 做贡献！本文档提供贡献指南。

## 行为准则

本项目遵循 [Contributor Covenant 行为准则](https://www.contributor-covenant.org/version/2/1/code_of_conduct/)。参与即表示你同意遵守此准则。

## 如何贡献

### 报告 Bug

1. 检查[已有 issues](https://github.com/buggyblues/shadow/issues) 避免重复
2. 创建[新 issue](https://github.com/buggyblues/shadow/issues/new)，包含：
   - 清晰的标题和描述
   - 复现步骤
   - 预期行为 vs 实际行为
   - 环境信息（操作系统、浏览器、Node 版本）

### 功能建议

1. 创建[新 issue](https://github.com/buggyblues/shadow/issues/new) 并添加 `enhancement` 标签
2. 描述功能及其使用场景
3. 在实现前与维护者讨论

### 提交代码

1. **Fork** 仓库
2. **克隆** 你的 fork：
   ```bash
   git clone https://github.com/<your-username>/shadow.git
   cd shadow
   ```
3. **创建** 功能分支：
   ```bash
   git checkout -b feat/my-feature main
   ```
4. **修改** 代码，遵循[开发指南](Development-Guide.md)
5. **测试** 你的修改：
   ```bash
   pnpm lint
   pnpm test
   ```
6. **提交** 使用 [Conventional Commits](https://www.conventionalcommits.org/)：
   ```bash
   git commit -m "feat(web): add voice channel support"
   ```
7. **推送** 到你的 fork：
   ```bash
   git push origin feat/my-feature
   ```
8. **创建** Pull Request，目标分支为 `main`

## Pull Request 指南

- 每个 PR 只包含一个功能/修复
- 为新功能编写测试
- 如需更新文档
- 在所有语言文件中添加 i18n 翻译键
- 确保 Biome 检查通过
- 编写清晰的 PR 描述，说明修改内容和原因

## 开发环境搭建

完整搭建指南请参考[安装指南](Installation.md)。

快速开始：

```bash
pnpm install
docker compose up postgres redis minio -d
pnpm dev
```

## 项目结构

详细结构请参考 [Monorepo 结构](Monorepo-Structure.md)。
