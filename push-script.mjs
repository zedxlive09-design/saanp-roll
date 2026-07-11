import { execSync } from "child_process";

function run(cmd) {
  try {
    const out = execSync(cmd, { encoding: "utf8", timeout: 30000, stdio: "pipe" });
    return out.trim();
  } catch (e) {
    return e.stdout?.trim() + "\n" + e.stderr?.trim();
  }
}

console.log("=== Checking git status ===");
console.log(run("git status"));

console.log("\n=== Recent local commits ===");
console.log(run("git log --oneline -5"));

console.log("\n=== Checking remote HEAD ===");
console.log(run("git ls-remote origin HEAD refs/heads/main 2>&1"));

console.log("\n=== Staging all changes ===");
console.log(run("git add -A"));

console.log("\n=== Status after staging ===");
console.log(run("git status"));

console.log("\n=== Attempting commit ===");
try {
  const commitOut = run('git commit -m "feat: turn timer, reconnect chime, reconnection UI, live data pages"');
  console.log(commitOut);
} catch (e) {
  console.log("Nothing to commit or error:", e.message?.substring(0, 200));
}

console.log("\n=== Pushing to origin main ===");
try {
  const pushOut = run("git push origin main 2>&1");
  console.log(pushOut);
} catch (e) {
  console.log("Push error:", e.message?.substring(0, 200));
}

console.log("\n=== Final status ===");
console.log(run("git status"));

console.log("\n=== Latest log ===");
console.log(run("git log --oneline -5"));
