/**
 * Levée quand Stych répond d'une façon qui indique que le cookie de
 * session / token CSRF stocké n'est plus valide (401/403, ou une réponse
 * qui n'a pas la forme attendue — la session Stych expirée renvoie souvent
 * une page de login HTML à la place du JSON habituel).
 */
export class StychSessionExpiredError extends Error {
  constructor() {
    super('Session Stych expirée ou invalide');
    this.name = 'StychSessionExpiredError';
  }
}
