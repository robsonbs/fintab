const { execFile } = require("node:child_process");
const { promisify } = require("node:util");

const POSTGRES_CONTAINER_NAME =
  process.env.POSTGRES_CONTAINER_NAME || "postgres-dev";
const POLL_INTERVAL_MS = 300;
const execFileAsync = promisify(execFile);

const spinnerFrames = [
  ".      ",
  ".  .   ",
  ".  .  .",
  "   .  .",
  "      .",
  "       ",
];

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForPostgres() {
  let frameIndex = 0;

  process.stdout.write("\n\n🔴 Aguardando Postgres aceitar conexões ");

  while (true) {
    try {
      const { stdout } = await execFileAsync("docker", [
        "exec",
        POSTGRES_CONTAINER_NAME,
        "pg_isready",
        "--host",
        "localhost",
      ]);

      if (stdout.includes("accepting connections")) {
        process.stdout.write(
          "\n\n🟢 Postgres está pronto e aceitando conexões\n",
        );
        return;
      }
    } catch (error) {
      const isContainerMissing =
        typeof error?.stderr === "string" &&
        error.stderr.includes(`No such container: ${POSTGRES_CONTAINER_NAME}`);
      const isDockerUnavailable = error?.code === "ENOENT";

      if (isDockerUnavailable || isContainerMissing) {
        throw new Error(
          `Unable to wait for Postgres using container "${POSTGRES_CONTAINER_NAME}". Check Docker availability and the container name.`,
        );
      }
    }

    process.stdout.write(
      `\r🔴 Aguardando Postgres aceitar conexões ${spinnerFrames[frameIndex]} `,
    );

    frameIndex = (frameIndex + 1) % spinnerFrames.length;
    await delay(POLL_INTERVAL_MS);
  }
}

waitForPostgres().catch((error) => {
  process.stdout.write(`\n\n🔴 ${error.message}\n`);
  process.exitCode = 1;
});
