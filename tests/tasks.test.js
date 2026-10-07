const request = require("supertest");
const app = require("../server");

describe("API Endpoint Unit Tests (Practical 12 CI/CD Pipeline)", () => {
  test("GET / returns 200 OK server health message", async () => {
    const res = await request(app).get("/");
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain("Task Manager API");
  });

  test("GET /debug/cache-stats returns cache metrics", async () => {
    const res = await request(app).get("/debug/cache-stats");
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.stats).toHaveProperty("stdTTL", 60);
  });
});
