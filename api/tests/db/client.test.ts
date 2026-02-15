import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { MongoMemoryServer } from "mongodb-memory-server";
import { connectDb, getDb, disconnectDb } from "../../src/db/client";

describe("db client", () => {
  test("getDb throws before connect", () => {
    expect(() => getDb()).toThrow("Database not connected");
  });

  describe("after connect", () => {
    let mongod: MongoMemoryServer;

    beforeAll(async () => {
      mongod = await MongoMemoryServer.create();
      await connectDb(mongod.getUri());
    });

    afterAll(async () => {
      await disconnectDb();
      await mongod.stop();
    });

    test("getDb returns a Db instance", () => {
      const db = getDb();
      expect(db).toBeDefined();
      expect(db.databaseName).toBeString();
    });

    test("getDb returns the same instance on repeated calls", () => {
      expect(getDb()).toBe(getDb());
    });
  });
});
