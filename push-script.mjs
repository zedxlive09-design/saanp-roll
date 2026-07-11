import { execSync } from "child_process";

const cwd = process.cwd();

function run(cmd, label) {
  try {
    const out = execSync(cmd, { cwd, stdio: "pipe", encoding: "utf-8" });
    console.log(`✅ ${label}:`, out.trim() || "(empty)");
    return out.trim();
  } catch (e) {
    console.error(`❌ ${label}:`, e.stderr?.toString() || e.message);
    throw e;
  }
}

try {
  // Stage all files
  run("git add -A", "git add");

  // Check if there's anything to commit
  const status = run("git status --porcelain", "git status");
  if (!status) {
    console.log("\nNothing to commit — working tree clean.");
    process.exit(0);
  }

  // Commit
  run(
    `git commit -m "feat: online multiplayer, real-time Convex sync, live history & leaderboard pages"`,
    "git commit",
  );

  // Push to main
  run("git push origin main", "git push");

  console.log("\n🚀 All changes pushed successfully!");
} catch (err) {
  console.error("\n❌ Push failed:", err.message);
  process.exit(1);
}
