<?php
/**
 * ============================================================
 * Hôtel Belle Étoile — REST API
 * UE 6.3.2 PWA · Activité 2 · Mikail Lekesiz
 *
 * Endpoints:
 *   POST  /api.php              → crée une réservation, retourne le code
 *   GET   /api.php?code=XXXXXX  → consulte une réservation existante
 * ============================================================
 */

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

// ---------- Connexion DB ----------
$config = require __DIR__ . '/config.php';
try {
    $dsn = sprintf(
        'mysql:host=%s;dbname=%s;charset=%s',
        $config['host'],
        $config['database'],
        $config['charset']
    );
    $pdo = new PDO($dsn, $config['username'], $config['password'], [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error'   => 'Erreur de connexion à la base de données.',
    ]);
    exit;
}

/* ---------- Auto-création de la table (idempotent) ---------- */
try {
    $pdo->exec(<<<SQL
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
            INDEX idx_created (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    SQL);
} catch (Throwable $e) {
    // Tabela zaten varsa veya başka schema sorunu — sessizce devam et
}

// ---------- Helpers ----------
/**
 * Génère un code lisible de 6 caractères, sans 0/O/1/I/L (pour éviter la confusion).
 */
function generate_code(PDO $pdo): string {
    $alphabet = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
    $max = strlen($alphabet) - 1;
    for ($tries = 0; $tries < 20; $tries++) {
        $code = '';
        for ($i = 0; $i < 6; $i++) {
            $code .= $alphabet[random_int(0, $max)];
        }
        $stmt = $pdo->prepare('SELECT 1 FROM reservations WHERE code = ? LIMIT 1');
        $stmt->execute([$code]);
        if (!$stmt->fetchColumn()) {
            return $code;
        }
    }
    throw new RuntimeException('Impossible de générer un code unique.');
}

function read_json_body(): array {
    $raw = file_get_contents('php://input');
    if ($raw === '' || $raw === false) return [];
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function send(array $payload, int $status = 200): void {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

// ---------- Routing ----------
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    // Lookup by code
    $code = strtoupper(trim($_GET['code'] ?? ''));
    if ($code === '' || !preg_match('/^[A-Z0-9]{6}$/', $code)) {
        send(['success' => false, 'error' => 'Code invalide.'], 400);
    }
    $stmt = $pdo->prepare(
        'SELECT code, nom, adultes, enfants, date_arrivee, date_depart, option_choisie, created_at
           FROM reservations
          WHERE code = ?
          LIMIT 1'
    );
    $stmt->execute([$code]);
    $row = $stmt->fetch();
    if (!$row) {
        send(['success' => false, 'error' => 'Aucune réservation trouvée pour ce code.'], 404);
    }
    send(['success' => true, 'reservation' => $row]);
}

if ($method === 'POST') {
    $data = read_json_body();
    if (empty($data)) {
        // Fallback : formulaires classiques POST
        $data = $_POST;
    }

    // Validation
    $nom            = trim((string)($data['nom'] ?? ''));
    $adultes        = (int)($data['adultes'] ?? 0);
    $enfants        = (int)($data['enfants'] ?? 0);
    $date_arrivee   = trim((string)($data['arrivee'] ?? ''));
    $date_depart    = trim((string)($data['depart'] ?? ''));
    $option_choisie = (string)($data['option'] ?? 'aucune');

    $errors = [];
    if (mb_strlen($nom) < 2)                              $errors[] = 'Nom requis (2 caractères minimum).';
    if ($adultes < 1 || $adultes > 20)                    $errors[] = 'Nombre d\'adultes invalide.';
    if ($enfants < 0 || $enfants > 20)                    $errors[] = 'Nombre d\'enfants invalide.';
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date_arrivee)) $errors[] = 'Date d\'arrivée invalide.';
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date_depart))  $errors[] = 'Date de départ invalide.';
    if (empty($errors) && $date_depart <= $date_arrivee)  $errors[] = 'La date de départ doit être après la date d\'arrivée.';
    if (!in_array($option_choisie, ['aucune','repas','vehicule'], true))
                                                          $errors[] = 'Option invalide.';

    if (!empty($errors)) {
        send(['success' => false, 'error' => implode(' ', $errors)], 400);
    }

    try {
        $code = generate_code($pdo);
        $stmt = $pdo->prepare(
            'INSERT INTO reservations
                 (code, nom, adultes, enfants, date_arrivee, date_depart, option_choisie)
             VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $code, $nom, $adultes, $enfants,
            $date_arrivee, $date_depart, $option_choisie,
        ]);
    } catch (Throwable $e) {
        send(['success' => false, 'error' => 'Impossible d\'enregistrer la réservation.'], 500);
    }

    send([
        'success' => true,
        'code'    => $code,
        'message' => sprintf('Réservation enregistrée pour %s. Votre code : %s', $nom, $code),
    ], 201);
}

send(['success' => false, 'error' => 'Méthode non autorisée.'], 405);
