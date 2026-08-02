# Branding — recommandations (marque provisoire → marque définitive)

La marque définitive de l'application est **OScore** ; une marque provisoire antérieure a
été retirée. La marque est **centralisée** : tout le texte et les assets de marque proviennent de
`src/app/core/branding.ts` et du composant `<app-brand-logo>`. Pour rebrander, éditer ce
fichier et déposer le logo final — aucune marque n'est codée en dur ailleurs.

Ce document recommande une direction artistique pour le logo définitif. **Le logo n'est pas
généré ici** ; ces éléments servent de brief au créateur.

---

## 1. Centralisation réalisée (où intervenir)

| Élément | Emplacement |
|---|---|
| Nom, baseline, partenaire, chemin du logo | `core/branding.ts` (constante `BRANDING`) |
| Rendu du logo (sidebar, login) | `shared/components/ui/brand-logo.component.ts` |
| Titre de l'onglet navigateur | `src/index.html` (`<title>`) |
| Favicon | `src/favicon.ico` (à remplacer) |
| Mention partenaire | *(retirée — aucune marque partenaire n'est affichée)* |

Déposer le logo définitif dans `src/assets/` et renseigner `BRANDING.logoPath` : le composant
`brand-logo` bascule automatiquement du rendu typographique vers l'image.

## 2. Style de logo recommandé

- **Type : logotype + symbole** (monogramme) combinables. Un symbole compact fonctionne dans
  la sidebar repliée (rail 76 px) et en favicon ; le logotype complet sert au login et aux exports.
- **Registre : fintech sérieux et sobre.** Formes géométriques, angles légèrement arrondis,
  trait net. Éviter les dégradés complexes (mauvais rendu en impression N&B des rapports).
- **Concept de symbole** : idée de « score / jauge / trajectoire de risque » — par ex. un arc
  ou demi-jauge (cohérent avec la jauge de score de l'app), une flèche ascendante contenue, ou
  un monogramme « O » formé d'un anneau de progression. Doit rester lisible à 16 px (favicon).

## 3. Palette couleur (dérivée de l'app actuelle)

L'application utilise déjà un système de tokens cohérent — le logo doit s'y aligner.

| Rôle | Couleur | Hex | Usage |
|---|---|---|---|
| Accent primaire | Orange (accent marque) | `#E8621A` | Marque, actions primaires, jauge moyenne |
| Encre / fond sombre | Bleu nuit | `#1A1A2E` | Sidebar, texte de titre, fond du logo |
| Succès / risque faible | Vert | `#2D9C6A` | États positifs |
| Danger / risque élevé | Rouge | `#D94040` | Alertes, risque élevé |
| Info | Bleu | `#1A6FD4` | Liens, informations |
| Neutres | Gris | `#F5F5F7` → `#888` | Fonds, textes secondaires |

**Recommandation logo** : monochrome bleu nuit `#1A1A2E` avec un accent orange `#E8621A` sur le
symbole. Prévoir une **déclinaison monochrome** (blanc sur fond sombre pour la sidebar, N&B pour
l'impression des rapports).

## 4. Typographie

L'app utilise déjà deux familles (Google Fonts) — les réutiliser assure la cohérence :

- **Titrage / logotype : Sora** (géométrique, moderne) — déjà la police d'affichage de l'app.
- **Texte courant : DM Sans** (humaniste, lisible) — déjà la police de corps.
- Pour le logotype : Sora **700**, léger resserrement (`letter-spacing: -0.3px`), l'accent
  (« Scoring ») pouvant être en poids plus léger ou en orange pour marquer la hiérarchie.

## 5. Direction générale (brief)

> Plateforme bancaire d'aide à la décision, à destination d'analystes et superviseurs crédit.
> La marque doit inspirer **rigueur, confiance et intelligence** — pas de fantaisie. Sobriété
> institutionnelle proche des outils de risque bancaires, avec une touche « IA / data » discrète
> (le symbole de jauge/score). Fonctionner en clair comme en sombre, en couleur comme en N&B,
> et rester net de 16 px (favicon) à une bannière d'export PDF.

**Livrables à demander au créateur** : logo horizontal (logotype + symbole), symbole seul,
favicon 32×32 et 16×16, versions monochromes (blanc / noir), formats SVG (web) + PNG (fallback).

## 6. Mentions partenaire

Aucune mention partenaire n'est affichée : la marque présentée est uniquement **OScore**
(centralisée dans `core/branding.ts`). L'application est un projet académique indépendant et
ne se présente pas comme un produit officiel d'un partenaire.
