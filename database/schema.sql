CREATE TABLE IF NOT EXISTS store_products (
  id VARCHAR(16) PRIMARY KEY,
  type ENUM('fragrance', 'set') NOT NULL,
  name VARCHAR(255) NOT NULL,
  short VARCHAR(120) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  size VARCHAR(80) NOT NULL,
  tag VARCHAR(255) NOT NULL,
  img VARCHAR(2048) NOT NULL,
  description TEXT NOT NULL,
  image_position VARCHAR(80) NOT NULL DEFAULT '50% 50%',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS inventory (
  product_id VARCHAR(16) PRIMARY KEY,
  stock INT UNSIGNED NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT inventory_product_fk FOREIGN KEY (product_id) REFERENCES store_products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS storefront_content (
  content_key VARCHAR(40) PRIMARY KEY,
  image_url VARCHAR(2048) NOT NULL,
  video_url VARCHAR(2048) NOT NULL DEFAULT '',
  alt_text VARCHAR(300) NOT NULL DEFAULT '',
  eyebrow_text VARCHAR(255) NOT NULL DEFAULT '',
  heading_text VARCHAR(500) NOT NULL DEFAULT '',
  body_text TEXT NOT NULL,
  button_text VARCHAR(120) NOT NULL DEFAULT '',
  button_href VARCHAR(2048) NOT NULL DEFAULT '',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY,
  email VARCHAR(254) NOT NULL UNIQUE,
  password_hash VARCHAR(180) NOT NULL,
  full_name VARCHAR(120) NOT NULL DEFAULT '',
  phone VARCHAR(50) NOT NULL DEFAULT '',
  role ENUM('customer', 'admin') NOT NULL DEFAULT 'customer',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS user_sessions (
  token_hash CHAR(64) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX user_sessions_user_idx (user_id),
  INDEX user_sessions_expiry_idx (expires_at),
  CONSTRAINT user_sessions_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS password_resets (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX password_resets_user_idx (user_id),
  INDEX password_resets_token_idx (token_hash),
  CONSTRAINT password_resets_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS orders (
  id CHAR(36) PRIMARY KEY,
  public_id CHAR(12) NOT NULL UNIQUE,
  stripe_session_id VARCHAR(255) NULL UNIQUE,
  stripe_payment_intent_id VARCHAR(255) NULL,
  customer_id CHAR(36) NULL,
  email VARCHAR(254) NOT NULL,
  customer_name VARCHAR(120) NOT NULL DEFAULT '',
  phone VARCHAR(50) NOT NULL DEFAULT '',
  has_whatsapp BOOLEAN NOT NULL DEFAULT TRUE,
  whatsapp_number VARCHAR(50) NULL,
  address_line1 VARCHAR(255) NOT NULL DEFAULT '',
  address_line2 VARCHAR(255) NOT NULL DEFAULT '',
  city VARCHAR(120) NOT NULL DEFAULT '',
  region VARCHAR(120) NOT NULL DEFAULT '',
  postal_code VARCHAR(40) NOT NULL DEFAULT '',
  country VARCHAR(80) NOT NULL DEFAULT '',
  subtotal_cents INT UNSIGNED NOT NULL,
  discount_cents INT UNSIGNED NOT NULL DEFAULT 0,
  shipping_cents INT UNSIGNED NOT NULL,
  total_cents INT UNSIGNED NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'usd',
  status ENUM('pending', 'paid', 'refunded', 'packed', 'shipped', 'delivered', 'inventory_issue') NOT NULL DEFAULT 'pending',
  payment_status ENUM('pending', 'submitted', 'paid', 'refunded') NOT NULL DEFAULT 'pending',
  payment_method VARCHAR(32) NOT NULL DEFAULT 'cash_on_delivery',
  payment_reference VARCHAR(255) NULL,
  payment_proof VARCHAR(2048) NULL,
  courier_name VARCHAR(100) NULL,
  courier_cn VARCHAR(100) NULL,
  remittance_reference VARCHAR(255) NULL,
  remittance_proof MEDIUMTEXT NULL,
  remittance_amount_cents INT UNSIGNED NULL,
  remitted_at DATETIME NULL,
  payment_verified_at DATETIME NULL,
  payment_verified_by VARCHAR(120) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX orders_email_created_idx (email, created_at),
  INDEX orders_customer_created_idx (customer_id, created_at),
  INDEX orders_payment_intent_idx (stripe_payment_intent_id),
  CONSTRAINT orders_customer_fk FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS order_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id CHAR(36) NOT NULL,
  product_id VARCHAR(16) NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  unit_price_cents INT UNSIGNED NOT NULL,
  subtotal_cents INT UNSIGNED NOT NULL,
  total_cents INT UNSIGNED NOT NULL,
  INDEX order_items_order_idx (order_id),
  CONSTRAINT order_items_order_fk FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT order_items_product_fk FOREIGN KEY (product_id) REFERENCES store_products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS order_status_history (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id CHAR(36) NOT NULL,
  status ENUM('pending', 'paid', 'refunded', 'packed', 'shipped', 'delivered', 'inventory_issue') NOT NULL,
  changed_by CHAR(36) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY order_status_history_order_status_unique (order_id, status),
  INDEX order_status_history_order_created_idx (order_id, created_at),
  CONSTRAINT order_status_history_order_fk FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT order_status_history_user_fk FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS product_reviews (
  id CHAR(36) PRIMARY KEY,
  product_id VARCHAR(16) NOT NULL,
  customer_id CHAR(36) NULL,
  customer_name VARCHAR(80) NOT NULL,
  review_text VARCHAR(2000) NOT NULL,
  rating TINYINT UNSIGNED NOT NULL,
  verified_purchase BOOLEAN NOT NULL DEFAULT FALSE,
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX reviews_approved_product_created_idx (product_id, status, created_at),
  INDEX reviews_pending_created_idx (status, created_at),
  INDEX reviews_customer_idx (customer_id),
  CONSTRAINT product_reviews_product_fk FOREIGN KEY (product_id) REFERENCES store_products(id) ON DELETE CASCADE,
  CONSTRAINT product_reviews_customer_fk FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT product_reviews_rating_check CHECK (rating BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  email VARCHAR(254) PRIMARY KEY,
  subscribed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO store_products (id, type, name, short, price, size, tag, img, description, image_position)
VALUES
  ('edp', 'fragrance', 'Velvet Smoke Eau de Parfum', 'Eau de Parfum', 120, '50 ml', 'Warm. Spiced. Magnetic.', '/assets/images/product-eau-de-parfum.jpg', 'The classic Velvet Smoke. A warm, spiced heart over amber and sandalwood that settles close to the skin.', '50% 50%'),
  ('edt', 'fragrance', 'Velvet Smoke Eau de Toilette', 'Eau de Toilette', 120, '50 ml', 'Luminous. Elegant. Refined.', '/assets/images/product-eau-de-toilette.jpg', 'A lighter, brighter reading of Velvet Smoke. Bergamot and jasmine lead, made for daytime.', '50% 50%'),
  ('ext', 'fragrance', 'Velvet Smoke Extrait de Parfum', 'Extrait de Parfum', 140, '50 ml', 'Bold. Intense. Unforgettable.', '/assets/images/product-extrait-de-parfum.jpg', 'The deepest concentration. Amber, musk and sandalwood that stay with you well into the night.', '50% 50%')
ON DUPLICATE KEY UPDATE id = VALUES(id);

INSERT INTO inventory (product_id, stock)
VALUES ('edp', 24), ('edt', 3), ('ext', 12)
ON DUPLICATE KEY UPDATE product_id = VALUES(product_id);

INSERT INTO storefront_content
  (content_key, image_url, video_url, alt_text, eyebrow_text, heading_text, body_text, button_text, button_href)
VALUES
  ('hero_image', '/assets/images/hero-photo-full.png', '/assets/videos/hero_bg.mp4', 'Velvet Smoke bottle and box', '', '', '', '', ''),
  ('hero_copy', '', '', '', 'Fine fragrance for a more meaningful you', 'A signature begins with a scent.', 'Velvet Smoke – a refined balance of warmth, spice, and quiet strength. Designed for every body.', 'Discover Velvet Smoke', '/shop'),
  ('collection_copy', '', '', '', 'The collection', 'Velvet Smoke in Every Shade.', 'A modern fragrance. Many expressions. Find yours.', 'Shop all', '/shop'),
  ('lifestyle_image', '/assets/images/hero-photo-full.png', '/assets/videos/woman_used.mp4', 'Velvet Smoke fragrance in a lifestyle setting', '', '', '', '', ''),
  ('lifestyle_copy', '', '', '', 'A moment, made yours', 'Wear a scent that stays with you.', 'Find the fragrance that feels like your own, from the first spray to the last note.', 'Find your fragrance', '/shop'),
  ('hero_leaves', '/assets/images/hero-leaves.jpg', '', '', '', '', '', '', ''),
  ('note_top', '/assets/images/note-top-bergamot-pepper.jpg', '', '', '', '', '', '', ''),
  ('note_heart', '/assets/images/note-heart-jasmine.jpg', '', '', '', '', '', '', ''),
  ('note_base', '/assets/images/note-base-amber-sandalwood.jpg', '', '', '', '', '', '', '')
ON DUPLICATE KEY UPDATE content_key = VALUES(content_key);
