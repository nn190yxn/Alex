<?php
/*
Template Name: 制度标准
*/

add_filter('show_admin_bar', '__return_false');

$logo_url = esc_url(home_url('/玻璃贴-14.png'));
$parent_category = get_term_by('slug', '制度标准', 'category');
if (!$parent_category) {
    $parent_category = get_term_by('name', '制度标准', 'category');
}

$ordered_category_names = array(
    '总纲与原则',
    '门店运营标准',
    '服务标准',
    '教学标准',
    '人员管理',
    '店长管理机制',
    '业绩管理',
    '品牌标准',
);

$child_categories = get_categories(
    array(
        'parent' => $parent_category ? $parent_category->term_id : 0,
        'hide_empty' => false,
    )
);

$ordered_groups = array();
$posts_by_group_name = array();
foreach ($ordered_category_names as $category_name) {
    foreach ($child_categories as $category) {
        if ($category->name !== $category_name) {
            continue;
        }

        $posts = get_posts(
            array(
                'numberposts' => -1,
                'category' => $category->term_id,
                'orderby' => 'title',
                'order' => 'ASC',
            )
        );

        $ordered_groups[] = array(
            'name' => $category->name,
            'count' => count($posts),
            'posts' => $posts,
        );
        $posts_by_group_name[$category->name] = $posts;
    }
}

$group_picker = static function (array $group_names) use ($posts_by_group_name) {
    $picked = array();
    foreach ($group_names as $group_name) {
        if (!isset($posts_by_group_name[$group_name]) || !$posts_by_group_name[$group_name]) {
            continue;
        }

        $picked[] = array(
            'name' => $group_name,
            'posts' => $posts_by_group_name[$group_name],
        );
    }

    return $picked;
};

$role_sections = array(
    array(
        'id' => 'role-manager',
        'title' => '店长制度列表',
        'eyebrow' => '角色制度清单',
        'desc' => '围绕店长日常经营闭环，先看店长管理机制，再补门店运营和业绩规则。',
        'group_names' => array('店长管理机制', '门店运营标准', '业绩管理'),
    ),
    array(
        'id' => 'role-coach',
        'title' => '教练制度列表',
        'eyebrow' => '角色制度清单',
        'desc' => '围绕上课、教学、课堂反馈和专业成长，集中看教学与服务相关制度。',
        'group_names' => array('教学标准', '服务标准', '人员管理'),
    ),
    array(
        'id' => 'role-consultant',
        'title' => '顾问制度列表',
        'eyebrow' => '角色制度清单',
        'desc' => '围绕接待、签单、续费与家长沟通，先看服务标准，再补运营与业绩制度。',
        'group_names' => array('服务标准', '门店运营标准', '业绩管理'),
    ),
    array(
        'id' => 'role-director',
        'title' => '督导 / 总经理制度列表',
        'eyebrow' => '角色制度清单',
        'desc' => '围绕经营节奏、复盘验收和跨门店监督，优先看总纲、店长机制、品牌和业绩制度。',
        'group_names' => array('总纲与原则', '店长管理机制', '业绩管理', '品牌标准'),
    ),
);

$workflow_sections = array(
    array(
        'id' => 'flow-operation',
        'title' => '门店基础运营链',
        'eyebrow' => '工作流制度清单',
        'desc' => '聚合开关店、课前课后、卫生安全和门店运营执行标准。',
        'group_names' => array('门店运营标准', '品牌标准'),
    ),
    array(
        'id' => 'flow-service',
        'title' => '会员服务主链',
        'eyebrow' => '工作流制度清单',
        'desc' => '聚合新客接待、家长沟通、投诉处理和续费服务相关制度。',
        'group_names' => array('服务标准', '业绩管理'),
    ),
    array(
        'id' => 'flow-training',
        'title' => '教学与上岗链',
        'eyebrow' => '工作流制度清单',
        'desc' => '聚合教学执行、带教、抽测验收和岗位成长相关制度。',
        'group_names' => array('教学标准', '人员管理'),
    ),
);

$role_cards = array(
    array('title' => '店长入口', 'desc' => '进入店长专属制度清单，再点进具体正文。', 'url' => '#role-manager'),
    array('title' => '教练入口', 'desc' => '进入教练制度清单，集中看教学与课堂执行标准。', 'url' => '#role-coach'),
    array('title' => '顾问入口', 'desc' => '进入顾问制度清单，集中看接待、沟通与续费规则。', 'url' => '#role-consultant'),
    array('title' => '督导 / 总经理入口', 'desc' => '进入经营监督制度清单，查看总纲、复盘和经营机制。', 'url' => '#role-director'),
);

$workflow_cards = array(
    array('title' => '门店基础运营链', 'desc' => '先看运营链路，再进具体制度。', 'url' => '#flow-operation'),
    array('title' => '会员服务主链', 'desc' => '先看服务链路，再进具体制度。', 'url' => '#flow-service'),
    array('title' => '教学与上岗链', 'desc' => '先看培训与教学链路，再进具体制度。', 'url' => '#flow-training'),
);

$featured_titles = array(
    '追光小牛连锁运营体系_总纲',
    '门店运营标准体系',
    '服务标准体系',
    '教学标准体系',
    '人员管理体系',
    '店长管理机制',
);

$featured_posts = array();
foreach ($featured_titles as $title) {
    $post = get_page_by_title($title, OBJECT, 'post');
    if ($post) {
        $featured_posts[] = $post;
    }
}

$total_posts = 0;
foreach ($ordered_groups as $group) {
    $total_posts += count($group['posts']);
}
?>
<!doctype html>
<html <?php language_attributes(); ?>>
  <head>
    <meta charset="<?php bloginfo('charset'); ?>" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <?php wp_head(); ?>
    <style>
      :root {
        --brand-orange: #ff6b35;
        --brand-orange-deep: #e85a28;
        --brand-ink: #1f1a17;
        --brand-muted: #6b625c;
        --panel-shadow: rgba(0, 0, 0, 0.06) 0px 14px 36px, rgba(0, 0, 0, 0.03) 0px 4px 12px;
      }
      * { box-sizing: border-box; }
      html { scroll-behavior: smooth; margin-top: 0 !important; }
      body {
        margin: 0;
        font-family: Inter, -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
        color: var(--brand-ink);
        background: linear-gradient(180deg, #fffaf6 0%, #fff 30%, #fdfaf7 100%);
      }
      #wpadminbar { display: none !important; }
      a { color: inherit; text-decoration: none; }
      .shell { width: min(calc(100% - 32px), 1180px); margin: 0 auto; }
      .site-header { position: sticky; top: 0; z-index: 1000; background: rgba(255, 251, 248, 0.86); backdrop-filter: blur(18px); border-bottom: 1px solid rgba(31, 26, 23, 0.06); }
      .topbar { min-height: 76px; display: flex; align-items: center; justify-content: space-between; gap: 24px; }
      .brand { display: inline-flex; align-items: center; gap: 12px; font-weight: 700; }
      .brand img { width: 42px; height: 42px; object-fit: contain; }
      .nav { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; }
      .nav a { padding: 9px 12px; border-radius: 10px; font-size: 14px; color: var(--brand-muted); }
      .nav a:hover, .nav a.current { background: rgba(255, 107, 53, 0.1); color: var(--brand-orange); }
      .staff-link { background: rgba(255, 107, 53, 0.1); color: var(--brand-orange) !important; font-weight: 600; }
      .hero { padding: 34px 0 18px; }
      .hero-card, .entry-card, .detail-card, .section-card, .group-card, .post-link-card, .post-item, .overview-card {
        border: 1px solid rgba(31, 26, 23, 0.08); background: rgba(255, 255, 255, 0.94); border-radius: 22px; box-shadow: var(--panel-shadow);
      }
      .hero-card {
        padding: 28px; display: grid; grid-template-columns: 1.12fr 0.88fr; gap: 20px;
        background: radial-gradient(circle at top right, rgba(255, 107, 53, 0.16), transparent 26%), linear-gradient(160deg, #fff4ec 0%, #fffdfa 58%, #ffffff 100%);
      }
      .eyebrow { display: inline-block; font-size: 12px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: #9e9289; }
      h1, h2, h3 { margin: 10px 0 0; letter-spacing: -0.04em; }
      h1 { font-size: clamp(32px, 4.8vw, 48px); line-height: 1.06; }
      h2 { font-size: clamp(24px, 3vw, 30px); line-height: 1.14; }
      h3 { font-size: 18px; line-height: 1.3; }
      p { color: var(--brand-muted); line-height: 1.85; }
      .hero-stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; align-self: end; }
      .stat-card { padding: 18px; border-radius: 18px; background: rgba(255, 255, 255, 0.84); border: 1px solid rgba(31, 26, 23, 0.06); }
      .stat-card strong { display: block; margin-top: 8px; font-size: 26px; }
      .section { padding: 14px 0 72px; }
      .section-title { margin-bottom: 14px; }
      .entry-grid, .post-grid, .detail-grid, .detail-post-grid, .overview-strip { display: grid; gap: 16px; }
      .overview-strip { grid-template-columns: repeat(3, minmax(0, 1fr)); margin-bottom: 18px; }
      .overview-card { padding: 20px; }
      .entry-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); margin-bottom: 18px; }
      .entry-card { padding: 22px; transition: transform 0.18s ease, box-shadow 0.18s ease; }
      .entry-card:hover, .post-link-card:hover, .post-item:hover { transform: translateY(-2px); box-shadow: rgba(0, 0, 0, 0.08) 0px 18px 40px, rgba(0, 0, 0, 0.03) 0px 4px 12px; }
      .section-anchor { scroll-margin-top: 96px; }
      .detail-grid { margin: 22px 0; }
      .detail-card { padding: 24px; }
      .detail-header { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 18px; }
      .detail-header a { color: var(--brand-orange); font-size: 13px; font-weight: 700; }
      .detail-post-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .post-item { padding: 18px; background: #fffaf7; }
      .post-item p { margin-top: 8px; }
      .search-box { margin: 22px 0 16px; }
      .search-box input { width: 100%; border: 1px solid rgba(0, 0, 0, 0.08); border-radius: 14px; padding: 14px 16px; font-size: 14px; }
      .featured-strip { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin-bottom: 18px; }
      .post-link-card { padding: 20px; transition: transform 0.18s ease, box-shadow 0.18s ease; }
      .post-link-card small { display: block; margin-top: 6px; color: #9e9289; }
      .groups-stack { display: grid; gap: 14px; }
      .group-card { overflow: hidden; }
      .group-header { width: 100%; border: 0; background: transparent; padding: 20px 22px; display: flex; align-items: center; justify-content: space-between; gap: 16px; text-align: left; cursor: pointer; }
      .group-left { display: flex; align-items: center; gap: 12px; }
      .group-count { min-width: 30px; height: 30px; border-radius: 9999px; display: inline-flex; align-items: center; justify-content: center; background: rgba(255, 107, 53, 0.1); color: var(--brand-orange); font-size: 13px; font-weight: 700; }
      .group-toggle { color: #a39e98; font-size: 14px; transition: transform 0.2s ease; }
      .group-card.collapsed .group-toggle { transform: rotate(-90deg); }
      .group-body { padding: 0 18px 18px; }
      .group-card.collapsed .group-body { display: none; }
      .post-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .open-link { display: inline-flex; margin-top: 14px; color: var(--brand-orange); font-size: 13px; font-weight: 700; }
      .site-footer { padding: 28px 0 40px; border-top: 1px solid rgba(31, 26, 23, 0.08); }
      .site-footer p { margin: 0; text-align: center; color: var(--brand-muted); }
      [hidden] { display: none !important; }
      @media (max-width: 980px) {
        .hero-card, .overview-strip, .entry-grid, .featured-strip, .post-grid, .detail-post-grid { grid-template-columns: 1fr; }
      }
      @media (max-width: 760px) {
        .topbar { align-items: flex-start; flex-direction: column; padding: 12px 0; }
        .nav { justify-content: flex-start; }
        .detail-header { flex-direction: column; }
      }
    </style>
  </head>
  <body <?php body_class(); ?>>
    <?php wp_body_open(); ?>
    <header class="site-header">
      <div class="shell topbar">
        <a class="brand" href="<?php echo esc_url(home_url('/')); ?>">
          <img src="<?php echo $logo_url; ?>" alt="追光小牛 logo" />
          <span>追光小牛</span>
        </a>
        <nav class="nav">
          <a href="<?php echo esc_url(home_url('/internal.html')); ?>">员工首页</a>
          <a href="<?php echo esc_url(home_url('/表格中心/')); ?>">表格中心</a>
          <a class="current" href="<?php echo esc_url(home_url('/制度标准/')); ?>">制度中心</a>
          <a href="<?php echo esc_url(home_url('/知识库/')); ?>">知识库</a>
          <a href="<?php echo esc_url(home_url('/新员工学习/')); ?>">员工学习中心</a>
          <a href="<?php echo esc_url(home_url('/fitness-assessment.html')); ?>">智能运动规划</a>
          <a href="<?php echo esc_url(home_url('/smart-lessons.html')); ?>">智能教案</a>
          <a class="staff-link" href="<?php echo esc_url(home_url('/')); ?>">返回官网</a>
        </nav>
      </div>
    </header>

    <main>
      <section class="hero">
        <div class="shell hero-card">
          <div>
            <span class="eyebrow">员工内网 / 制度中心</span>
            <h1>先按角色或工作流进入，再进入第二层制度列表，再点进正文。</h1>
            <p>我把制度中心从单一跳转页升级成两层入口结构。员工先选自己的角色或当前工作链路，再在第二层制度清单里找到具体文章，路径更符合日常使用方式。</p>
          </div>
          <div class="hero-stats">
            <article class="stat-card">
              <span class="eyebrow">制度分类</span>
              <strong><?php echo esc_html((string) count($ordered_groups)); ?></strong>
              <p>围绕当前八大制度模块统一组织。</p>
            </article>
            <article class="stat-card">
              <span class="eyebrow">制度文章</span>
              <strong><?php echo esc_html((string) $total_posts); ?></strong>
              <p>全部基于现有 WordPress 文章动态生成。</p>
            </article>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="shell">
          <div class="overview-strip">
            <article class="overview-card">
              <span class="eyebrow">页面定位</span>
              <h3>制度中心负责规则边界</h3>
              <p>制度中心只做规则入口和制度正文分发，和知识经验、学习任务、表格下载保持分工清晰。</p>
            </article>
            <article class="overview-card">
              <span class="eyebrow">进入顺序</span>
              <h3>角色 / 工作流 -> 搜索 -> 正文</h3>
              <p>先按角色或工作流进入，再用搜索和分类清单下钻到具体制度正文，路径尽量贴近日常使用顺序。</p>
            </article>
            <article class="overview-card">
              <span class="eyebrow">当前收口</span>
              <h3>双入口与分类列表并存</h3>
              <p>制度页既保留高频入口，也保留完整分类清单，既适合快速进入，也适合系统查阅。</p>
            </article>
          </div>

          <div class="section-title">
            <span class="eyebrow">先选入口</span>
            <h2>按角色进入</h2>
          </div>
          <div class="entry-grid">
            <?php foreach ($role_cards as $item) : ?>
              <a class="entry-card" href="<?php echo esc_attr($item['url']); ?>">
                <span class="eyebrow">角色入口</span>
                <h3><?php echo esc_html($item['title']); ?></h3>
                <p><?php echo esc_html($item['desc']); ?></p>
              </a>
            <?php endforeach; ?>
          </div>

          <div class="section-title">
            <span class="eyebrow">再按工作链路进入</span>
            <h2>按工作流进入</h2>
          </div>
          <div class="entry-grid">
            <?php foreach ($workflow_cards as $item) : ?>
              <a class="entry-card" href="<?php echo esc_attr($item['url']); ?>">
                <span class="eyebrow">工作流入口</span>
                <h3><?php echo esc_html($item['title']); ?></h3>
                <p><?php echo esc_html($item['desc']); ?></p>
              </a>
            <?php endforeach; ?>
          </div>

          <div class="section-title">
            <span class="eyebrow">第二层角色制度列表</span>
            <h2>先进入角色制度清单，再点具体正文</h2>
          </div>
          <div class="detail-grid">
            <?php foreach ($role_sections as $section) : ?>
              <?php $picked_groups = $group_picker($section['group_names']); ?>
              <section id="<?php echo esc_attr($section['id']); ?>" class="detail-card section-anchor" data-detail-group>
                <div class="detail-header">
                  <div>
                    <span class="eyebrow"><?php echo esc_html($section['eyebrow']); ?></span>
                    <h2><?php echo esc_html($section['title']); ?></h2>
                    <p><?php echo esc_html($section['desc']); ?></p>
                  </div>
                  <a href="#policySearch">搜索制度</a>
                </div>
                <?php foreach ($picked_groups as $group) : ?>
                  <div class="section-title">
                    <span class="eyebrow">制度分类</span>
                    <h3><?php echo esc_html($group['name']); ?></h3>
                  </div>
                  <div class="detail-post-grid">
                    <?php foreach ($group['posts'] as $post_item) : ?>
                      <article class="post-item" data-item data-name="<?php echo esc_attr($post_item->post_title); ?>">
                        <span class="eyebrow">制度正文</span>
                        <h3><?php echo esc_html($post_item->post_title); ?></h3>
                        <p><?php echo esc_html(wp_trim_words(wp_strip_all_tags($post_item->post_content), 24)); ?></p>
                        <a class="open-link" href="<?php echo esc_url(get_permalink($post_item->ID)); ?>">进入阅读</a>
                      </article>
                    <?php endforeach; ?>
                  </div>
                <?php endforeach; ?>
              </section>
            <?php endforeach; ?>
          </div>

          <div class="section-title">
            <span class="eyebrow">第二层工作流制度列表</span>
            <h2>工作链路也有单独制度清单</h2>
          </div>
          <div class="detail-grid">
            <?php foreach ($workflow_sections as $section) : ?>
              <?php $picked_groups = $group_picker($section['group_names']); ?>
              <section id="<?php echo esc_attr($section['id']); ?>" class="detail-card section-anchor" data-detail-group>
                <div class="detail-header">
                  <div>
                    <span class="eyebrow"><?php echo esc_html($section['eyebrow']); ?></span>
                    <h2><?php echo esc_html($section['title']); ?></h2>
                    <p><?php echo esc_html($section['desc']); ?></p>
                  </div>
                  <a href="#policySearch">搜索制度</a>
                </div>
                <?php foreach ($picked_groups as $group) : ?>
                  <div class="section-title">
                    <span class="eyebrow">制度分类</span>
                    <h3><?php echo esc_html($group['name']); ?></h3>
                  </div>
                  <div class="detail-post-grid">
                    <?php foreach ($group['posts'] as $post_item) : ?>
                      <article class="post-item" data-item data-name="<?php echo esc_attr($post_item->post_title); ?>">
                        <span class="eyebrow">制度正文</span>
                        <h3><?php echo esc_html($post_item->post_title); ?></h3>
                        <p><?php echo esc_html(wp_trim_words(wp_strip_all_tags($post_item->post_content), 24)); ?></p>
                        <a class="open-link" href="<?php echo esc_url(get_permalink($post_item->ID)); ?>">进入阅读</a>
                      </article>
                    <?php endforeach; ?>
                  </div>
                <?php endforeach; ?>
              </section>
            <?php endforeach; ?>
          </div>

          <div class="section-title">
            <span class="eyebrow">常查制度</span>
            <h2>先看最常用的体系文件</h2>
          </div>
          <div class="featured-strip">
            <?php foreach ($featured_posts as $post_item) : ?>
              <a class="post-link-card" href="<?php echo esc_url(get_permalink($post_item->ID)); ?>">
                <span class="eyebrow">制度正文</span>
                <h3><?php echo esc_html(get_the_title($post_item->ID)); ?></h3>
                <small>进入详情阅读</small>
              </a>
            <?php endforeach; ?>
          </div>

          <div class="section-title">
            <span class="eyebrow">搜索与分类</span>
            <h2>最后回到完整制度分类清单</h2>
            <p>入口区适合快速定位，完整分类清单负责承接系统查阅和模糊搜索。</p>
          </div>

          <div class="search-box">
            <input id="policySearch" type="text" placeholder="搜索制度名称，例如：续费、开店、招聘、教学、巡店" />
          </div>

          <div class="groups-stack">
            <?php foreach ($ordered_groups as $group) : ?>
              <section class="group-card" data-group>
                <button class="group-header" type="button" data-toggle>
                  <div class="group-left">
                    <span class="group-count"><?php echo esc_html((string) $group['count']); ?></span>
                    <div>
                      <span class="eyebrow">制度分类</span>
                      <h2><?php echo esc_html($group['name']); ?></h2>
                    </div>
                  </div>
                  <span class="group-toggle">▾</span>
                </button>

                <div class="group-body">
                  <div class="post-grid">
                    <?php foreach ($group['posts'] as $post_item) : ?>
                      <article class="post-item" data-item data-name="<?php echo esc_attr($post_item->post_title); ?>">
                        <span class="eyebrow">制度正文</span>
                        <h3><?php echo esc_html($post_item->post_title); ?></h3>
                        <p><?php echo esc_html(wp_trim_words(wp_strip_all_tags($post_item->post_content), 26)); ?></p>
                        <a class="open-link" href="<?php echo esc_url(get_permalink($post_item->ID)); ?>">进入阅读</a>
                      </article>
                    <?php endforeach; ?>
                  </div>
                </div>
              </section>
            <?php endforeach; ?>
          </div>
        </div>
      </section>
    </main>

    <footer class="site-footer">
      <div class="shell">
        <p>追光小牛制度中心 · 已升级为双入口 + 第二层制度列表结构</p>
      </div>
    </footer>

    <script>
      const searchInput = document.getElementById('policySearch');
      const groups = Array.from(document.querySelectorAll('[data-group]'));

      groups.forEach((group) => {
        const button = group.querySelector('[data-toggle]');
        button.addEventListener('click', () => group.classList.toggle('collapsed'));
      });

      searchInput.addEventListener('input', () => {
        const keyword = searchInput.value.trim().toLowerCase();
        const detailGroups = Array.from(document.querySelectorAll('[data-detail-group]'));

        groups.forEach((group) => {
          const items = Array.from(group.querySelectorAll('[data-item]'));
          let visibleCount = 0;
          items.forEach((item) => {
            const matched = !keyword || item.dataset.name.toLowerCase().includes(keyword);
            item.hidden = !matched;
            if (matched) visibleCount += 1;
          });
          group.hidden = visibleCount === 0;
        });

        detailGroups.forEach((section) => {
          const items = Array.from(section.querySelectorAll('[data-item]'));
          const visibleCount = items.filter((item) => !item.hidden).length;
          section.hidden = visibleCount === 0;
        });
      });
    </script>
    <?php wp_footer(); ?>
  </body>
</html>
