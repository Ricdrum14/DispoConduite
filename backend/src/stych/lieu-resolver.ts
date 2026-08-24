/**
 * Structure confirmée sur un vrai payload capturé le 2026-08-17 :
 * rowsPointDeCours[i] = { id_liste_adresse_cours, intitule, adresse,
 * adresse_cp_ville, ville, code_postal, ... } — la clé de jointure avec
 * rowsProposition[i].id_lac est `id_liste_adresse_cours`, pas `id_lac`/`id`
 * comme on le supposait initialement. `intitule` (ex: "Agence Stych
 * Strasbourg") est le libellé le plus lisible.
 */
export function resolveLieuName(pointsDeCours: unknown, idLac: string | undefined): string | null {
  if (!idLac || !Array.isArray(pointsDeCours)) return null;

  const match = pointsDeCours.find((p) => {
    const candidate = p as Record<string, unknown> | null;
    const candidateId = candidate?.id_liste_adresse_cours ?? candidate?.id_lac ?? candidate?.id;
    return candidateId !== undefined && String(candidateId) === idLac;
  }) as Record<string, unknown> | undefined;

  if (!match) return null;

  // Adresse exacte plutôt que le libellé générique de l'agence — c'est ce
  // que Stych affiche lui-même sur sa page de réservation.
  const name = match.adresse_cp_ville ?? match.intitule ?? match.ville ?? match.adresse;
  return typeof name === 'string' && name.trim() ? name : null;
}
