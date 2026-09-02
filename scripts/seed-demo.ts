// scripts/seed-demo.ts
// Usage: npx tsx scripts/seed-demo.ts
// Seeds realistic demo data with Filipino names for the BarangayConnect demo.
// Requires .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing env vars. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(start: Date, end: Date): string {
  const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return d.toISOString().split("T")[0];
}

function randomTime(): string {
  const h = String(Math.floor(Math.random() * 12) + 7).padStart(2, "0");
  const m = String(Math.floor(Math.random() * 12) * 5).padStart(2, "0");
  return `${h}:${m}`;
}

const firstNames = [
  "Maria", "Juan", "Ana", "Pedro", "Rosa", "Jose", "Luz", "Miguel",
  "Carmen", "Antonio", "Elena", "Roberto", "Grace", "Manuel", "Teresa",
  "Francisco", "Lydia", "Ricardo", "Nora", "Carlos", "Dolores", "Fernando",
  "Isabel", "Luis", "Mila", "Enrique", "Lolita", "Ramon", "Nancy", "Eduardo",
  "Rita", "Alfredo", "Pilar", "Ramon", "Evelyn", "Jose", "Marcela",
  "Gerardo", "Leonora", "Dante", "Priscilla", "Romeo", "Zenaida", "Noel",
  "Felicidad", "Leonardo", "Gloria", "Eugene", "Vilma", "Rolando",
];

const lastNames = [
  "Reyes", "Santos", "Dela Cruz", "Garcia", "Mendoza", "Torres", "Tomas",
  "Andres", "Ramos", "Gonzales", "Rivera", "Aquino", "De Leon", "Bautista",
  "Villanueva", "Castro", "Fernandez", "Lopez", "Pascual", "Vergara",
  "Mercado", "Jimenez", "Salazar", "Rosales", "Padilla", "Navarro",
  "Morales", "Santiago", "Enriquez", "Ignacio", "Aguilar", "Solis",
  "Bernardo", "Manalastas", "Ocampo", "Soriano", "Cuevas", "Cruz",
];

const middleNames = ["Santos", "Reyes", "Lopez", "Cruz", "Garcia", "Ramos", "Rivera", "Torres"];

const suffixes = ["Jr.", "Sr.", "II", "III", "IV", ""];

const puroks = ["Purok 1", "Purok 2", "Purok 3", "Purok 4", "Purok 5", "Purok 6"];

const streets = [
  "Mabini St.", "Rizal Ave.", "Bonifacio St.", "Luna St.", "Aguinaldo Blvd.",
  "Magsaysay St.", "Quezon Ave.", "San Jose Road", "Barangay Road", "Sampaguita St.",
  "Dahlia St.", "Jasmine St.", "Mahogany Ave.", "Narra St.", "Acacia St.",
];

const occupations = [
  "Teacher", "Tricycle Driver", "Vendor", "Mechanic", "Farmer",
  "Carpenter", "Construction Worker", "Seaman", "OFW", "Nurse",
  "Government Employee", "Security Guard", "Vendor", "Student",
  "Housewife", "Electrician", "Plumber", "Barangay Tanod",
  "Small Business Owner", "Tutor",
];

const complaints = [
  "Loud music playing past midnight in the neighborhood.",
  "Stray dogs roaming and disturbing residents.",
  "Neighbor constructing without proper permits.",
  "Illegal parking blocking the road access.",
  "Open drainage causing foul smell during rainy season.",
  "Loud karaoke disturbing sleep of nearby residents.",
  "Water supply interruption for more than 24 hours.",
  "Street light not working on Mabini Street.",
  "Trash being dumped in the vacant lot.",
  "Noise from a party that lasted until 3 AM.",
];

const purposes = [
  "Employment requirements",
  "School enrollment",
  "Scholarship application",
  "Business permit application",
  "Senior citizen registration",
  "Financial assistance application",
  "Travel abroad requirements",
  "Legal requirements",
  "Medical assistance application",
  "DSWD assistance application",
  "GSIS/SSS benefit claim",
  "National ID requirement",
];

const incidentDescs = [
  "Small fire reported in Purok 2. No casualties. Fire department responded.",
  "Flash flood in low-lying area. Residents evacuated temporarily.",
  "Minor road accident involving two motorcycles at intersection.",
  "Power outage affecting 50 households due to transformer damage.",
  "Person found unconscious on the street, brought to nearest hospital.",
  "Arrest of suspect for theft at the public market.",
  "Earthquake felt at 4.2 magnitude. No structural damage reported.",
];

async function main() {
  console.log("Seeding demo data for BarangayConnect...\n");

  // Create residents
  const residentData = [];
  const usedNames = new Set<string>();

  for (let i = 0; i < 40; i++) {
    let firstName: string;
    let lastName: string;
    let nameKey: string;

    do {
      firstName = pick(firstNames);
      lastName = pick(lastNames);
      nameKey = `${firstName}_${lastName}`;
    } while (usedNames.has(nameKey));

    usedNames.add(nameKey);

    const middleName = pick(middleNames);
    const suffix = i < 5 ? pick(suffixes.filter(Boolean)) : pick(suffixes);
    const purok = pick(puroks);
    const street = pick(streets);
    const year = 1960 + Math.floor(Math.random() * 40);

    residentData.push({
      first_name: firstName,
      middle_name: middleName,
      last_name: lastName,
      suffix: suffix || null,
      dob: `${year}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, "0")}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, "0")}`,
      sex: pick(["male", "female"]),
      civil_status: pick(["single", "married", "widowed"]),
      address: `${Math.floor(Math.random() * 50) + 1} ${street}`,
      purok,
      contact_number: `0917${String(Math.floor(Math.random() * 10000000)).padStart(7, "0")}`,
      occupation: pick(occupations),
      voter_status: pick(["registered", "unregistered"]),
      residency_status: "active",
    });
  }

  const { data: insertedResidents, error: resErr } = await admin
    .from("residents")
    .insert(residentData)
    .select("id");

  if (resErr) {
    console.error("Failed to insert residents:", resErr.message);
    process.exit(1);
  }

  console.log(`Inserted ${insertedResidents?.length ?? 0} residents.`);

  // Create households (every 3-4 residents share a household)
  const householdData = [];
  const heads = insertedResidents?.slice(0, 12) ?? [];

  for (let i = 0; i < heads.length; i++) {
    const headId = heads[i].id;
    const head = residentData.find((_, idx) => idx === i);

    householdData.push({
      household_number: `H-${String(i + 1).padStart(3, "0")}`,
      address: head?.address,
      purok: head?.purok,
      household_head_id: headId,
      monthly_income: Math.floor(Math.random() * 30000) + 8000,
      house_ownership: pick(["owned", "rented", "living_with_family"]),
      status: "active",
    });
  }

  const { data: insertedHouseholds, error: hhErr } = await admin
    .from("households")
    .insert(householdData)
    .select("id");

  if (hhErr) {
    console.error("Failed to insert households:", hhErr.message);
  } else {
    console.log(`Inserted ${insertedHouseholds?.length ?? 0} households.`);

    // Assign residents to households
    const memberUpdates = [];
    for (let i = 0; i < (insertedResidents?.length ?? 0) && insertedHouseholds; i++) {
      const hhIdx = Math.floor(i / 4);
      if (hhIdx < insertedHouseholds.length) {
        memberUpdates.push({
          household_id: insertedHouseholds[hhIdx].id,
          household_head_id: heads[hhIdx]?.id,
        });
      }
    }

    // Update residents with household_id (batch, up to 40)
    for (const update of memberUpdates) {
      await admin
        .from("residents")
        .update({
          household_id: update.household_id,
        })
        .eq("id", insertedResidents?.[memberUpdates.indexOf(update)]?.id)
        .select();
    }
  }

  // Create document requests
  const docTypes = await admin.from("document_types").select("id, name, fee");
  const requestStatuses = ["submitted", "under_review", "approved", "ready_for_release", "released", "rejected"];
  const requestData = [];

  if (insertedResidents && docTypes.data) {
    for (let i = 0; i < 15; i++) {
      const res = pick(insertedResidents);
      const dt = pick(docTypes.data);

      requestData.push({
        request_number: `DOC-${new Date().getFullYear()}-${String(i + 1).padStart(4, "0")}`,
        resident_id: res.id,
        document_type_id: dt.id,
        purpose: pick(purposes),
        fee: dt.fee || 0,
        status: pick(requestStatuses),
      });
    }

    const { error: reqErr } = await admin.from("document_requests").insert(requestData);
    if (reqErr) console.error("Document requests error:", reqErr.message);
    else console.log(`Inserted ${requestData.length} document requests.`);
  }

  // Create appointments
  const services = await admin.from("appointment_services").select("id");
  const apptStatuses = ["confirmed", "completed", "cancelled", "no_show"];
  const apptData = [];

  if (insertedResidents && services.data) {
    for (let i = 0; i < 10; i++) {
      const res = pick(insertedResidents);
      const svc = pick(services.data);

      apptData.push({
        appointment_number: `APPT-${new Date().getFullYear()}-${String(i + 1).padStart(4, "0")}`,
        resident_id: res.id,
        service_id: svc.id,
        scheduled_date: randomDate(new Date("2026-09-01"), new Date("2026-09-30")),
        scheduled_time: randomTime(),
        purpose: pick(purposes),
        status: pick(apptStatuses),
      });
    }

    const { error: apptErr } = await admin.from("appointments").insert(apptData);
    if (apptErr) console.error("Appointments error:", apptErr.message);
    else console.log(`Inserted ${apptData.length} appointments.`);
  }

  // Create complaints
  const complaintTypes = await admin.from("complaint_types").select("id");
  const complaintStatuses = ["submitted", "under_review", "investigating", "resolved"];
  const compData = [];

  if (insertedResidents && complaintTypes.data) {
    for (let i = 0; i < 8; i++) {
      const res = pick(insertedResidents);
      const ct = pick(complaintTypes.data);

      compData.push({
        complaint_number: `CMP-${new Date().getFullYear()}-${String(i + 1).padStart(4, "0")}`,
        resident_id: res.id,
        complaint_type_id: ct.id,
        description: pick(complaints),
        location: residentData.find((_, idx) => insertedResidents?.[idx]?.id === res.id)?.address,
        date_of_incident: randomDate(new Date("2026-08-01"), new Date("2026-09-01")),
        time_of_incident: randomTime(),
        status: pick(complaintStatuses),
      });
    }

    const { error: compErr } = await admin.from("complaints").insert(compData);
    if (compErr) console.error("Complaints error:", compErr.message);
    else console.log(`Inserted ${compData.length} complaints.`);
  }

  // Create incidents
  const incidentTypes = await admin.from("incident_types").select("id");
  const incidentStatuses = ["open", "investigating", "resolved", "closed"];
  const incData = [];

  if (incidentTypes.data) {
    for (let i = 0; i < 5; i++) {
      const it = pick(incidentTypes.data);

      incData.push({
        incident_number: `INC-${new Date().getFullYear()}-${String(i + 1).padStart(4, "0")}`,
        incident_type_id: it.id,
        date: randomDate(new Date("2026-08-01"), new Date("2026-09-01")),
        time: randomTime(),
        location: `${Math.floor(Math.random() * 50) + 1} ${pick(streets)}`,
        description: pick(incidentDescs),
        status: pick(incidentStatuses),
      });
    }

    const { error: incErr } = await admin.from("incidents").insert(incData);
    if (incErr) console.error("Incidents error:", incErr.message);
    else console.log(`Inserted ${incData.length} incidents.`);
  }

  // Create announcements
  const announcements = [
    {
      title: "Barangay Assembly - September 2026",
      description: "All residents are invited to the regular barangay assembly on September 15, 2026 at 6:00 PM at the Barangay Hall. Agenda includes safety and disaster preparedness.",
      category: "meeting",
      status: "published",
      is_pinned: true,
    },
    {
      title: "Free Health Check-Up Program",
      description: "The barangay health center will conduct free health check-ups on September 10, 2026 from 8:00 AM to 12:00 PM. All residents are welcome to avail of the service.",
      category: "community_program",
      status: "published",
      is_pinned: false,
    },
    {
      title: "Emergency Advisory: Typhoon Season",
      description: "With the typhoon season approaching, residents are advised to prepare emergency kits and keep updated with local advisories. For emergencies, contact the barangay hotline.",
      category: "emergency",
      status: "published",
      is_pinned: false,
    },
    {
      title: "Community Clean-Up Drive",
      description: "Join the barangay clean-up drive this Saturday from 7:00 AM to 11:00 AM. Volunteers are welcome. Gloves and trash bags will be provided.",
      category: "event",
      status: "published",
      is_pinned: false,
    },
  ];

  const { error: annErr } = await admin.from("announcements").insert(
    announcements.map((a) => ({
      ...a,
      published_date: new Date().toISOString(),
    }))
  );
  if (annErr) console.error("Announcements error:", annErr.message);
  else console.log(`Inserted ${announcements.length} announcements.`);

  // Create some payments
  const paymentData = [];

  if (insertedResidents) {
    for (let i = 0; i < 8; i++) {
      const res = pick(insertedResidents);

      paymentData.push({
        resident_id: res.id,
        receipt_number: `PAY-${new Date().getFullYear()}-${String(i + 1).padStart(4, "0")}`,
        amount: pick([50, 100, 150, 200]),
        payment_type: pick(["cash", "gcash"]),
        payment_method: pick(["cash", "electronic"]),
        payment_date: randomDate(new Date("2026-08-01"), new Date("2026-09-01")),
      });
    }

    const { error: payErr } = await admin.from("payments").insert(paymentData);
    if (payErr) console.error("Payments error:", payErr.message);
    else console.log(`Inserted ${paymentData.length} payments.`);
  }

  console.log("\nSeed data complete!");
  console.log("Note: Only residents were created without auth users. Admin users should be created via scripts/setup-admin.ts.");
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
