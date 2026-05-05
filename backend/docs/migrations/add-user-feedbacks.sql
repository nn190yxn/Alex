-- 用户反馈表（需求建议 + Bug 报错）
CREATE TABLE IF NOT EXISTS user_feedbacks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type ENUM('feature', 'bug') NOT NULL COMMENT 'feature=需求建议, bug=Bug报错',
  title VARCHAR(200) NOT NULL,
  description TEXT,
  image_url VARCHAR(500) COMMENT '截图URL',
  status ENUM('pending', 'processing', 'resolved', 'closed') DEFAULT 'pending',
  admin_note TEXT COMMENT '管理员处理备注',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
