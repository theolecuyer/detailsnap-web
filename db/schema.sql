-- DetailSnap Database Schema
-- MySQL 8, InnoDB, utf8mb4
-- Run this against a fresh `detailsnap` database.

SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- -------------------------------------------------------
-- shops
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS shops (
  id          CHAR(36)     NOT NULL,
  name        VARCHAR(255) NOT NULL,
  slug        VARCHAR(100) NOT NULL,
  address     VARCHAR(500) DEFAULT NULL,
  phone       VARCHAR(50)  DEFAULT NULL,
  email       VARCHAR(255) DEFAULT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_shops_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- users
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            CHAR(36)                  NOT NULL,
  shop_id       CHAR(36)                  NOT NULL,
  email         VARCHAR(255)              NOT NULL,
  password_hash VARCHAR(255)              NOT NULL,
  name          VARCHAR(255)              NOT NULL,
  role          ENUM('owner','staff')     NOT NULL DEFAULT 'staff',
  created_at    DATETIME                  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME                  NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_shop_id (shop_id),
  CONSTRAINT fk_users_shop FOREIGN KEY (shop_id) REFERENCES shops (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- staff_invites
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS staff_invites (
  id          CHAR(36)     NOT NULL,
  shop_id     CHAR(36)     NOT NULL,
  email       VARCHAR(255) NOT NULL,
  token       VARCHAR(128) NOT NULL,
  expires_at  DATETIME     NOT NULL,
  accepted_at DATETIME     DEFAULT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_staff_invites_token (token),
  KEY idx_staff_invites_shop_id (shop_id),
  CONSTRAINT fk_staff_invites_shop FOREIGN KEY (shop_id) REFERENCES shops (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- customers
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
  id         CHAR(36)     NOT NULL,
  shop_id    CHAR(36)     NOT NULL,
  name       VARCHAR(255) NOT NULL,
  email      VARCHAR(255) DEFAULT NULL,
  phone      VARCHAR(50)  DEFAULT NULL,
  address    VARCHAR(500) DEFAULT NULL,
  notes      TEXT         DEFAULT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_customers_shop_id (shop_id),
  KEY idx_customers_email (email),
  CONSTRAINT fk_customers_shop FOREIGN KEY (shop_id) REFERENCES shops (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- vehicles
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS vehicles (
  id            CHAR(36)     NOT NULL,
  customer_id   CHAR(36)     NOT NULL,
  year          INT          DEFAULT NULL,
  make          VARCHAR(100) DEFAULT NULL,
  model         VARCHAR(100) DEFAULT NULL,
  color         VARCHAR(100) DEFAULT NULL,
  license_plate VARCHAR(50)  DEFAULT NULL,
  vin           VARCHAR(17)  DEFAULT NULL,
  notes         TEXT         DEFAULT NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_vehicles_customer_id (customer_id),
  CONSTRAINT fk_vehicles_customer FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- services
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS services (
  id               CHAR(36)     NOT NULL,
  shop_id          CHAR(36)     NOT NULL,
  name             VARCHAR(255) NOT NULL,
  description      TEXT         DEFAULT NULL,
  base_price_cents INT          NOT NULL DEFAULT 0,
  duration_minutes INT          NOT NULL DEFAULT 60,
  color            VARCHAR(7)   NOT NULL DEFAULT '#3B82F6',
  active           TINYINT(1)   NOT NULL DEFAULT 1,
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_services_shop_id (shop_id),
  KEY idx_services_active (active),
  CONSTRAINT fk_services_shop FOREIGN KEY (shop_id) REFERENCES shops (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- sessions
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
  id                  CHAR(36)                                              NOT NULL,
  shop_id             CHAR(36)                                              NOT NULL,
  customer_id         CHAR(36)                                              NOT NULL,
  vehicle_id          CHAR(36)                                              NOT NULL,
  status              ENUM('booked','in_progress','completed','cancelled')  NOT NULL DEFAULT 'booked',
  scheduled_at        DATETIME                                              NOT NULL,
  started_at          DATETIME                                              DEFAULT NULL,
  completed_at        DATETIME                                              DEFAULT NULL,
  notes               TEXT                                                  DEFAULT NULL,
  total_price_cents   INT                                                   NOT NULL DEFAULT 0,
  created_by_user_id  CHAR(36)                                              DEFAULT NULL,
  created_at          DATETIME                                              NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME                                              NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_sessions_shop_id (shop_id),
  KEY idx_sessions_scheduled_at (scheduled_at),
  KEY idx_sessions_status (status),
  KEY idx_sessions_customer_id (customer_id),
  KEY idx_sessions_vehicle_id (vehicle_id),
  CONSTRAINT fk_sessions_shop     FOREIGN KEY (shop_id)     REFERENCES shops     (id) ON DELETE CASCADE,
  CONSTRAINT fk_sessions_customer FOREIGN KEY (customer_id) REFERENCES customers (id),
  CONSTRAINT fk_sessions_vehicle  FOREIGN KEY (vehicle_id)  REFERENCES vehicles  (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- session_services
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS session_services (
  session_id   CHAR(36) NOT NULL,
  service_id   CHAR(36) NOT NULL,
  price_cents  INT      NOT NULL DEFAULT 0,
  PRIMARY KEY (session_id, service_id),
  KEY idx_session_services_service_id (service_id),
  CONSTRAINT fk_ss_session FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE,
  CONSTRAINT fk_ss_service FOREIGN KEY (service_id) REFERENCES services (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- session_notes
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS session_notes (
  id         CHAR(36) NOT NULL,
  session_id CHAR(36) NOT NULL,
  user_id    CHAR(36) NOT NULL,
  body       TEXT     NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_session_notes_session_id (session_id),
  CONSTRAINT fk_sn_session FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE,
  CONSTRAINT fk_sn_user    FOREIGN KEY (user_id)    REFERENCES users    (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- photos
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS photos (
  id                  CHAR(36)                                          NOT NULL,
  shop_id             CHAR(36)                                          NOT NULL,
  session_id          CHAR(36)                                          DEFAULT NULL,
  s3_key              VARCHAR(500)                                      NOT NULL,
  content_type        VARCHAR(100)                                      NOT NULL,
  size_bytes          BIGINT                                            NOT NULL DEFAULT 0,
  tag                 ENUM('before','after','inspection','general')     NOT NULL DEFAULT 'general',
  caption             VARCHAR(500)                                      DEFAULT NULL,
  uploaded_by_user_id CHAR(36)                                          NOT NULL,
  created_at          DATETIME                                          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_photos_shop_id (shop_id),
  KEY idx_photos_session_id (session_id),
  CONSTRAINT fk_photos_shop    FOREIGN KEY (shop_id)    REFERENCES shops    (id) ON DELETE CASCADE,
  CONSTRAINT fk_photos_session FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE SET NULL,
  CONSTRAINT fk_photos_user    FOREIGN KEY (uploaded_by_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- quotes
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS quotes (
  id          CHAR(36)                                               NOT NULL,
  shop_id     CHAR(36)                                               NOT NULL,
  customer_id CHAR(36)                                               NOT NULL,
  vehicle_id  CHAR(36)                                               DEFAULT NULL,
  status      ENUM('draft','sent','accepted','declined','expired')   NOT NULL DEFAULT 'draft',
  total_cents INT                                                    NOT NULL DEFAULT 0,
  notes       TEXT                                                   DEFAULT NULL,
  sent_at     DATETIME                                               DEFAULT NULL,
  accepted_at DATETIME                                               DEFAULT NULL,
  created_at  DATETIME                                               NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME                                               NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_quotes_shop_id (shop_id),
  KEY idx_quotes_customer_id (customer_id),
  KEY idx_quotes_status (status),
  CONSTRAINT fk_quotes_shop     FOREIGN KEY (shop_id)     REFERENCES shops     (id) ON DELETE CASCADE,
  CONSTRAINT fk_quotes_customer FOREIGN KEY (customer_id) REFERENCES customers (id),
  CONSTRAINT fk_quotes_vehicle  FOREIGN KEY (vehicle_id)  REFERENCES vehicles  (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- quote_items
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS quote_items (
  id          CHAR(36)     NOT NULL,
  quote_id    CHAR(36)     NOT NULL,
  service_id  CHAR(36)     DEFAULT NULL,
  description VARCHAR(500) NOT NULL,
  price_cents INT          NOT NULL DEFAULT 0,
  position    INT          NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_quote_items_quote_id (quote_id),
  CONSTRAINT fk_qi_quote   FOREIGN KEY (quote_id)   REFERENCES quotes   (id) ON DELETE CASCADE,
  CONSTRAINT fk_qi_service FOREIGN KEY (service_id) REFERENCES services (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- invoices
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS invoices (
  id             CHAR(36)                          NOT NULL,
  shop_id        CHAR(36)                          NOT NULL,
  session_id     CHAR(36)                          DEFAULT NULL,
  customer_id    CHAR(36)                          NOT NULL,
  status         ENUM('unpaid','paid','void')       NOT NULL DEFAULT 'unpaid',
  total_cents    INT                               NOT NULL DEFAULT 0,
  paid_at        DATETIME                          DEFAULT NULL,
  payment_method VARCHAR(50)                       DEFAULT NULL,
  created_at     DATETIME                          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME                          NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_invoices_shop_id (shop_id),
  KEY idx_invoices_customer_id (customer_id),
  KEY idx_invoices_session_id (session_id),
  KEY idx_invoices_status (status),
  CONSTRAINT fk_invoices_shop     FOREIGN KEY (shop_id)     REFERENCES shops     (id) ON DELETE CASCADE,
  CONSTRAINT fk_invoices_session  FOREIGN KEY (session_id)  REFERENCES sessions  (id) ON DELETE SET NULL,
  CONSTRAINT fk_invoices_customer FOREIGN KEY (customer_id) REFERENCES customers (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =======================================================
-- SEED DATA (uncomment to load demo data)
-- =======================================================
/*
SET @shop_id   = '00000000-0000-0000-0000-000000000001';
SET @owner_id  = '00000000-0000-0000-0000-000000000002';
SET @svc1      = '00000000-0000-0000-0000-000000000010';
SET @svc2      = '00000000-0000-0000-0000-000000000011';
SET @svc3      = '00000000-0000-0000-0000-000000000012';
SET @svc4      = '00000000-0000-0000-0000-000000000013';
SET @cust1     = '00000000-0000-0000-0000-000000000020';
SET @cust2     = '00000000-0000-0000-0000-000000000021';
SET @veh1      = '00000000-0000-0000-0000-000000000030';
SET @veh2      = '00000000-0000-0000-0000-000000000031';
SET @sess1     = '00000000-0000-0000-0000-000000000040';

INSERT INTO shops (id, name, slug, address, phone, email) VALUES
  (@shop_id, 'Sparkle Detail Co.', 'sparkle-detail-co', '123 Main St, Austin TX 78701', '512-555-0100', 'hello@sparkledetail.com');

-- password: password123  (bcrypt hash cost 10)
INSERT INTO users (id, shop_id, email, password_hash, name, role) VALUES
  (@owner_id, @shop_id, 'owner@sparkledetail.com',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lihO',
   'Alex Owner', 'owner');

INSERT INTO services (id, shop_id, name, description, base_price_cents, duration_minutes, color) VALUES
  (@svc1, @shop_id, 'Exterior Wash & Wax',    'Hand wash, clay bar, carnauba wax',   7500,  90, '#3B82F6'),
  (@svc2, @shop_id, 'Interior Deep Clean',    'Vacuum, shampoo, leather conditioning', 9500, 120, '#10B981'),
  (@svc3, @shop_id, 'Full Detail Package',    'Exterior + Interior combo',          16500, 240, '#8B5CF6'),
  (@svc4, @shop_id, 'Engine Bay Detail',      'Degrease & dress engine bay',         6000,  60, '#F59E0B');

INSERT INTO customers (id, shop_id, name, email, phone) VALUES
  (@cust1, @shop_id, 'Jamie Smith', 'jamie@example.com', '512-555-0200'),
  (@cust2, @shop_id, 'Taylor Jones', 'taylor@example.com', '512-555-0201');

INSERT INTO vehicles (id, customer_id, year, make, model, color, license_plate) VALUES
  (@veh1, @cust1, 2021, 'Tesla', 'Model 3', 'Midnight Silver', 'TSL-001'),
  (@veh2, @cust2, 2019, 'Ford',  'F-150',   'Oxford White',    'FRD-002');

INSERT INTO sessions (id, shop_id, customer_id, vehicle_id, status, scheduled_at, total_price_cents, created_by_user_id) VALUES
  (@sess1, @shop_id, @cust1, @veh1, 'booked', DATE_ADD(NOW(), INTERVAL 1 DAY), 16500, @owner_id);

INSERT INTO session_services (session_id, service_id, price_cents) VALUES
  (@sess1, @svc3, 16500);
*/
