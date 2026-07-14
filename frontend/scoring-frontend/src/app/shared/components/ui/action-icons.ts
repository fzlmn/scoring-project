/**
 * Iconographie centralisée de l'application (Material Symbols Rounded).
 *
 * Une action = une icône, partout. Toute icône d'action doit venir d'ici pour
 * garantir que « Rafraîchir », « Recalculer », « Simulation », « Validation »…
 * sont visuellement identiques quelle que soit la page.
 */
export const ACTION_ICONS = {
  // Rafraîchir et Recalculer partagent la même icône (même geste : recalculer/recharger)
  refresh: 'refresh',
  recalculate: 'refresh',

  simulation: 'science',        // feature Simulation + « Nouvelle simulation »
  simulationHistory: 'history', // historique des simulations

  validation: 'fact_check',     // valider / file de validation
  approve: 'check_circle',
  reject: 'cancel',

  client: 'group',              // liste des clients
  clientSingle: 'person',       // un client
  newClient: 'person_add',

  alerts: 'notifications',
  scores: 'monitoring',
  dashboard: 'dashboard',

  view: 'visibility',
  edit: 'edit',
  export: 'download',
  report: 'description',
  back: 'arrow_back',
  forward: 'arrow_forward',
} as const;

export type ActionIcon = keyof typeof ACTION_ICONS;
