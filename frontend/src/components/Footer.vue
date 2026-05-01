<template>
  <footer class="footer">
    <div class="container">
      <div class="footer-content">
        <div class="footer-brand">
          <div class="brand-info">
            <span class="brand-name">我赢AI</span>
            <span class="brand-slogan">让每个老板都用上AI</span>
          </div>
          <p class="footer-desc">
            实体老板的AI生意军师，围绕行业专版、经营诊断和会员能力，帮老板更快把 AI 用进日常生意。
          </p>
        </div>

        <div class="footer-links">
          <div class="link-group">
            <h4>产品</h4>
            <router-link to="/industries/restaurant">行业专版</router-link>
            <router-link to="/tools">AI工具箱</router-link>
            <router-link to="/diagnosis">企业诊断</router-link>
            <router-link to="/membership">会员服务</router-link>
          </div>

          <div class="link-group">
            <h4>支持</h4>
            <a href="#">使用教程</a>
            <a href="#">常见问题</a>
            <a href="#">联系客服</a>
          </div>

          <div class="link-group">
            <h4>关于</h4>
            <a href="#">关于我们</a>
            <a href="#">隐私政策</a>
            <a href="#">服务条款</a>
          </div>
        </div>
      </div>

      <div class="footer-bottom">
        <p class="copyright">
          &copy; 2026 我赢AI · 实体老板的AI生意军师
        </p>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  background-color: var(--bg-subtle);
  border-top: 1px solid var(--line-default);
  padding: var(--space-8) 0 var(--space-6);
  margin-top: var(--space-9);
}

.footer-content {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: var(--space-8);
  margin-bottom: var(--space-6);
}

.footer-brand {
  max-width: 280px;
}

.brand-info {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}

.brand-name {
  font-size: var(--text-h4);
  font-weight: var(--font-weight-bold);
  color: var(--text-main);
}

.brand-slogan {
  font-size: var(--text-caption);
  color: var(--text-muted);
}

.footer-desc {
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
  line-height: var(--leading-body-sm);
}

.footer-links {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-6);
}

.link-group h4 {
  font-size: var(--text-body-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--text-main);
  margin-bottom: var(--space-3);
}

.link-group a {
  display: block;
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
  margin-bottom: var(--space-2);
  transition: color var(--duration-fast) var(--ease-out);
}

.link-group a:hover {
  color: var(--brand-primary);
}

.footer-bottom {
  padding-top: var(--space-5);
  border-top: 1px solid var(--line-default);
}

.copyright {
  font-size: var(--text-caption);
  color: var(--text-muted);
  text-align: center;
}

@media (max-width: 768px) {
  .footer-content {
    grid-template-columns: 1fr;
    gap: var(--space-6);
  }

  .footer-links {
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-4);
  }
}

@media (max-width: 480px) {
  .footer-links {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
