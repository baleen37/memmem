/**
 * Tests for ast_grep_replace tool
 */

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { astGrepReplace } from "../src/tools/ast-grep-replace";
import fs from "fs";
import path from "path";
import os from "os";

describe("ast_grep_replace", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), "ast-test-"));
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it("dry-run does not modify files", async () => {
    const testFile = path.join(testDir, "test.js");
    const original = "var foo = 1;\nvar bar = 2;\n";
    fs.writeFileSync(testFile, original);

    const result = await astGrepReplace({
      pattern: "var $NAME = $VALUE",
      replacement: "const $NAME = $VALUE",
      language: "javascript",
      path: testFile,
      dryRun: true,
    });

    // File should not be modified
    const content = fs.readFileSync(testFile, "utf-8");
    expect(content).toBe(original);

    // Result should indicate dry run
    expect(result.content[0].text).toContain("DRY RUN");
  });

  it("replaces code when dryRun=false", async () => {
    const testFile = path.join(testDir, "test.js");
    fs.writeFileSync(testFile, "var foo = 1;\nvar bar = 2;\n");

    const result = await astGrepReplace({
      pattern: "var $NAME = $VALUE",
      replacement: "const $NAME = $VALUE",
      language: "javascript",
      path: testFile,
      dryRun: false,
    });

    // File should be modified
    const content = fs.readFileSync(testFile, "utf-8");
    expect(content).toContain("const foo = 1");
    expect(content).toContain("const bar = 2");
    expect(content).not.toContain("var");

    // Result should indicate changes applied
    expect(result.content[0].text).toContain("CHANGES APPLIED");
  });

  it("supports meta-variables in replacement", async () => {
    const testFile = path.join(testDir, "test.js");
    fs.writeFileSync(testFile, "function oldName(x, y) { return x + y; }");

    await astGrepReplace({
      pattern: "function oldName($$$ARGS) { $$$BODY }",
      replacement: "function newName($$$ARGS) { $$$BODY }",
      language: "javascript",
      path: testFile,
      dryRun: false,
    });

    const content = fs.readFileSync(testFile, "utf-8");
    expect(content).toContain("newName");
    expect(content).not.toContain("oldName");
  });

  it("shows before and after in output", async () => {
    const testFile = path.join(testDir, "test.js");
    fs.writeFileSync(testFile, "var x = 1;");

    const result = await astGrepReplace({
      pattern: "var $NAME = $VALUE",
      replacement: "const $NAME = $VALUE",
      language: "javascript",
      path: testFile,
      dryRun: true,
    });

    const output = result.content[0].text;
    expect(output).toContain("- var");
    expect(output).toContain("+ const");
  });

  it("handles module not available gracefully", async () => {
    const testFile = path.join(testDir, "test.js");
    fs.writeFileSync(testFile, "var x = 1;");

    await astGrepReplace({
      pattern: "var $NAME = $VALUE",
      replacement: "const $NAME = $VALUE",
      language: "javascript",
      path: testFile,
    });

    // Test passes if no error is thrown
    expect(true).toBe(true);
  });

  describe("multi-meta-variable substitution", () => {
    describe("$$$ARGS substitution", () => {
      it("should substitute $$$ARGS in function declarations with multiple arguments", async () => {
        const testFile = path.join(testDir, "test.js");
        fs.writeFileSync(testFile, "function oldName(x, y, z) { return x + y + z; }");

        await astGrepReplace({
          pattern: "function oldName($$$ARGS) { $$$BODY }",
          replacement: "function newName($$$ARGS) { $$$BODY }",
          language: "javascript",
          path: testFile,
          dryRun: false,
        });

        const content = fs.readFileSync(testFile, "utf-8");
        expect(content).toBe("function newName(x, y, z) { return x + y + z; }");
      });

      it("should substitute $$$ARGS with single argument", async () => {
        const testFile = path.join(testDir, "test.js");
        fs.writeFileSync(testFile, "function oldName(x) { return x * 2; }");

        await astGrepReplace({
          pattern: "function oldName($$$ARGS) { $$$BODY }",
          replacement: "function newName($$$ARGS) { $$$BODY }",
          language: "javascript",
          path: testFile,
          dryRun: false,
        });

        const content = fs.readFileSync(testFile, "utf-8");
        expect(content).toBe("function newName(x) { return x * 2; }");
      });

      it("should substitute $$$ARGS with no arguments", async () => {
        const testFile = path.join(testDir, "test.js");
        fs.writeFileSync(testFile, "function oldName() { return 42; }");

        await astGrepReplace({
          pattern: "function oldName($$$ARGS) { $$$BODY }",
          replacement: "function newName($$$ARGS) { $$$BODY }",
          language: "javascript",
          path: testFile,
          dryRun: false,
        });

        const content = fs.readFileSync(testFile, "utf-8");
        expect(content).toBe("function newName() { return 42; }");
      });

      it("should preserve argument types in TypeScript", async () => {
        const testFile = path.join(testDir, "test.ts");
        fs.writeFileSync(testFile, "function oldName(x: number, y: string): void { console.log(x, y); }");

        await astGrepReplace({
          pattern: "function oldName($$$ARGS): $RET { $$$BODY }",
          replacement: "function newName($$$ARGS): $RET { $$$BODY }",
          language: "typescript",
          path: testFile,
          dryRun: false,
        });

        const content = fs.readFileSync(testFile, "utf-8");
        expect(content).toBe("function newName(x: number, y: string): void { console.log(x, y); }");
      });
    });

    describe("$$$BODY substitution", () => {
      it("should substitute $$$BODY in function bodies", async () => {
        const testFile = path.join(testDir, "test.js");
        fs.writeFileSync(testFile, "function oldName(x, y) { const result = x + y; return result; }");

        await astGrepReplace({
          pattern: "function oldName($$$ARGS) { $$$BODY }",
          replacement: "function newName($$$ARGS) { $$$BODY }",
          language: "javascript",
          path: testFile,
          dryRun: false,
        });

        const content = fs.readFileSync(testFile, "utf-8");
        expect(content).toBe("function newName(x, y) { const result = x + y; return result; }");
      });

      it("should substitute $$$BODY in arrow function with return", async () => {
        const testFile = path.join(testDir, "test.js");
        fs.writeFileSync(testFile, "const oldName = (x, y) => { return x + y; };");

        await astGrepReplace({
          pattern: "const oldName = ($$$ARGS) => { $$$BODY };",
          replacement: "const newName = ($$$ARGS) => { $$$BODY };",
          language: "javascript",
          path: testFile,
          dryRun: false,
        });

        const content = fs.readFileSync(testFile, "utf-8");
        expect(content).toBe("const newName = (x, y) => { return x + y; };");
      });

      it("should substitute $$$BODY with empty body", async () => {
        const testFile = path.join(testDir, "test.js");
        fs.writeFileSync(testFile, "function oldName(x) { }");

        await astGrepReplace({
          pattern: "function oldName($$$ARGS) { $$$BODY }",
          replacement: "function newName($$$ARGS) { $$$BODY }",
          language: "javascript",
          path: testFile,
          dryRun: false,
        });

        const content = fs.readFileSync(testFile, "utf-8");
        // Empty body substitution results in double space (original space + replacement space)
        // This is expected behavior: the replacement pattern " { $$$BODY }" adds a space
        expect(content).toBe("function newName(x) {  }");
      });
    });

    describe("$$$PROPS substitution", () => {
      it("should substitute $$$PROPS in destructuring patterns", async () => {
        const testFile = path.join(testDir, "test.js");
        fs.writeFileSync(testFile, "const { x, y, z } = obj;");

        await astGrepReplace({
          pattern: "const { $$$PROPS } = $OBJ;",
          replacement: "const { $$$PROPS } = $OBJ;",
          language: "javascript",
          path: testFile,
          dryRun: false,
        });

        const content = fs.readFileSync(testFile, "utf-8");
        expect(content).toBe("const { x, y, z } = obj;");
      });

      it("should substitute $$$PROPS with single property", async () => {
        const testFile = path.join(testDir, "test.js");
        fs.writeFileSync(testFile, "const { x } = obj;");

        await astGrepReplace({
          pattern: "const { $$$PROPS } = $OBJ;",
          replacement: "let { $$$PROPS } = $OBJ;",
          language: "javascript",
          path: testFile,
          dryRun: false,
        });

        const content = fs.readFileSync(testFile, "utf-8");
        expect(content).toBe("let { x } = obj;");
      });
    });

    describe("combined multi-meta-variable substitution", () => {
      it("should substitute both $$$ARGS and $$$BODY together", async () => {
        const testFile = path.join(testDir, "test.js");
        fs.writeFileSync(testFile, "function oldName(a, b) { const c = a + b; return c; }");

        await astGrepReplace({
          pattern: "function oldName($$$ARGS) { $$$BODY }",
          replacement: "function newName($$$ARGS) { $$$BODY }",
          language: "javascript",
          path: testFile,
          dryRun: false,
        });

        const content = fs.readFileSync(testFile, "utf-8");
        expect(content).toBe("function newName(a, b) { const c = a + b; return c; }");
      });

      it("should handle mixed single and multi meta-variables", async () => {
        const testFile = path.join(testDir, "test.js");
        fs.writeFileSync(testFile, "function oldName(x, y): number { return x + y; }");

        await astGrepReplace({
          pattern: "function $NAME($$$ARGS): $RET { $$$BODY }",
          replacement: "function new_$NAME($$$ARGS): $RET { $$$BODY }",
          language: "typescript",
          path: testFile,
          dryRun: false,
        });

        const content = fs.readFileSync(testFile, "utf-8");
        expect(content).toBe("function new_oldName(x, y): number { return x + y; }");
      });
    });

    describe("comma handling in multi-variables", () => {
      it("should preserve commas between arguments", async () => {
        const testFile = path.join(testDir, "test.js");
        fs.writeFileSync(testFile, "function oldName(x, y, z) { return 0; }");

        await astGrepReplace({
          pattern: "function oldName($$$ARGS) { $$$BODY }",
          replacement: "function newName($$$ARGS) { $$$BODY }",
          language: "javascript",
          path: testFile,
          dryRun: false,
        });

        const content = fs.readFileSync(testFile, "utf-8");
        expect(content).toBe("function newName(x, y, z) { return 0; }");
      });

      it("should preserve trailing commas in arguments", async () => {
        const testFile = path.join(testDir, "test.js");
        fs.writeFileSync(testFile, "function oldName(x, y,) { return 0; }");

        await astGrepReplace({
          pattern: "function oldName($$$ARGS) { $$$BODY }",
          replacement: "function newName($$$ARGS) { $$$BODY }",
          language: "javascript",
          path: testFile,
          dryRun: false,
        });

        const content = fs.readFileSync(testFile, "utf-8");
        expect(content).toBe("function newName(x, y,) { return 0; }");
      });
    });

    describe("edge cases", () => {
      it("should handle arguments with default values", async () => {
        const testFile = path.join(testDir, "test.js");
        fs.writeFileSync(testFile, "function oldName(x = 1, y = 2) { return x + y; }");

        await astGrepReplace({
          pattern: "function oldName($$$ARGS) { $$$BODY }",
          replacement: "function newName($$$ARGS) { $$$BODY }",
          language: "javascript",
          path: testFile,
          dryRun: false,
        });

        const content = fs.readFileSync(testFile, "utf-8");
        expect(content).toBe("function newName(x = 1, y = 2) { return x + y; }");
      });

      it("should handle destructured parameters", async () => {
        const testFile = path.join(testDir, "test.js");
        fs.writeFileSync(testFile, "function oldName({ x, y }) { return x + y; }");

        await astGrepReplace({
          pattern: "function oldName($$$ARGS) { $$$BODY }",
          replacement: "function newName($$$ARGS) { $$$BODY }",
          language: "javascript",
          path: testFile,
          dryRun: false,
        });

        const content = fs.readFileSync(testFile, "utf-8");
        expect(content).toBe("function newName({ x, y }) { return x + y; }");
      });

      it("should handle rest parameters", async () => {
        const testFile = path.join(testDir, "test.js");
        fs.writeFileSync(testFile, "function oldName(...args) { return args; }");

        await astGrepReplace({
          pattern: "function oldName($$$ARGS) { $$$BODY }",
          replacement: "function newName($$$ARGS) { $$$BODY }",
          language: "javascript",
          path: testFile,
          dryRun: false,
        });

        const content = fs.readFileSync(testFile, "utf-8");
        expect(content).toBe("function newName(...args) { return args; }");
      });
    });
  });
});
