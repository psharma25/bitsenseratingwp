// shared manual-fill helper (Load sample data button was removed by design)
export function fillValidForm(doc, overrides = {}) {
  const v = Object.assign({
    orgName: 'Acme Regional Medical Center',
    sector: 'Healthcare / Medical Devices',
    contactName: 'Test CISO',
    contactEmail: 'ciso@acme-health.example',
    contactPhone: '+1 508 555 0142',
    incidentDate: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
    variant: 'LockBit 3.0',
    ransomUsd: '2500000',
    systemsCount: '140',
    description: 'Ransom note discovered on radiology workstations; imaging encrypted; PHI exfil suspected.'
  }, overrides);
  for (const [id, val] of Object.entries(v)) {
    const el = doc.getElementById(id);
    if (el) el.value = val;
  }
  const flags = Object.assign({ fEncrypted: true, fExfil: true, fOpsDown: true, fBackups: false, fPaid: false },
    overrides.flags || {});
  for (const [id, val] of Object.entries(flags)) doc.getElementById(id).checked = val;
}
