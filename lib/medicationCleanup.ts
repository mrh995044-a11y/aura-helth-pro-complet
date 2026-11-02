import type { Vault } from './types';

// Remove only explicitly tagged demo medicines, retaining all real records.
export function withoutSampleMedicines(vault: Vault): Vault {
  const sampleIds = new Set((vault.meds || []).filter(med => med.sample).map(med => med.id));
  return {
    ...vault,
    meds: (vault.meds || []).filter(med => !med.sample),
    doses: (vault.doses || []).filter(dose => !sampleIds.has(dose.medId)),
  };
}
