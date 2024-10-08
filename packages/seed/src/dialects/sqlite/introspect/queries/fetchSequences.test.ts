import { describe, expect, test } from "vitest";
import { betterSqlite3 } from "#test/sqlite/better-sqlite3/index.js";
import { fetchSequences } from "./fetchSequences.js";

const adapters = {
  betterSqlite3: () => betterSqlite3,
};

describe.concurrent.each(["betterSqlite3"] as const)(
  "fetchSequences: %s",
  (adapter) => {
    const { createTestDb } = adapters[adapter]();

    test("should fetch primary key autoincrement sequence", async () => {
      const structure = `
        CREATE TABLE students (
          student_id INTEGER PRIMARY KEY AUTOINCREMENT,
          name VARCHAR(100) NOT NULL
        );
      `;
      const { client } = await createTestDb(structure);
      const sequences = await fetchSequences(client);
      expect(sequences).toEqual([
        {
          tableId: "students",
          colId: "student_id",
          name: "students_student_id_seq", // The exact name might differ; adjust as necessary
          current: 1,
        },
      ]);
    });

    test("should fetch rowid sequence on table wihtout primary key", async () => {
      const structure = `
        CREATE TABLE students (
          name VARCHAR(100) NOT NULL
        );
      `;
      const { client } = await createTestDb(structure);
      const sequences = await fetchSequences(client);
      expect(sequences).toEqual(
        expect.arrayContaining([
          {
            tableId: "students",
            colId: "rowid",
            name: "students_rowid_seq", // The exact name might differ; adjust as necessary
            current: 1,
          },
        ]),
      );

      await client.execute(
        `INSERT INTO students (name) VALUES ('John Doe'), ('Jane Smith');`,
      );
      expect(await fetchSequences(client)).toEqual(
        expect.arrayContaining([
          {
            tableId: "students",
            colId: "rowid",
            name: "students_rowid_seq", // The exact name might differ; adjust as necessary
            current: 3,
          },
        ]),
      );
    });
  },
);
