export function normalizeJob(raw: any) {
  if (!raw) return raw;
  const job_id = raw.job_id || raw.id || raw.jobCardNumber || null;
  const car_number = raw.car_number || raw.registration || raw.vehicle?.registration || "";
  const car_name = raw.car_name || raw.vehicle?.model || raw.carName || "";
  const model_year = raw.model_year || raw.modelYear || raw.vehicle?.modelYear || raw.model_year || null;
  const customer_name = raw.customer_name || raw.customer?.name || raw.customerName || "";
  const mechanic_findings = raw.mechanic_findings || raw.technicianNotes || raw.mechanicFindings || null;
  const spare_parts = (raw.spare_parts || raw.parts || raw.jobPartUsages || []).map((p: any) => ({
    name: p.name || p.partName || "",
    quantity: p.quantity || p.qty || 1,
    price: p.price || p.unitPrice || p.unit_cost || undefined,
    status: p.status || "pending",
  }));
  const photos = raw.photos || { front: null, back: null, left: null, right: null };
  const status = raw.status || raw.vehicleStatus || "pending";
  const assigned_mechanic = raw.assigned_mechanic || raw.assignedMechanic || null;
  const estimated_cost = raw.estimated_cost || raw.totalAmount || raw.estimatedCost || null;
  const created_by = raw.created_by || raw.createdBy || null;
  const created_at = raw.created_at || raw.createdAt || null;
  const updated_at = raw.updated_at || raw.updatedAt || null;

  return {
    job_id,
    car_number,
    car_name,
    model_year,
    customer_name,
    mechanic_findings,
    spare_parts,
    photos,
    status,
    assigned_mechanic,
    estimated_cost,
    created_by,
    created_at,
    updated_at,
    // keep original for advanced usage
    _raw: raw,
  };
}

export function normalizeJobs(rawList: any[]) {
  return (rawList || []).map(normalizeJob);
}
