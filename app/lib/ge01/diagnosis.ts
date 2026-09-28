export type DiagnosisAssignee = { employeeCode: string; label: string };

export function readDiagnosisAssignees(value: unknown): Map<string, DiagnosisAssignee[]> {
  if (!Array.isArray(value)) throw new Error('Liste des agents habilités invalide.');
  const byReference = new Map<string, DiagnosisAssignee[]>();
  for (const row of value) {
    if (!row || typeof row.reference !== 'string' || typeof row.employeeCode !== 'string'
      || !row.employeeCode.trim() || typeof row.label !== 'string') {
      throw new Error('Agent habilité invalide.');
    }
    const list = byReference.get(row.reference) ?? [];
    list.push({ employeeCode: row.employeeCode, label: row.label });
    byReference.set(row.reference, list);
  }
  return byReference;
}
