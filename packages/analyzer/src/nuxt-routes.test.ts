import { describe, expect, it } from "vitest";
import { NuxtRoutesDetector } from "./detectors/nuxt-routes.js";
import { parseSource } from "./parser.js";
import type { DetectorContext } from "./types.js";

describe("NuxtRoutesDetector", () => {
  const mockFiles: Record<string, string> = {
    "pages/index.vue": `<template>
  <main>Welcome</main>
</template>`,
    "pages/users/[id].vue": `<script setup lang="ts">
const route = useRoute();
</script>
<template>
  <div>User details</div>
</template>`,
    "pages/posts/[...slug].vue": `<template><div>Post</div></template>`,
    "server/api/users.ts": `// Comments
import { defineEventHandler } from "h3";

export default defineEventHandler((event) => {
  return [{ id: 1, name: "Alice" }];
});`,
    "server/api/users.post.ts": `export default defineEventHandler(async (event) => {
  return { created: true };
});`,
    "server/routes/health.ts": `export default defineEventHandler(() => "OK");`,
  };

  const context: DetectorContext = {
    workspaceRoot: "/fake/root",
    files: Object.keys(mockFiles),
    getFileContent: async (file) => mockFiles[file] ?? "",
    parseFile: async (file, content) => parseSource(file, content),
  };

  it("detects Nuxt pages, api routes and server routes", async () => {
    const detector = new NuxtRoutesDetector();
    const result = await detector.detect(context);

    expect(result.nodes.length).toBe(6);

    const homePage = result.nodes.find((n) => n.label === "/");
    expect(homePage).toBeDefined();
    expect(homePage?.type).toBe("route");
    expect(homePage?.source.file).toBe("pages/index.vue");
    expect(homePage?.source.line).toBe(1);

    const userPage = result.nodes.find((n) => n.label === "/users/:id");
    expect(userPage).toBeDefined();
    expect(userPage?.source.file).toBe("pages/users/[id].vue");
    expect(userPage?.source.line).toBe(1);

    const postPage = result.nodes.find((n) => n.label === "/posts/*slug");
    expect(postPage).toBeDefined();

    const apiUsersGet = result.nodes.find((n) => n.label === "/api/users");
    expect(apiUsersGet).toBeDefined();
    expect(apiUsersGet?.source.file).toBe("server/api/users.ts");
    // Should locate defineEventHandler starting on line 4
    expect(apiUsersGet?.source.line).toBe(4);

    const apiUsersPost = result.nodes.find((n) => n.label === "POST /api/users");
    expect(apiUsersPost).toBeDefined();
    expect(apiUsersPost?.source.file).toBe("server/api/users.post.ts");
    expect(apiUsersPost?.source.line).toBe(1);

    const serverHealth = result.nodes.find((n) => n.label === "/health");
    expect(serverHealth).toBeDefined();
    expect(serverHealth?.source.file).toBe("server/routes/health.ts");
    expect(serverHealth?.source.line).toBe(1);
  });
});
