<?php
/**
 * Hôtel Belle Étoile — Database configuration
 * UE 6.3.2 PWA · Activité 2
 *
 * INSTRUCTIONS:
 * 1. Copier ce fichier en config.php  :  cp config.example.php config.php
 * 2. Remplir les valeurs ci-dessous avec celles de votre base alwaysdata
 * 3. Ne JAMAIS committer config.php  (il est dans .gitignore)
 */

return [
    // Host MySQL (alwaysdata → MySQL → "Hôte" — généralement "mysql-USERNAME.alwaysdata.net")
    'host'     => 'mysql-mikaillekesiz.alwaysdata.net',

    // Nom de la base (alwaysdata → MySQL → nom que vous avez choisi, ex. "mikaillekesiz_pwa")
    'database' => 'mikaillekesiz_pwa',

    // Utilisateur MySQL (par défaut alwaysdata crée un user au même nom que votre login)
    'username' => 'mikaillekesiz',

    // Mot de passe de cet utilisateur MySQL
    'password' => 'CHANGE_ME',

    // Charset (laisser utf8mb4)
    'charset'  => 'utf8mb4',
];
