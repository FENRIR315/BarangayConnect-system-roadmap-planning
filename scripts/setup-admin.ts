// scripts/setup-admin.ts
// Usage: npx tsx scripts/setup-admin.ts
// Creates the first admin user (barangay captain) using the Supabase service role.
// Run this ONCE after deploying and running the SQL migrations.

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const email = "admin@barangayconnect.com";
  const password = process.env.ADMIN_PASSWORD ?? "Admin@123456";
  const firstName = "Juan";
  const lastName = "Dela Cruz";

  console.log(`Creating admin user: ${email}`);

  const { data: existingUsers } = await admin.auth.admin.listUsers();
  const existing = existingUsers?.users?.find((u) => u.email === email);

  let userId: string;

  if (existing) {
    console.log(`User ${email} already exists (${existing.id}). Updating metadata...`);
    userId = existing.id;
  } else {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        role: "captain",
      },
    });

    if (createError) {
      console.error("Failed to create user:", createError.message);
      process.exit(1);
    }

    userId = created.user.id;
    console.log(`User created: ${userId}`);
  }

  // Upsert into the public users table
  const { error: upsertError } = await admin
    .from("users")
    .upsert(
      {
        id: userId,
        first_name: firstName,
        last_name: lastName,
        role: "captain",
        phone: "09171234567",
      },
      { onConflict: "id" }
    );

  if (upsertError) {
    console.error("Failed to upsert users table:", upsertError.message);
    process.exit(1);
  }

  // Also create a resident record for the captain
  const { data: existingResident } = await admin
    .from("residents")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (!existingResident) {
    const { error: resErr } = await admin.from("residents").insert({
      user_id: userId,
      first_name: firstName,
      last_name: lastName,
      dob: "1975-06-12",
      sex: "male",
      civil_status: "married",
      address: "123 Barangay Road",
      purok: "Purok 1",
      residency_status: "active",
    });

    if (resErr) {
      console.error("Failed to create resident record:", resErr.message);
    } else {
      console.log("Resident record created for admin.");
    }
  }

  // Create an officials record
  const { data: resident } = await admin
    .from("residents")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (resident) {
    const { error: offErr } = await admin.from("officials").upsert(
      {
        user_id: userId,
        resident_id: resident.id,
        position: "captain",
        is_active: true,
      },
      { onConflict: "id", ignoreDuplicates: true }
    );

    if (offErr && !offErr.message.includes("duplicate")) {
      console.error("Failed to create officials record:", offErr.message);
    } else {
      console.log("Officials record created for admin.");
    }
  }

  console.log("\nAdmin setup complete.");
  console.log(`  Email:    ${email}`);
  console.log(`  Password: ${password}`);
  console.log("  Role:     captain");
  console.log("\nChange the password after first login.");
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
