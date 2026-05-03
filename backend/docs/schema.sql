-- 我赢AI 数据库建表SQL
-- 使用前请先创建数据库: CREATE DATABASE woai_ai DEFAULT CHARSET utf8mb4;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '用户ID',
  phone VARCHAR(20) NOT NULL UNIQUE COMMENT '手机号',
  password_hash VARCHAR(255) NOT NULL COMMENT '密码哈希',
  nickname VARCHAR(50) DEFAULT '' COMMENT '昵称',
  avatar_url VARCHAR(500) DEFAULT '' COMMENT '头像URL',
  industry VARCHAR(50) DEFAULT NULL COMMENT '所属行业',
  city VARCHAR(50) DEFAULT NULL COMMENT '所在城市',
  member_level ENUM('free', 'starter', 'pro', 'annual') DEFAULT 'free' COMMENT '会员等级',
  member_expire_at DATETIME DEFAULT NULL COMMENT '会员到期时间',
  referral_code VARCHAR(20) DEFAULT NULL UNIQUE COMMENT '推荐码',
  referred_by INT DEFAULT NULL COMMENT '推荐人用户ID',
  referral_bonus_days INT DEFAULT 0 COMMENT '推荐奖励天数',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_phone (phone),
  INDEX idx_referral_code (referral_code),
  INDEX idx_referred_by (referred_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- 订单表
CREATE TABLE IF NOT EXISTS orders (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '订单ID',
  user_id INT NOT NULL COMMENT '用户ID',
  plan_code VARCHAR(50) NOT NULL COMMENT '套餐代码',
  plan_name VARCHAR(100) NOT NULL COMMENT '套餐名称',
  amount DECIMAL(10, 2) NOT NULL COMMENT '订单金额',
  status ENUM('pending', 'paid', 'expired', 'refunded') DEFAULT 'pending' COMMENT '订单状态',
  wechat_order_id VARCHAR(100) DEFAULT NULL COMMENT '微信订单号',
  paid_at DATETIME DEFAULT NULL COMMENT '支付时间',
  expires_at DATETIME DEFAULT NULL COMMENT '套餐到期时间',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_wechat_order_id (wechat_order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单表';

-- 工具使用记录表
CREATE TABLE IF NOT EXISTS tool_usage (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '记录ID',
  user_id INT NOT NULL COMMENT '用户ID',
  tool_code VARCHAR(50) NOT NULL COMMENT '工具代码',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '使用时间',
  INDEX idx_user_tool_date (user_id, tool_code, created_at),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='工具使用记录表';

-- 工具结果记录表
CREATE TABLE IF NOT EXISTS tool_results (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '结果ID',
  user_id INT NOT NULL COMMENT '用户ID',
  tool_code VARCHAR(50) NOT NULL COMMENT '工具代码',
  input_json TEXT COMMENT '输入参数JSON',
  output_json TEXT COMMENT '输出结果JSON',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX idx_user_tool (user_id, tool_code),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='工具结果记录表';

-- 诊断报告表
CREATE TABLE IF NOT EXISTS diagnosis_reports (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '报告ID',
  user_id INT NOT NULL COMMENT '用户ID',
  answers_json TEXT NOT NULL COMMENT '诊断答案JSON',
  analysis_json TEXT COMMENT 'AI分析结果JSON',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='诊断报告表';

-- 推荐关系表（可选，用于更复杂的推荐统计）
CREATE TABLE IF NOT EXISTS referral_relationships (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '关系ID',
  referrer_id INT NOT NULL COMMENT '推荐人用户ID',
  referred_id INT NOT NULL COMMENT '被推荐人用户ID',
  bonus_days INT DEFAULT 1 COMMENT '奖励天数',
  bonus_status ENUM('pending', 'activated', 'expired') DEFAULT 'pending' COMMENT '奖励状态',
  activated_at DATETIME DEFAULT NULL COMMENT '激活时间',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  UNIQUE KEY uk_referred_id (referred_id),
  INDEX idx_referrer_id (referrer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='推荐关系表';

-- 事件追踪表（用于分析统计）
CREATE TABLE IF NOT EXISTS analytics_events (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL COMMENT '用户ID',
  event_type VARCHAR(50) NOT NULL COMMENT '事件类型',
  event_meta JSON NULL COMMENT '事件元数据',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX idx_user_event (user_id, event_type),
  INDEX idx_event_type (event_type),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='事件追踪表';

-- 初始化管理员账户（密码: admin123）
-- INSERT INTO users (phone, password_hash, member_level) VALUES ('13800138000', '$2a$10$...', 'annual');
