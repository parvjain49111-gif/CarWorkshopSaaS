const randomId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
const delay = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));

const now = Date.now();
const makeDate = (daysAgo: number) => new Date(now - daysAgo * 86400000).toISOString();

const demoUser = {
  user_id: "user_demo_owner",
  email: "owner@demo.local",
  name: "Demo Owner",
  picture: "",
  role: "owner",
};

let currentToken: string | null = null;
let currentUser = { ...demoUser };

const jobs = [
  {
    job_id: "job_demo_001",
    customer_name: "Aditi Mehra",
    customer_phone: "+91 98765 43210",
    car_name: "Hyundai Creta",
    car_number: "KA01AB1234",
    model_year: "2022",
    reference: "Walk-in",
    customer_problems: "Engine noise, service light on",
    mechanic_findings: "Oil leak from valve cover gasket, spark plug service due",
    spare_parts: [
      { name: "Valve cover gasket", quantity: 1, price: 2200, status: "installed" },
      { name: "Spark plugs", quantity: 4, price: 350, status: "installed" },
    ],
    photos: {
      front: null,
      back: null,
      left: null,
      right: null,
    },
    status: "completed",
    assigned_mechanic: "Rohit",
    estimated_cost: 4200,
    created_by: demoUser.user_id,
    created_at: makeDate(10),
    updated_at: makeDate(8),
  },
  {
    job_id: "job_demo_002",
    customer_name: "Nisha Kapoor",
    customer_phone: "+91 91234 56789",
    car_name: "Maruti Baleno",
    car_number: "MH02CD5678",
    model_year: "2019",
    reference: "Referral",
    customer_problems: "Brake noise, AC weak",
    mechanic_findings: "Front pads worn, AC low on refrigerant",
    spare_parts: [
      { name: "Brake pads", quantity: 1, price: 1800, status: "ordered" },
      { name: "AC gas refill", quantity: 1, price: 1200, status: "pending" },
    ],
    photos: {
      front: null,
      back: null,
      left: null,
      right: null,
    },
    status: "in_progress",
    assigned_mechanic: "Priya",
    estimated_cost: 3000,
    created_by: demoUser.user_id,
    created_at: makeDate(3),
    updated_at: makeDate(2),
  },
  {
    job_id: "job_demo_003",
    customer_name: "Rahul Sharma",
    customer_phone: "+91 99887 77665",
    car_name: "Toyota Innova",
    car_number: "DL04EF9012",
    model_year: "2017",
    reference: "Insurance",
    customer_problems: "Battery dead, headlight flickers",
    mechanic_findings: "Battery replacement recommended, alternator check pending",
    spare_parts: [
      { name: "Car battery", quantity: 1, price: 5600, status: "pending" },
    ],
    photos: {
      front: null,
      back: null,
      left: null,
      right: null,
    },
    status: "pending",
    assigned_mechanic: "",
    estimated_cost: 5600,
    created_by: demoUser.user_id,
    created_at: makeDate(1),
    updated_at: makeDate(1),
  },
];

function authorize(headers: Record<string, string> = {}) {
  const auth = headers["Authorization"] || headers["authorization"] || "";
  if (!auth.startsWith("Bearer ")) {
    throw { status: 401, detail: "Missing bearer token" };
  }
  const token = auth.split(" ", 2)[1];
  if (!token || token !== currentToken) {
    throw { status: 401, detail: "Invalid session" };
  }
  return currentUser;
}

function filterJobs(query: URLSearchParams) {
  const q = query.get("q")?.toLowerCase() || "";
  const status = query.get("status") || "";
  return jobs
    .filter((job) => {
      if (status && status !== "all" && job.status !== status) return false;
      if (!q) return true;
      return [job.car_number, job.customer_name, job.car_name]
        .join(" ")
        .toLowerCase()
        .includes(q);
    })
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

function buildStats() {
  const counts = jobs.reduce(
    (acc, job) => {
      acc.total += 1;
      acc[job.status] = (acc[job.status] || 0) + 1;
      return acc;
    },
    { total: 0, pending: 0, in_progress: 0, completed: 0 } as Record<string, number>,
  );
  return {
    total: counts.total,
    pending: counts.pending,
    in_progress: counts.in_progress,
    completed: counts.completed,
    recent: jobs.slice(0, 5),
  };
}

function buildAnalytics() {
  const nowDate = new Date();
  const status_counts = { pending: 0, in_progress: 0, completed: 0 };
  const dailyBuckets: Record<string, number> = {};
  const brandCounts: Record<string, number> = {};
  const refCounts: Record<string, number> = {};
  const wordCounts: Record<string, number> = {};
  const customerCounts: Record<string, number> = {};
  const mechCounts: Record<string, number> = {};
  const empCounts: Record<string, any> = {};
  let revenue_total = 0;
  let revenue_completed = 0;
  let parts_total = 0;
  const durations: number[] = [];

  for (const job of jobs) {
    status_counts[job.status] += 1;
    const createdAt = new Date(job.created_at);
    const deltaDays = Math.floor((nowDate.getTime() - createdAt.getTime()) / 86400000);
    if (deltaDays <= 13) {
      const key = createdAt.toISOString().slice(0, 10);
      dailyBuckets[key] = (dailyBuckets[key] || 0) + 1;
    }
    const brand = job.car_name.split(" ")[0] || "Other";
    brandCounts[brand] = (brandCounts[brand] || 0) + 1;
    const reference = job.reference?.trim() || "Walk-in";
    refCounts[reference] = (refCounts[reference] || 0) + 1;
    const words = (job.customer_problems || "").toLowerCase().split(/[^a-z]+/g);
    for (const w of words) {
      if (w.length < 3) continue;
      if (["and", "the", "for", "with", "from", "your", "car", "repair"].includes(w)) continue;
      wordCounts[w] = (wordCounts[w] || 0) + 1;
    }
    if (job.customer_name) customerCounts[job.customer_name] = (customerCounts[job.customer_name] || 0) + 1;
    if (job.assigned_mechanic) mechCounts[job.assigned_mechanic] = (mechCounts[job.assigned_mechanic] || 0) + 1;

    for (const part of job.spare_parts || []) {
      const qty = part.quantity || 1;
      const price = part.price || 0;
      revenue_total += qty * price;
      parts_total += qty;
      if (job.status === "completed") revenue_completed += qty * price;
    }

    if (job.status === "completed") {
      const updatedAt = new Date(job.updated_at);
      const seconds = (updatedAt.getTime() - createdAt.getTime()) / 3600000;
      if (seconds > 0) durations.push(seconds);
    }

    const uid = job.created_by;
    const row = empCounts[uid] || { intake: 0, pending: 0, in_progress: 0, completed: 0, today: 0, week: 0, month: 0 };
    row.intake += 1;
    row[job.status] += 1;
    if (deltaDays < 1) row.today += 1;
    if (deltaDays <= 7) row.week += 1;
    if (deltaDays <= 30) row.month += 1;
    empCounts[uid] = row;
  }

  const daily_series = Array.from({ length: 14 }, (_, i) => {
    const day = new Date(nowDate.getTime() - (13 - i) * 86400000).toISOString().slice(0, 10);
    return { date: day, count: dailyBuckets[day] || 0 };
  });

  const brands = Object.entries(brandCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, count]) => ({ label, count }));
  const references = Object.entries(refCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, count]) => ({ label, count }));
  const issues = Object.entries(wordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, count]) => ({ label: label.toUpperCase(), count }));
  const top_customers = Object.entries(customerCounts)
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, count]) => ({ label, count }));
  const mechanics = Object.entries(mechCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, count]) => ({ label, count }));
  const employees = Object.entries(empCounts)
    .map(([user_id, stats]) => ({ user_id, name: currentUser.name, role: currentUser.role, ...stats }))
    .sort((a, b) => b.intake - a.intake);

  return {
    total_jobs: jobs.length,
    status_counts,
    intake_7d: daily_series.reduce((sum, row) => sum + row.count, 0),
    intake_30d: jobs.filter((job) => new Date(job.created_at) >= new Date(nowDate.getTime() - 30 * 86400000)).length,
    daily_series,
    brands,
    references,
    issues,
    revenue_total: parseFloat(revenue_total.toFixed(2)),
    revenue_completed: parseFloat(revenue_completed.toFixed(2)),
    parts_total,
    avg_turnaround_hours: durations.length ? parseFloat((durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(1)) : null,
    completed_count: status_counts.completed,
    top_customers,
    mechanics,
    employees,
    unique_customers: Object.keys(customerCounts).length,
  };
}

function serializeCsv() {
  const headers = [
    "job_id",
    "created_at",
    "updated_at",
    "status",
    "customer_name",
    "customer_phone",
    "reference",
    "car_name",
    "car_number",
    "model_year",
    "customer_problems",
    "mechanic_findings",
    "spare_parts_count",
    "spare_parts_total_price",
    "spare_parts_detail",
    "photos_count",
    "photo_front",
    "photo_back",
    "photo_left",
    "photo_right",
  ];
  const rows = [headers.join(",")];
  for (const job of jobs) {
    const parts = job.spare_parts || [];
    const totalPrice = parts.reduce((sum, p) => sum + (p.price || 0) * (p.quantity || 1), 0);
    const partsDetail = parts.map((p) => `${p.name} x${p.quantity} (${p.status})`).join(" | ");
    const photos = job.photos || {};
    const photoKeys = ["front", "back", "left", "right"];
    const photosCount = photoKeys.filter((key) => photos[key]).length;
    rows.push([
      job.job_id,
      job.created_at,
      job.updated_at,
      job.status,
      job.customer_name,
      job.customer_phone || "",
      job.reference || "",
      job.car_name,
      job.car_number,
      job.model_year || "",
      JSON.stringify(job.customer_problems || ""),
      JSON.stringify(job.mechanic_findings || ""),
      String(parts.length),
      totalPrice.toFixed(2),
      JSON.stringify(partsDetail),
      String(photosCount),
      photos.front ? "yes" : "",
      photos.back ? "yes" : "",
      photos.left ? "yes" : "",
      photos.right ? "yes" : "",
    ].join(","));
  }
  return rows.join("\n");
}

function parsePath(path: string) {
  const url = new URL(path, "http://localhost");
  return { pathname: url.pathname, searchParams: url.searchParams };
}

export const mockApi = {
  async login(email?: string) {
    await delay();
    currentToken = randomId("token");
    if (email) currentUser.email = email;
    currentUser = { ...demoUser, email: currentUser.email };
    return { accessToken: currentToken, refreshToken: currentToken, user: currentUser };
  },

  async exchangeSession(_session_id: string) {
    return this.login();
  },

  async refresh(refreshToken: string) {
    await delay();
    if (!currentToken || refreshToken !== currentToken) {
      throw { status: 401, detail: "Invalid refresh token" };
    }
    currentToken = randomId("token");
    return { accessToken: currentToken, refreshToken: currentToken, user: currentUser };
  },

  async me(headers: Record<string, string>) {
    await delay();
    authorize(headers);
    return currentUser;
  },

  async logout(headers: Record<string, string>) {
    await delay();
    authorize(headers);
    currentToken = null;
    return { ok: true };
  },

  async listJobs(query: URLSearchParams, headers: Record<string, string>) {
    await delay();
    authorize(headers);
    return filterJobs(query);
  },

  async getJob(jobId: string, headers: Record<string, string>) {
    await delay();
    authorize(headers);
    const job = jobs.find((item) => item.job_id === jobId);
    if (!job) throw { status: 404, detail: "Job not found" };
    return job;
  },

  async createJob(body: any, headers: Record<string, string>) {
    await delay();
    const user = authorize(headers);
    const nowIso = new Date().toISOString();
    const newJob = {
      job_id: randomId("job"),
      customer_name: body.customer_name || "Unknown",
      customer_phone: body.customer_phone || "",
      car_name: body.car_name || "Unknown Car",
      car_number: (body.car_number || "").toUpperCase(),
      model_year: body.model_year || "",
      reference: body.reference || "Walk-in",
      customer_problems: body.customer_problems || "",
      mechanic_findings: null,
      spare_parts: body.spare_parts || [],
      photos: body.photos || { front: null, back: null, left: null, right: null },
      status: "pending",
      assigned_mechanic: null,
      estimated_cost: null,
      created_by: user.user_id,
      created_at: nowIso,
      updated_at: nowIso,
    };
    jobs.unshift(newJob);
    return newJob;
  },

  async updateJob(jobId: string, body: any, headers: Record<string, string>) {
    await delay();
    const user = authorize(headers);
    const idx = jobs.findIndex((item) => item.job_id === jobId);
    if (idx === -1) throw { status: 404, detail: "Job not found" };
    const job = jobs[idx];
    const updated = {
      ...job,
      ...body,
      updated_at: new Date().toISOString(),
    };
    if (body.spare_parts) updated.spare_parts = body.spare_parts;
    jobs[idx] = updated;
    return updated;
  },

  async stats(headers: Record<string, string>) {
    await delay();
    authorize(headers);
    return buildStats();
  },

  async analytics(headers: Record<string, string>) {
    await delay();
    authorize(headers);
    return buildAnalytics();
  },

  async exportCsv(headers: Record<string, string>) {
    await delay();
    authorize(headers);
    return serializeCsv();
  },
};

export const isMockApi = () => !process.env.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_USE_MOCK === "1";
