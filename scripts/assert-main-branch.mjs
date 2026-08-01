import { execFileSync } from "node:child_process";
import { URL } from "node:url";

function runGit(args) {
  return execFileSync("git", args, {
    cwd: new URL("..", import.meta.url),
    encoding: "utf8",
  }).trim();
}

const branch = runGit(["branch", "--show-current"]);

if (branch !== "main") {
  globalThis.console.error(
    `Firebase deployment stopped: current branch is ${branch || "unknown"}. Switch to a clean main branch first.`,
  );
  globalThis.process.exitCode = 1;
} else {
  const changes = runGit(["status", "--porcelain"]);

  if (changes) {
    globalThis.console.error(
      "Firebase deployment stopped: the main working tree has uncommitted changes.",
    );
    globalThis.process.exitCode = 1;
  } else {
    globalThis.console.log(
      "Deployment guard passed: clean main branch confirmed.",
    );
  }
}
