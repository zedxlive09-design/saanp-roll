import { execSync } from "child_process";
const cwd = process.cwd();

function run(cmd) {
  try {
    const out = execSync(cmd, { cwd, encoding: "utf8", timeout: 30000 });
    console.log(out.trim());
    return out.trim();
  } catch (e) {
    console.error(e.stderr?.toString() || e.message);
    return null;
  }
}

console.log("=== Adding all files ===");
run("git add -A");

console.log("\n=== Checking status ===");
run("git status");

console.log("\n=== Committing ===");
run('git commit -m "feat: complete Saanp Roll with all routes, settings, theme, sound controls, and updated docs" --allow-empty');

console.log("\n=== Pushing ===");
run("git push origin main");
