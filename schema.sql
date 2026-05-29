-- ============================================================
-- UE 6.3.2 PWA · Activité 2 · Mikail Lekesiz
-- Schéma de la base de données pour les réservations
-- ============================================================

-- Table principale : reservations
CREATE TABLE IF NOT EXISTS reservations (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code            VARCHAR(8)   NOT NULL UNIQUE,
    nom             VARCHAR(120) NOT NULL,
    adultes         TINYINT UNSIGNED NOT NULL DEFAULT 1,
    enfants         TINYINT UNSIGNED NOT NULL DEFAULT 0,
    date_arrivee    DATE NOT NULL,
    date_depart     DATE NOT NULL,
    option_choisie  ENUM('aucune','repas','vehicule') NOT NULL DEFAULT 'aucune',
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_code (code),
    INDEX idx_created (created_at),
    CHECK (date_depart > date_arrivee),
    CHECK (adultes BETWEEN 1 AND 20),
    CHECK (enfants BETWEEN 0 AND 20)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
