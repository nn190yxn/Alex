<?php
/**
 * Template Name: 分类列表页
 */

add_filter('show_admin_bar', '__return_false');

$logo_url = esc_url(home_url('/玻璃贴-14.png'));
$page_slug = get_post_field('post_name', get_the_ID());
$page_title = get_the_title();
$is_learning_center = $page_title === '新员工学习';

$page_configs = array(
    '知识库' => array(
        'title' => '知识库',
        'eyebrow' => '经验沉淀 / 统一话术 / 可检索知识',
        'desc' => '知识库承接制度以外的经验、案例、话术和 FAQ，帮助员工把制度转成真实执行能力。',
        'gradient' => 'linear-gradient(135deg, #2f80ed 0%, #5ac8fa 48%, #d7f3ff 100%)',
        'badge' => '知识',
        'empty' => '当前还没有知识文章，可继续在后台发布并归入知识库分类。',
    ),
    '新闻公告' => array(
        'title' => '新闻公告',
        'eyebrow' => '内部通知 / 动态更新 / 公告同步',
        'desc' => '用于发布上线通知、重要提醒和内部动态，不和制度、知识内容混在一起。',
        'gradient' => 'linear-gradient(135deg, #ff8a5b 0%, #ffb36a 50%, #ffe2bf 100%)',
        'badge' => '公告',
        'empty' => '当前还没有公告内容。',
    ),
    '培训资料库' => array(
        'title' => '培训资料库',
        'eyebrow' => '培训材料 / 上岗验收 / 统一学习资料',
        'desc' => '培训资料库承接正式培训材料、课件、抽测说明和上岗前后的统一资料。',
        'gradient' => 'linear-gradient(135deg, #8b5cf6 0%, #6d7cff 50%, #d9dbff 100%)',
        'badge' => '培训',
        'empty' => '当前还没有培训资料内容。',
    ),
    '素材中心' => array(
        'title' => '素材中心',
        'eyebrow' => '品牌素材 / 运营素材 / 统一物料',
        'desc' => '用于归档品牌素材、门店运营素材和统一宣传物料，方便各校区统一调用。',
        'gradient' => 'linear-gradient(135deg, #06d6a0 0%, #63e6be 48%, #d9fff3 100%)',
        'badge' => '素材',
        'empty' => '当前还没有素材中心内容。',
    ),
    '新员工学习' => array(
        'title' => '员工学习中心',
        'eyebrow' => '阶段学习 / 培训任务 / 学习闭环',
        'desc' => '学习中心不是单纯的新员工页面，而是覆盖全员的必学任务、阶段学习、专业知识和抽测验收。',
        'gradient' => 'linear-gradient(135deg, #ff6b35 0%, #ff9b62 46%, #ffe3cf 100%)',
        'badge' => '学习',
        'empty' => '当前还没有学习中心内容，可继续在后台补充分阶段学习文章。',
    ),
);

$config = isset($page_configs[$page_title]) ? $page_configs[$page_title] : array(
    'title' => $page_title,
    'eyebrow' => '内容中心',
    'desc' => '统一内容页。',
    'gradient' => 'linear-gradient(135deg, #ff6b35 0%, #ffb36a 55%, #ffe8d1 100%)',
    'badge' => '内容',
    'empty' => '当前还没有内容。',
);

$category = get_category_by_slug($page_slug);
if (!$category) {
    $category = get_term_by('name', $page_title, 'category');
}

$category_id = $category ? $category->term_id : 0;
$posts = get_posts(
    array(
        'numberposts' => -1,
        'post_status' => 'publish',
        'cat' => $category_id,
        'orderby' => 'date',
        'order' => 'DESC',
    )
);

$featured_post = !empty($posts) ? $posts[0] : null;
$secondary_posts = $featured_post ? array_slice($posts, 1) : array();

$contains_text = static function ($content, array $keywords) {
    foreach ($keywords as $keyword) {
        if (function_exists('mb_stripos')) {
            if (mb_stripos($content, $keyword) !== false) {
                return true;
            }
        } elseif (stripos($content, $keyword) !== false) {
            return true;
        }
    }

    return false;
};

$learning_sections = array();
$learning_recent = array();
$learning_latest_date = !empty($posts) ? get_the_date('Y-m-d', $posts[0]->ID) : '待补充';

if ($is_learning_center) {
    $bucket_configs = array(
        'required' => array(
            'title' => '新员工必学',
            'desc' => '先完成总纲、上岗、制度边界和基础服务相关内容。',
            'keywords' => array('总纲', '入职', '必学', '上岗', '签署', '制度'),
        ),
        'basic' => array(
            'title' => '初阶实操',
            'desc' => '围绕门店流程、课堂配合、家长沟通与基础执行。',
            'keywords' => array('门店', '服务', '接待', '课前', '课后', '家长', '流程'),
        ),
        'advanced' => array(
            'title' => '进阶提升',
            'desc' => '围绕带教、复盘、管理和复杂场景处理能力。',
            'keywords' => array('进阶', '提升', '复盘', '管理', '帮带', '带教', '经营'),
        ),
        'professional' => array(
            'title' => '专业知识专题',
            'desc' => '围绕教学、训练、ACE、评估与专业能力强化。',
            'keywords' => array('教学', '训练', 'ACE', '评估', '体测', '教案', '课程'),
        ),
    );

    $used_post_ids = array();
    foreach ($bucket_configs as $key => $bucket) {
        $learning_sections[$key] = array(
            'title' => $bucket['title'],
            'desc' => $bucket['desc'],
            'posts' => array(),
        );

        foreach ($posts as $post_item) {
            if (isset($used_post_ids[$post_item->ID])) {
                continue;
            }

            $haystack = get_the_title($post_item->ID) . ' ' . wp_strip_all_tags($post_item->post_content);
            if (!$contains_text($haystack, $bucket['keywords'])) {
                continue;
            }

            $learning_sections[$key]['posts'][] = $post_item;
            $used_post_ids[$post_item->ID] = true;
        }
    }

    foreach ($posts as $post_item) {
        if (isset($used_post_ids[$post_item->ID])) {
            continue;
        }
        $learning_recent[] = $post_item;
    }
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
        background: linear-gradient(180deg, #fffaf6 0%, #fff 28%, #fdfaf7 100%);
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
      .hero { padding: 34px 0 24px; }
      .hero-card, .panel-card, .post-card, .empty-card, .highlight-card, .overview-card {
        border: 1px solid rgba(31, 26, 23, 0.08); background: rgba(255, 255, 255, 0.94); border-radius: 22px; box-shadow: var(--panel-shadow);
      }
      .hero-card {
        padding: 28px; display: grid; grid-template-columns: 1.12fr 0.88fr; gap: 22px; background: <?php echo esc_attr($config['gradient']); ?>;
      }
      .hero-copy { color: #fff; }
      .eyebrow { display: inline-block; font-size: 12px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; opacity: 0.86; }
      h1, h2, h3 { margin: 10px 0 0; letter-spacing: -0.04em; }
      h1 { font-size: clamp(30px, 4.8vw, 46px); line-height: 1.06; }
      h2 { font-size: clamp(22px, 3vw, 30px); line-height: 1.14; }
      h3 { font-size: 20px; line-height: 1.3; }
      p { line-height: 1.85; }
      .hero-copy p { margin-top: 16px; max-width: 680px; color: rgba(255, 255, 255, 0.92); }
      .hero-panels, .learning-reminders, .learning-grid, .post-grid, .overview-strip { display: grid; gap: 16px; }
      .hero-panels { align-self: end; }
      .hero-panels.two-up { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .overview-strip { grid-template-columns: repeat(3, minmax(0, 1fr)); margin: 0 0 18px; }
      .overview-card { padding: 20px; }
      .mini-panel, .task-card { padding: 18px; border-radius: 18px; background: rgba(255, 255, 255, 0.18); border: 1px solid rgba(255, 255, 255, 0.24); color: #fff; }
      .mini-panel strong { display: block; margin-top: 6px; font-size: 24px; }
      .content { padding: 8px 0 72px; }
      .section-title { margin: 0 0 14px; }
      .highlight-card, .panel-card, .empty-card { padding: 24px; margin-bottom: 18px; }
      .meta-row { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 14px; color: #9e9289; font-size: 13px; }
      .post-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .learning-reminders, .learning-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); margin-bottom: 18px; }
      .post-card { padding: 22px; transition: transform 0.18s ease, box-shadow 0.18s ease; }
      .post-card:hover { transform: translateY(-2px); box-shadow: rgba(0, 0, 0, 0.08) 0px 18px 40px, rgba(0, 0, 0, 0.03) 0px 4px 12px; }
      .post-card p, .highlight-card p, .empty-card p, .panel-card p { color: var(--brand-muted); }
      .tag { display: inline-flex; align-items: center; min-height: 28px; padding: 0 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; background: rgba(255, 107, 53, 0.1); color: var(--brand-orange); }
      .site-footer { padding: 28px 0 40px; border-top: 1px solid rgba(31, 26, 23, 0.08); }
      .site-footer p { margin: 0; color: var(--brand-muted); text-align: center; }
      @media (max-width: 980px) { .hero-card, .hero-panels.two-up, .overview-strip, .post-grid, .learning-reminders, .learning-grid { grid-template-columns: 1fr; } }
      @media (max-width: 760px) { .topbar { align-items: flex-start; flex-direction: column; padding: 12px 0; } .nav { justify-content: flex-start; } }
    </style>
  </head>
  <body <?php body_class(); ?>>
    <?php wp_body_open(); ?>
    <header class="site-header">
      <div class="shell topbar">
        <a class="brand" href="<?php echo esc_url(home_url('/internal.html')); ?>">
          <img src="<?php echo $logo_url; ?>" alt="追光小牛 logo" />
          <span>追光小牛</span>
        </a>
        <nav class="nav">
          <a href="<?php echo esc_url(home_url('/internal.html')); ?>">员工首页</a>
          <a href="<?php echo esc_url(home_url('/表格中心/')); ?>">表格中心</a>
          <a href="<?php echo esc_url(home_url('/制度标准/')); ?>">制度中心</a>
          <a class="<?php echo $config['title'] === '知识库' ? 'current' : ''; ?>" href="<?php echo esc_url(home_url('/知识库/')); ?>">知识库</a>
          <a class="<?php echo $config['title'] === '员工学习中心' ? 'current' : ''; ?>" href="<?php echo esc_url(home_url('/新员工学习/')); ?>">员工学习中心</a>
          <a href="<?php echo esc_url(home_url('/fitness-assessment.html')); ?>">智能运动规划</a>
          <a href="<?php echo esc_url(home_url('/smart-lessons.html')); ?>">智能教案</a>
          <?php if (!in_array($config['title'], array('知识库', '员工学习中心'), true)) : ?>
            <a class="current" href="<?php echo esc_url(get_permalink()); ?>"><?php echo esc_html($config['title']); ?></a>
          <?php endif; ?>
          <a class="staff-link" href="<?php echo esc_url(home_url('/')); ?>">返回官网</a>
        </nav>
      </div>
    </header>

    <main>
      <section class="hero">
        <div class="shell hero-card">
          <div class="hero-copy">
            <span class="eyebrow"><?php echo esc_html($config['eyebrow']); ?></span>
            <h1><?php echo esc_html($config['title']); ?></h1>
            <p><?php echo esc_html($config['desc']); ?></p>
          </div>
          <div class="hero-panels <?php echo $is_learning_center ? 'two-up' : ''; ?>">
            <article class="mini-panel">
              <span class="eyebrow">内容总数</span>
              <strong><?php echo esc_html((string) count($posts)); ?></strong>
              <p>当前页面下已经发布的内容数量。</p>
            </article>
            <article class="mini-panel">
              <span class="eyebrow">当前定位</span>
              <strong><?php echo esc_html($config['badge']); ?></strong>
              <p>与制度中心、表格中心分工清晰，不再混合承载。</p>
            </article>
            <?php if ($is_learning_center) : ?>
              <article class="mini-panel">
                <span class="eyebrow">阶段结构</span>
                <strong>4 段</strong>
                <p>必学、初阶、进阶、专业专题同页收口。</p>
              </article>
              <article class="mini-panel">
                <span class="eyebrow">最近更新</span>
                <strong><?php echo esc_html($learning_latest_date); ?></strong>
                <p>优先提醒最近上线的学习内容和抽测资料。</p>
              </article>
            <?php endif; ?>
          </div>
        </div>
      </section>

      <section class="content">
        <div class="shell">
          <div class="overview-strip">
            <article class="overview-card">
              <span class="tag">页面定位</span>
              <h3><?php echo esc_html($config['title']); ?>是独立内容中心</h3>
              <p>这个模块只承接这一类内容，不再和制度、表格或 AI 工具混在一个页面里。</p>
            </article>
            <article class="overview-card">
              <span class="tag">进入顺序</span>
              <h3>先看推荐，再看完整列表</h3>
              <p>先从推荐内容或阶段内容进入，再回到完整文章列表持续浏览，降低第一次进入时的信息压力。</p>
            </article>
            <article class="overview-card">
              <span class="tag">当前收口</span>
              <h3>页面结构已统一到列表中心</h3>
              <p>后续无论继续补内容还是补筛选，都会沿着这套“推荐区 + 列表区”的骨架继续扩展。</p>
            </article>
          </div>

          <?php if ($is_learning_center) : ?>
            <div class="section-title">
              <span class="eyebrow">学习提醒</span>
              <h2>先看任务，再进入阶段内容</h2>
            </div>
            <div class="learning-reminders">
              <article class="panel-card">
                <span class="tag">本周必做</span>
                <h3>先读制度，再开始培训</h3>
                <p>把制度阅读、知识专题和培训资料放在同一学习链路里，避免只看文章不做验收。</p>
              </article>
              <article class="panel-card">
                <span class="tag">学习闭环</span>
                <h3>阅读、抽测、上岗、复盘</h3>
                <p>页面结构已经按学习闭环组织，后续继续补抽测与验收内容时不需要重新拆页面。</p>
              </article>
            </div>

            <?php foreach ($learning_sections as $section) : ?>
              <?php if (!$section['posts']) { continue; } ?>
              <div class="section-title">
                <span class="eyebrow">阶段学习</span>
                <h2><?php echo esc_html($section['title']); ?></h2>
                <p><?php echo esc_html($section['desc']); ?></p>
              </div>
              <div class="learning-grid">
                <?php foreach ($section['posts'] as $post_item) : ?>
                  <a class="post-card" href="<?php echo esc_url(get_permalink($post_item->ID)); ?>">
                    <span class="tag">阶段内容</span>
                    <h3><?php echo esc_html(get_the_title($post_item->ID)); ?></h3>
                    <p><?php echo esc_html(wp_trim_words(wp_strip_all_tags($post_item->post_content), 34)); ?></p>
                    <div class="meta-row">
                      <span><?php echo esc_html(get_the_date('Y-m-d', $post_item->ID)); ?></span>
                      <span>进入详情阅读</span>
                    </div>
                  </a>
                <?php endforeach; ?>
              </div>
            <?php endforeach; ?>

            <?php if ($learning_recent) : ?>
              <div class="section-title">
                <span class="eyebrow">最近补充</span>
                <h2>最新学习内容</h2>
                <p>用最近更新区补充未被阶段结构吸收的内容，避免页面里只有分段没有最新动态。</p>
              </div>
              <div class="post-grid">
                <?php foreach ($learning_recent as $post_item) : ?>
                  <a class="post-card" href="<?php echo esc_url(get_permalink($post_item->ID)); ?>">
                    <span class="tag">最近更新</span>
                    <h3><?php echo esc_html(get_the_title($post_item->ID)); ?></h3>
                    <p><?php echo esc_html(wp_trim_words(wp_strip_all_tags($post_item->post_content), 36)); ?></p>
                    <div class="meta-row">
                      <span><?php echo esc_html(get_the_date('Y-m-d', $post_item->ID)); ?></span>
                    </div>
                  </a>
                <?php endforeach; ?>
              </div>
            <?php endif; ?>

            <?php if (!$posts) : ?>
              <div class="empty-card">
                <h2>学习内容还在补充中</h2>
                <p><?php echo esc_html($config['empty']); ?></p>
              </div>
            <?php endif; ?>
          <?php else : ?>
            <?php if ($featured_post) : ?>
              <div class="section-title">
                <span class="eyebrow">推荐内容</span>
                <h2>先看优先阅读，再进入完整列表</h2>
              </div>
              <a class="highlight-card" href="<?php echo esc_url(get_permalink($featured_post->ID)); ?>">
                <span class="tag">优先阅读</span>
                <h2><?php echo esc_html(get_the_title($featured_post->ID)); ?></h2>
                <p><?php echo esc_html(wp_trim_words(wp_strip_all_tags($featured_post->post_content), 60)); ?></p>
                <div class="meta-row">
                  <span>发布时间：<?php echo esc_html(get_the_date('Y-m-d', $featured_post->ID)); ?></span>
                  <span>进入详情阅读</span>
                </div>
              </a>
            <?php endif; ?>

            <?php if ($secondary_posts) : ?>
              <div class="section-title">
                <span class="eyebrow">完整列表</span>
                <h2><?php echo esc_html($config['title']); ?>文章清单</h2>
                <p>推荐区负责先给方向，完整列表负责承接持续阅读和按需查阅。</p>
              </div>
              <div class="post-grid">
                <?php foreach ($secondary_posts as $post_item) : ?>
                  <a class="post-card" href="<?php echo esc_url(get_permalink($post_item->ID)); ?>">
                    <span class="tag"><?php echo esc_html($config['title']); ?></span>
                    <h3><?php echo esc_html(get_the_title($post_item->ID)); ?></h3>
                    <p><?php echo esc_html(wp_trim_words(wp_strip_all_tags($post_item->post_content), 36)); ?></p>
                    <div class="meta-row">
                      <span><?php echo esc_html(get_the_date('Y-m-d', $post_item->ID)); ?></span>
                    </div>
                  </a>
                <?php endforeach; ?>
              </div>
            <?php elseif (!$featured_post) : ?>
              <div class="empty-card">
                <h2>内容还在补充中</h2>
                <p><?php echo esc_html($config['empty']); ?></p>
              </div>
            <?php endif; ?>
          <?php endif; ?>
        </div>
      </section>
    </main>

    <footer class="site-footer">
      <div class="shell">
        <p>追光小牛内容中心 · 该分类页已接入统一设计系统</p>
      </div>
    </footer>
    <?php wp_footer(); ?>
  </body>
</html>
