/**
 * Branding centralisé de l'application (OScore).
 *
 * Pour rebrander, il suffit de modifier ce fichier (et de remplacer les assets
 * `logoPath` / `sidebarLogoPath` / `iconPath`) — aucune autre partie du code ne
 * code la marque en dur. Les assets sont des PNG haute résolution à fond
 * transparent (plus nets que des SVG auto-vectorisés) ; ne pas re-vectoriser.
 */
export const BRANDING = {
  /** Nom affiché, découpé en deux parties pour la mise en forme (primaire + accent). */
  namePrimary: 'O',
  nameAccent: 'Score',
  get fullName(): string { return `${this.namePrimary}${this.nameAccent}`; },

  /** Baseline courte (méta, réserve typographique). */
  tagline: 'AI-Powered Credit Risk Platform',

  /** Logo complet avec sous-titre — page de connexion & grandes zones de marque. */
  logoPath: 'assets/branding/Oscore_logo.png' as string,
  /** Logo sidebar sans le sous-titre gris — sidebar dépliée. */
  sidebarLogoPath: 'assets/branding/Oscore_logo_sidebar.png' as string,
  /** Icône seule, carrée — sidebar repliée, splash, favicon. */
  iconPath: 'assets/branding/Oscore_icon.png' as string,
} as const;
