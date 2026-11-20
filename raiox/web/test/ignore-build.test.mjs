import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

function git(cwd, ...args) {
  execFileSync("git", args, { cwd, stdio: "pipe" });
}

test("vercel.json ignora apenas commits sem mudanca no Root Directory", () => {
  const config = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
  assert.equal(config.ignoreCommand, "git diff --quiet HEAD^ HEAD ./");

  const repo = mkdtempSync(join(tmpdir(), "raiox-ignore-build-"));
  const app = join(repo, "app");

  try {
    mkdirSync(app);
    git(repo, "init", "-q");
    git(repo, "config", "user.name", "TAVIR Test");
    git(repo, "config", "user.email", "teste@tavir.invalid");

    writeFileSync(join(repo, "office.txt"), "v1\n");
    writeFileSync(join(app, "app.txt"), "v1\n");
    git(repo, "add", "--", "office.txt", "app/app.txt");
    git(repo, "commit", "-qm", "base");

    writeFileSync(join(repo, "office.txt"), "v2\n");
    git(repo, "add", "--", "office.txt");
    git(repo, "commit", "-qm", "mudanca fora do app");
    const fora = spawnSync("git", ["diff", "--quiet", "HEAD^", "HEAD", "./"], { cwd: app });
    assert.equal(fora.status, 0, "mudanca externa deve ignorar o build");

    writeFileSync(join(app, "app.txt"), "v2\n");
    git(repo, "add", "--", "app/app.txt");
    git(repo, "commit", "-qm", "mudanca no app");
    const dentro = spawnSync("git", ["diff", "--quiet", "HEAD^", "HEAD", "./"], { cwd: app });
    assert.equal(dentro.status, 1, "mudanca no app deve continuar o build");
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});
