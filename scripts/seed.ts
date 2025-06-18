import { createClient } from "@supabase/supabase-js";
import { Database } from "../src/lib/supabase/types";

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_LOCAL_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.NEXT_PUBLIC_LOCAL_SUPABASE_SERVICE_ROLE_KEY!;

// Test user credentials
const TEST_USER = {
  email: "test@ninja-url.dev",
  password: "password123",
  user_metadata: {
    full_name: "Test Ninja",
  },
};

// Create Supabase client with service role for admin operations
const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Types for our data
type MetricRecord = {
  url_id: number;
  datetime: string;
  visits: number;
  unique_visitors: number;
  created_at: string;
};

// Utility functions
function generateRealisticTrend(
  baseValue: number,
  dataPoints: number,
  volatility: number = 0.3
): number[] {
  const trend = [];
  let current = baseValue;

  for (let i = 0; i < dataPoints; i++) {
    // Add some growth trend with random volatility
    const growthFactor = 1 + (Math.random() - 0.5) * volatility;
    const trendBonus = i * 0.02; // Slight upward trend over time
    current = Math.max(0, Math.round(current * growthFactor + trendBonus));
    trend.push(current);
  }

  return trend;
}

function getHourlyTimestamps(date: Date): Date[] {
  const timestamps = [];
  const baseDate = new Date(date);
  baseDate.setHours(0, 0, 0, 0); // Start at midnight

  for (let hour = 0; hour < 24; hour++) {
    const timestamp = new Date(baseDate);
    timestamp.setHours(hour);
    timestamps.push(timestamp);
  }

  return timestamps;
}

function getDailyTimestamps(daysBack: number): Date[] {
  const timestamps = [];
  const today = new Date();

  for (let i = daysBack - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0); // Midnight
    timestamps.push(date);
  }

  return timestamps;
}

// Sample URLs with realistic domains
const SAMPLE_URLS = [
  "https://example.com/very-long-article-about-web-development-best-practices",
  "https://github.com/user/awesome-project-with-detailed-readme-file",
  "https://medium.com/@author/comprehensive-guide-to-modern-javascript-frameworks",
  "https://stackoverflow.com/questions/12345/how-to-optimize-database-queries-for-better-performance",
  "https://youtube.com/watch?v=dQw4w9WgXcQ&feature=youtu.be&t=42s",
  "https://docs.company.com/api/v2/reference/authentication-and-authorization-guide",
  "https://blog.tech-startup.com/announcing-our-series-a-funding-round-and-product-updates",
  "https://conference.dev/2024/sessions/building-scalable-microservices-architecture",
  "https://research.university.edu/papers/machine-learning-applications-in-climate-science",
  "https://news.website.com/technology/breakthrough-in-quantum-computing-reaches-new-milestone",
];

async function createTestUser() {
  console.log("Creating test user...");

  // First, try to delete existing user if any
  try {
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers.users.find(
      (u) => u.email === TEST_USER.email
    );

    if (existingUser) {
      console.log("Deleting existing test user...");
      await supabase.auth.admin.deleteUser(existingUser.id);
    }
  } catch (error) {
    console.log("No existing user to delete or error checking:", error);
  }

  // Create new user
  const { data, error } = await supabase.auth.admin.createUser({
    email: TEST_USER.email,
    password: TEST_USER.password,
    user_metadata: TEST_USER.user_metadata,
    email_confirm: true,
  });

  if (error) {
    throw new Error(`Failed to create user: ${error.message}`);
  }

  console.log(`✅ Created test user: ${TEST_USER.email}`);
  return data.user.id;
}

async function clearExistingData(userId: string) {
  console.log("Clearing existing data...");

  // Delete existing URLs (metrics will cascade delete)
  const { error } = await supabase.from("url").delete().eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to clear existing data: ${error.message}`);
  }

  console.log("✅ Cleared existing data");
}

async function seedUrls(userId: string) {
  console.log("Seeding URLs...");

  const urlsToInsert = SAMPLE_URLS.map((longUrl, index) => ({
    long_url: longUrl,
    short_url: `ninja-${String(index + 1).padStart(3, "0")}`,
    user_id: userId,
    created_at: new Date(
      Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
    ).toISOString(), // Random date within last 30 days
  }));

  const { data, error } = await supabase
    .from("url")
    .insert(urlsToInsert)
    .select("id, short_url");

  if (error) {
    throw new Error(`Failed to seed URLs: ${error.message}`);
  }

  console.log(`✅ Seeded ${data.length} URLs`);
  return data;
}

async function seedMetrics(urls: { id: number; short_url: string }[]) {
  console.log("Seeding metrics...");

  const metricsToInsert: MetricRecord[] = [];
  const today = new Date();

  // URL 1: Hourly data for today
  console.log("  - Generating hourly metrics for today...");
  const hourlyTimestamps = getHourlyTimestamps(today);
  const hourlyVisits = generateRealisticTrend(50, 24, 0.4);
  const hourlyUniqueVisitors = hourlyVisits.map((visits) =>
    Math.max(1, Math.round(visits * 0.7))
  );

  hourlyTimestamps.forEach((timestamp, index) => {
    metricsToInsert.push({
      url_id: urls[0].id,
      datetime: timestamp.toISOString(),
      visits: hourlyVisits[index],
      unique_visitors: hourlyUniqueVisitors[index],
      created_at: timestamp.toISOString(),
    });
  });

  // URL 2: Daily data for last 7 days
  console.log("  - Generating daily metrics for last 7 days...");
  const weekly = getDailyTimestamps(7);
  const weeklyVisits = generateRealisticTrend(200, 7, 0.3);
  const weeklyUniqueVisitors = weeklyVisits.map((visits) =>
    Math.max(1, Math.round(visits * 0.6))
  );

  weekly.forEach((timestamp, index) => {
    metricsToInsert.push({
      url_id: urls[1].id,
      datetime: timestamp.toISOString(),
      visits: weeklyVisits[index],
      unique_visitors: weeklyUniqueVisitors[index],
      created_at: timestamp.toISOString(),
    });
  });

  // URL 3: Daily data for last 30 days (lighter)
  console.log("  - Generating daily metrics for last 30 days...");
  const monthly = getDailyTimestamps(30);
  const monthlyVisits = generateRealisticTrend(100, 30, 0.2);
  const monthlyUniqueVisitors = monthlyVisits.map((visits) =>
    Math.max(1, Math.round(visits * 0.5))
  );

  monthly.forEach((timestamp, index) => {
    metricsToInsert.push({
      url_id: urls[2].id,
      datetime: timestamp.toISOString(),
      visits: monthlyVisits[index],
      unique_visitors: monthlyUniqueVisitors[index],
      created_at: timestamp.toISOString(),
    });
  });

  // URL 4: Daily data for last 3 months (lighter)
  console.log("  - Generating daily metrics for last 3 months...");
  const quarterly = getDailyTimestamps(90);
  const quarterlyVisits = generateRealisticTrend(80, 90, 0.15);
  const quarterlyUniqueVisitors = quarterlyVisits.map((visits) =>
    Math.max(1, Math.round(visits * 0.45))
  );

  quarterly.forEach((timestamp, index) => {
    metricsToInsert.push({
      url_id: urls[3].id,
      datetime: timestamp.toISOString(),
      visits: quarterlyVisits[index],
      unique_visitors: quarterlyUniqueVisitors[index],
      created_at: timestamp.toISOString(),
    });
  });

  // URL 5: Complete dataset (hourly today + daily for periods)
  console.log("  - Generating complete dataset...");
  // Hourly for today
  hourlyTimestamps.forEach((timestamp, index) => {
    metricsToInsert.push({
      url_id: urls[4].id,
      datetime: timestamp.toISOString(),
      visits: Math.round(hourlyVisits[index] * 1.5), // Higher traffic
      unique_visitors: Math.round(hourlyUniqueVisitors[index] * 1.3),
      created_at: timestamp.toISOString(),
    });
  });

  // Daily for last 7 days
  weekly.slice(0, -1).forEach((timestamp, index) => {
    // Exclude today since we have hourly
    metricsToInsert.push({
      url_id: urls[4].id,
      datetime: timestamp.toISOString(),
      visits: Math.round(weeklyVisits[index] * 1.2),
      unique_visitors: Math.round(weeklyUniqueVisitors[index] * 1.1),
      created_at: timestamp.toISOString(),
    });
  });

  // Daily for last 30 days (excluding last 7 days)
  monthly.slice(0, -7).forEach((timestamp, index) => {
    metricsToInsert.push({
      url_id: urls[4].id,
      datetime: timestamp.toISOString(),
      visits: Math.round(monthlyVisits[index] * 0.8),
      unique_visitors: Math.round(monthlyUniqueVisitors[index] * 0.9),
      created_at: timestamp.toISOString(),
    });
  });

  // Daily for last 3 months (excluding last 30 days)
  quarterly.slice(0, -30).forEach((timestamp, index) => {
    metricsToInsert.push({
      url_id: urls[4].id,
      datetime: timestamp.toISOString(),
      visits: Math.round(quarterlyVisits[index] * 0.6),
      unique_visitors: Math.round(quarterlyUniqueVisitors[index] * 0.7),
      created_at: timestamp.toISOString(),
    });
  });

  // URLs 6-10: Various realistic patterns
  console.log("  - Generating varied patterns for remaining URLs...");
  for (let urlIndex = 5; urlIndex < urls.length; urlIndex++) {
    const pattern = urlIndex % 3;
    let timestamps, visits, uniqueVisitors;

    switch (pattern) {
      case 0: // Viral pattern - high recent activity
        timestamps = getDailyTimestamps(14);
        visits = generateRealisticTrend(20, 14, 0.8);
        visits = visits.map((v, i) => (i > 10 ? v * 5 : v)); // Spike in last few days
        uniqueVisitors = visits.map((v) => Math.max(1, Math.round(v * 0.8)));
        break;
      case 1: // Declining pattern
        timestamps = getDailyTimestamps(21);
        visits = generateRealisticTrend(300, 21, 0.2);
        visits = visits.map((v, i) => Math.round(v * (1 - i * 0.03))); // Gradual decline
        uniqueVisitors = visits.map((v) => Math.max(1, Math.round(v * 0.4)));
        break;
      case 2: // Steady pattern
        timestamps = getDailyTimestamps(10);
        visits = generateRealisticTrend(150, 10, 0.1);
        uniqueVisitors = visits.map((v) => Math.max(1, Math.round(v * 0.6)));
        break;
      default:
        timestamps = getDailyTimestamps(7);
        visits = generateRealisticTrend(100, 7, 0.3);
        uniqueVisitors = visits.map((v) => Math.max(1, Math.round(v * 0.5)));
    }

    timestamps.forEach((timestamp, index) => {
      metricsToInsert.push({
        url_id: urls[urlIndex].id,
        datetime: timestamp.toISOString(),
        visits: visits[index],
        unique_visitors: uniqueVisitors[index],
        created_at: timestamp.toISOString(),
      });
    });
  }

  // Insert all metrics in batches to avoid hitting limits
  console.log(`  - Inserting ${metricsToInsert.length} metric records...`);
  const batchSize = 1000;

  for (let i = 0; i < metricsToInsert.length; i += batchSize) {
    const batch = metricsToInsert.slice(i, i + batchSize);
    const { error } = await supabase.from("url_metric").insert(batch);

    if (error) {
      throw new Error(`Failed to seed metrics batch ${i}: ${error.message}`);
    }

    console.log(
      `    - Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
        metricsToInsert.length / batchSize
      )}`
    );
  }

  console.log(`✅ Seeded ${metricsToInsert.length} metric records`);
}

async function main() {
  try {
    console.log("🥷 Starting ninja-url database seeding...\n");

    // Validate environment variables
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error(
        "Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY"
      );
    }

    // Create test user
    const userId = await createTestUser();

    // Clear existing data
    await clearExistingData(userId);

    // Seed URLs
    const urls = await seedUrls(userId);

    // Seed metrics
    await seedMetrics(urls);

    console.log("\n🎉 Seeding completed successfully!");
    console.log(`\n📧 Test user credentials:`);
    console.log(`   Email: ${TEST_USER.email}`);
    console.log(`   Password: ${TEST_USER.password}`);
    console.log(`\n📊 Generated data:`);
    console.log(`   - 10 URLs with varied creation dates`);
    console.log(`   - Hourly metrics for today`);
    console.log(`   - Daily metrics for 7/30/90 day periods`);
    console.log(`   - Realistic traffic patterns and trends`);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

// Run the seeding
main();
