import { describe, it, expect } from "vitest";
import { gitHasWriteArg } from "../../../src/readonly-checker/write-handlers/git-handler.js";

describe("gitHasWriteArg", () => {
  describe("read-only commands", () => {
    it("should allow git status", () => {
      expect(gitHasWriteArg("git status")).toBe(false);
    });
    it("should allow git log", () => {
      expect(gitHasWriteArg("git log --oneline")).toBe(false);
      expect(gitHasWriteArg("git log --oneline -10")).toBe(false);
    });
    it("should allow git diff", () => {
      expect(gitHasWriteArg("git diff")).toBe(false);
      expect(gitHasWriteArg("git diff HEAD~1")).toBe(false);
    });
    it("should allow git show", () => {
      expect(gitHasWriteArg("git show HEAD")).toBe(false);
      expect(gitHasWriteArg("git show HEAD:file.txt")).toBe(false);
    });
    it("should allow git branch", () => {
      expect(gitHasWriteArg("git branch")).toBe(false);
      expect(gitHasWriteArg("git branch -a")).toBe(false);
    });
    it("should allow git remote", () => {
      expect(gitHasWriteArg("git remote -v")).toBe(false);
    });
    it("should allow git tag", () => {
      expect(gitHasWriteArg("git tag")).toBe(false);
    });
    it("should allow git describe", () => {
      expect(gitHasWriteArg("git describe --tags")).toBe(false);
    });
    it("should allow git rev-parse", () => {
      expect(gitHasWriteArg("git rev-parse HEAD")).toBe(false);
    });
    it("should allow git stash list/show", () => {
      expect(gitHasWriteArg("git stash list")).toBe(false);
      expect(gitHasWriteArg("git stash show")).toBe(false);
      expect(gitHasWriteArg("git stash reflog")).toBe(true);
    });
    it("should allow git reflog", () => {
      expect(gitHasWriteArg("git reflog")).toBe(false);
    });
  });

  describe("write commands", () => {
    it("should block git commit", () => {
      expect(gitHasWriteArg("git commit -m 'msg'")).toBe(true);
    });
    it("should block git push", () => {
      expect(gitHasWriteArg("git push origin main")).toBe(true);
    });
    it("should block git merge", () => {
      expect(gitHasWriteArg("git merge feature")).toBe(true);
    });
    it("should block git reset", () => {
      expect(gitHasWriteArg("git reset --hard HEAD")).toBe(true);
    });
    it("should block git clean", () => {
      expect(gitHasWriteArg("git clean -fd")).toBe(true);
    });
    it("should block git clone", () => {
      expect(gitHasWriteArg("git clone https://github.com/repo.git")).toBe(true);
    });
    it("should block git pull", () => {
      expect(gitHasWriteArg("git pull origin main")).toBe(true);
    });
    it("should block git fetch", () => {
      expect(gitHasWriteArg("git fetch origin")).toBe(true);
    });
    it("should block git checkout", () => {
      expect(gitHasWriteArg("git checkout -- .")).toBe(true);
    });
    it("should block git restore", () => {
      expect(gitHasWriteArg("git restore .")).toBe(true);
    });
    it("should block git stash pop", () => {
      expect(gitHasWriteArg("git stash pop")).toBe(true);
    });
    it("should block git revert", () => {
      expect(gitHasWriteArg("git revert HEAD")).toBe(true);
    });
    it("should block git add", () => {
      expect(gitHasWriteArg("git add file.txt")).toBe(true);
    });
    it("should block git rm", () => {
      expect(gitHasWriteArg("git rm file.txt")).toBe(true);
    });
    it("should block git mv", () => {
      expect(gitHasWriteArg("git mv old new")).toBe(true);
    });
    it("should block git gc", () => {
      expect(gitHasWriteArg("git gc")).toBe(true);
    });
    it("should block git prune", () => {
      expect(gitHasWriteArg("git prune")).toBe(true);
    });
    it("should block git replace", () => {
      expect(gitHasWriteArg("git replace old new")).toBe(true);
    });
    it("should block git filter-branch", () => {
      expect(gitHasWriteArg("git filter-branch HEAD")).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should handle git stash with write subcommand", () => {
      expect(gitHasWriteArg("git stash push")).toBe(false);
      expect(gitHasWriteArg("git stash pop")).toBe(true);
    });
    it("should block git config --global", () => {
      expect(gitHasWriteArg("git config --global user.name test")).toBe(true);
    });
    it("should block git config --system", () => {
      expect(gitHasWriteArg("git config --system core.editor vim")).toBe(true);
    });
    it("should allow git config without global/system", () => {
      expect(gitHasWriteArg("git config user.name")).toBe(false);
    });
    it("should block git config -f", () => {
      expect(gitHasWriteArg("git config -f /etc/gitconfig core.editor vim")).toBe(true);
    });
  });
});
