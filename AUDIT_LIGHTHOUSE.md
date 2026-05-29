# UE 6.3.2 PWA — Audit Lighthouse

**Site:** https://mikaillekesiz.alwaysdata.net/6-3-2-pwa/
**Auteur:** Mikail Lekesiz — LP DWCA 2025/2026
**Date:** 29 mai 2026, 19:09 (Paris)
**Outil:** Google PageSpeed Insights (Lighthouse hébergé)
**Rapport partageable:** https://pagespeed.web.dev/analysis/https-mikaillekesiz-alwaysdata-net-6-3-2-pwa/1aki3795np

---

## 🖥️ Desktop (Bureau)

| Catégorie | Score | Note |
|---|---|---|
| ⚡ Performances | **100 / 100** | 🟢 Excellent |
| ♿ Accessibilité | **100 / 100** | 🟢 Excellent |
| ✅ Bonnes pratiques | **100 / 100** | 🟢 Excellent |
| 🔍 SEO | **92 / 100** | 🟢 Bon (zone verte) |

## 📱 Mobile

| Catégorie | Score | Note |
|---|---|---|
| ⚡ Performances | **99 / 100** | 🟢 Excellent |
| ♿ Accessibilité | **100 / 100** | 🟢 Excellent |
| ✅ Bonnes pratiques | **100 / 100** | 🟢 Excellent |
| 🔍 SEO | **92 / 100** | 🟢 Bon |

---

## ✅ Points forts observés

- HTML5 sémantique (`header`, `main`, `section`, `form`, `footer`)
- Attributs ARIA et labels accessibles (sr-only, aria-required, aria-label)
- Meta description + theme-color
- Image avec `alt` descriptif + dimensions explicites (`width`/`height`)
- Preconnect vers Unsplash CDN
- `defer` sur le script JS
- Aucun render-blocking critique
- HTTPS actif (TLS Let's Encrypt via AlwaysData)
- Responsive : breakpoints 480px et 900px

## 🟡 Le point manquant (SEO 92 vs 100)

Le 8 points de différence en SEO vient probablement de :
- Absence de `robots.txt` (alwaysdata ne le sert pas par défaut)
- Ou pas de `<link rel="canonical">` explicite

Ces deux ajustements sont mineurs et peuvent être améliorés dans une V2.

---

## 📸 Capture d'écran pour DigitalUni

Le rapport PageSpeed est ouvert dans Chrome.

**Pour capturer :**
- Mac : `Cmd + Shift + 4` puis sélectionne la zone des scores (les 4 cercles)
- Le fichier sera sauvegardé sur le Bureau sous le nom `Capture d'écran ...`

**Recommandation :** capture les deux vues (Desktop + Mobile) — il suffit de cliquer sur l'onglet Mobile / Bureau en haut du rapport.

Le rapport partageable peut aussi être joint comme URL : voir lien plus haut.

---

## 🔗 Liens utiles

- **Site live:** https://mikaillekesiz.alwaysdata.net/6-3-2-pwa/
- **Code source:** https://github.com/lekesiz/6.3.2-PWA
- **Rapport PageSpeed:** https://pagespeed.web.dev/analysis/https-mikaillekesiz-alwaysdata-net-6-3-2-pwa/1aki3795np
