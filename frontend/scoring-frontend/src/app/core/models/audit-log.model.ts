export interface AuditLog {
  id?: string;
  userId: string;
  action: string;
  ressource: string;
  ressourceId: string;
  ancienneValeur?: any;
  nouvelleValeur?: any;
  dateCreation?: string;
}
