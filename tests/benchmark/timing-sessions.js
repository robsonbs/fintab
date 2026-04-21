import orchestrator from "../orchestrator.js";

const BASE_URL = "http://localhost:3000/api/v1/sessions";
const ITERATIONS = Number.parseInt(process.env.TIMING_ITERATIONS || "40", 10);

async function measureScenario(payloadFactory) {
  const durations = [];

  for (let index = 0; index < ITERATIONS; index += 1) {
    const payload = payloadFactory(index);
    const startedAt = performance.now();

    await fetch(BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    durations.push(performance.now() - startedAt);
  }

  return durations;
}

function summarize(durations) {
  const sorted = [...durations].sort((left, right) => left - right);
  const average = sorted.reduce((acc, value) => acc + value, 0) / sorted.length;
  const median = sorted[Math.floor(sorted.length / 2)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];

  return {
    avg_ms: Number(average.toFixed(2)),
    median_ms: Number(median.toFixed(2)),
    p95_ms: Number(p95.toFixed(2)),
  };
}

function averageDifference(first, second) {
  return Math.abs(first.avg_ms - second.avg_ms).toFixed(2);
}

async function run() {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();

  const validUser = await orchestrator.createUser({
    email: "timing.user@example.com",
    password: "valid-password",
  });

  const invalidEmailDurations = await measureScenario((index) => ({
    email: `nao.existe.${index}@example.com`,
    password: "valid-password",
  }));

  const invalidPasswordDurations = await measureScenario(() => ({
    email: validUser.email,
    password: "wrong-password",
  }));

  const validCredentialsDurations = await measureScenario(() => ({
    email: validUser.email,
    password: "valid-password",
  }));

  const invalidEmailSummary = summarize(invalidEmailDurations);
  const invalidPasswordSummary = summarize(invalidPasswordDurations);
  const validCredentialsSummary = summarize(validCredentialsDurations);

  console.log("\nTiming benchmark: POST /api/v1/sessions");
  console.log(`Iterations per scenario: ${ITERATIONS}`);
  console.log("------------------------------------------");
  console.log("invalid email + correct password", invalidEmailSummary);
  console.log("correct email + invalid password", invalidPasswordSummary);
  console.log("correct email + correct password", validCredentialsSummary);
  console.log("------------------------------------------");
  console.log(
    "absolute difference between 401 scenarios (avg ms):",
    averageDifference(invalidEmailSummary, invalidPasswordSummary),
  );
}

run().catch((error) => {
  console.error("Benchmark failed:", error);
  process.exitCode = 1;
});
