import { describe, expect, test } from "vitest";
import { type Dialect, adapters } from "#test/adapters.js";
import { setupProject } from "#test/setupProject.js";

type DialectRecordWithDefault = Partial<Record<Dialect, string>> &
  Record<"default", string>;

for (const dialect of Object.keys(adapters) as Array<Dialect>) {
  const adapter = await adapters[dialect]();

  describe.concurrent(
    `e2e: api: ${dialect}`,
    () => {
      test("seed.$reset works as expected", async () => {
        const schema: DialectRecordWithDefault = {
          default: `
            CREATE TABLE "user" (
              "id" SERIAL PRIMARY KEY,
              "email" text NOT NULL
            );
          `,
          sqlite: `
            CREATE TABLE "user" (
              "id" INTEGER PRIMARY KEY AUTOINCREMENT,
              "email" text NOT NULL
            );
            `,
        };

        const { db } = await setupProject({
          adapter,
          databaseSchema: schema[dialect] ?? schema.default,
          seedScript: `
          import { createSeedClient } from "#seed"

          const seed = await createSeedClient()
          await seed.users((x) => x(2))

          seed.$reset()

          try {
            await seed.users((x) => x(2))
          } catch (e) {
            console.log(e)
          }
        `,
        });

        // Check if the tables have been populated with the correct number of entries
        expect((await db.query('SELECT * FROM "user"')).length).toEqual(2);
      });

      test("seed.$transaction works as expected", async () => {
        const schema: DialectRecordWithDefault = {
          default: `
            CREATE TABLE "user" (
              "id" SERIAL PRIMARY KEY,
              "email" text NOT NULL
            );
          `,
          sqlite: `
            CREATE TABLE "user" (
              "id" INTEGER PRIMARY KEY AUTOINCREMENT,
              "email" text NOT NULL
            );
            `,
        };

        const { db } = await setupProject({
          adapter,
          databaseSchema: schema[dialect] ?? schema.default,
          seedScript: `
          import { createSeedClient } from "#seed"

          const seed = await createSeedClient()
          await seed.$transaction(async (seed) => {
            await seed.users((x) => x(3))
          })

          try {
            await seed.users((x) => x(3))
          } catch (e) {
            console.log(e)
          }
        `,
        });

        // Check if the tables have been populated with the correct number of entries
        expect((await db.query('SELECT * FROM "user"')).length).toEqual(3);
      });

      test("async column generate callbacks", async () => {
        const { db } = await setupProject({
          adapter,
          databaseSchema: `
          CREATE TABLE "User" (
            "id" uuid not null,
            "fullName" text not null
          );
        `,
          seedScript: `
          import { createSeedClient } from '#seed'
          const seed = await createSeedClient()
          await seed.users([{
            fullName: () => Promise.resolve('Foo Bar')
          }])
        `,
        });

        const [{ fullName }] = await db.query<{ fullName: string }>(
          'select * from "User"',
        );

        expect(fullName).toEqual("Foo Bar");
      });

      describe("$resetDatabase", () => {
        test("should reset all tables per default", async () => {
          const schema: DialectRecordWithDefault = {
            default: `
              CREATE TABLE "Team" (
                "id" SERIAL PRIMARY KEY
              );
              CREATE TABLE "Player" (
                "id" BIGSERIAL PRIMARY KEY,
                "teamId" integer NOT NULL REFERENCES "Team"("id"),
                "name" text NOT NULL
              );
              CREATE TABLE "Game" (
                "id" INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY
              );
            `,
            sqlite: `
              CREATE TABLE "Team" (
                "id" INTEGER PRIMARY KEY AUTOINCREMENT
              );
              CREATE TABLE "Player" (
                "id" INTEGER PRIMARY KEY AUTOINCREMENT,
                "teamId" integer NOT NULL REFERENCES "Team"("id"),
                "name" text NOT NULL
              );
              CREATE TABLE "Game" (
                "id" INTEGER PRIMARY KEY AUTOINCREMENT
              );
            `,
          };

          const seedScript = `
        import { createSeedClient } from '#seed'
        const seed = await createSeedClient()
        await seed.$resetDatabase()
        await seed.teams((x) => x(2, {
          players: (x) => x(3)
        }));
        await seed.games((x) => x(3));
      `;
          const { db, runSeedScript, stdout } = await setupProject({
            adapter,
            databaseSchema: schema[dialect] ?? schema.default,
            seedScript,
          });
          console.log(stdout);
          expect((await db.query('SELECT * FROM "Player"')).length).toEqual(6);
          expect((await db.query('SELECT * FROM "Team"')).length).toEqual(2);
          expect((await db.query('SELECT * FROM "Game"')).length).toEqual(3);
          // Should be able to re-run the seed script again thanks to the $resetDatabase
          await runSeedScript(seedScript);
          expect((await db.query('SELECT * FROM "Player"')).length).toEqual(6);
          expect((await db.query('SELECT * FROM "Team"')).length).toEqual(2);
          expect((await db.query('SELECT * FROM "Game"')).length).toEqual(3);
        });

        test("should not reset config excluded table", async () => {
          const schema: DialectRecordWithDefault = {
            default: `
              CREATE TABLE "BABBA" (
                "id" SERIAL PRIMARY KEY
              );

              CREATE TABLE "BABA" (
                "id" SERIAL PRIMARY KEY
              );
            `,
            sqlite: `
              CREATE TABLE "BABBA" (
                "id" INTEGER PRIMARY KEY AUTOINCREMENT
              );
              CREATE TABLE "BABA" (
                "id" INTEGER PRIMARY KEY AUTOINCREMENT
              );
            `,
          };

          const seedConfig: Partial<
            Record<"default" | Dialect, (connectionString: string) => string>
          > = {
            default: (connectionString) =>
              adapter.generateSeedConfig(
                connectionString,
                `
                  select: {
                    "BABA": false,
                  },
                `,
              ),
            postgres: (connectionString) =>
              adapter.generateSeedConfig(
                connectionString,
                `
                  select: {
                    "public.BABA": false,
                  },
                `,
              ),
          };

          const { db, runSeedScript } = await setupProject({
            adapter,
            seedConfig: seedConfig[dialect] ?? seedConfig.default,
            databaseSchema: schema[dialect] ?? schema.default,
          });

          await db.execute(`INSERT INTO "BABBA" DEFAULT VALUES`);
          await db.execute(`INSERT INTO "BABBA" DEFAULT VALUES`);

          await db.execute(`INSERT INTO "BABA" DEFAULT VALUES`);
          await db.execute(`INSERT INTO "BABA" DEFAULT VALUES`);

          await runSeedScript(`
            import { createSeedClient } from '#seed'

            const seed = await createSeedClient()
            await seed.$resetDatabase()
          `);

          expect((await db.query('SELECT * FROM "BABBA"')).length).toBe(0);
          expect((await db.query('SELECT * FROM "BABA"')).length).toBe(2);
        });

        test("should not reset parameterized excluded table", async () => {
          const schema: DialectRecordWithDefault = {
            default: `
              CREATE TABLE "BABBA" (
                "id" SERIAL PRIMARY KEY
              );

              CREATE TABLE "BABA" (
                "id" SERIAL PRIMARY KEY
              );
            `,
            sqlite: `
              CREATE TABLE "BABBA" (
                "id" INTEGER PRIMARY KEY AUTOINCREMENT
              );
              CREATE TABLE "BABA" (
                "id" INTEGER PRIMARY KEY AUTOINCREMENT
              );
            `,
          };

          const seedScript: DialectRecordWithDefault = {
            default: `
              import { createSeedClient } from '#seed'

              const seed = await createSeedClient()
              await seed.$resetDatabase({ "BABA": false })
            `,
            postgres: `
              import { createSeedClient } from '#seed'

              const seed = await createSeedClient()
              await seed.$resetDatabase({ "public.BABA": false })
            `,
          };

          const { db, runSeedScript } = await setupProject({
            adapter,
            databaseSchema: schema[dialect] ?? schema.default,
          });

          await db.execute(`INSERT INTO "BABBA" DEFAULT VALUES`);
          await db.execute(`INSERT INTO "BABBA" DEFAULT VALUES`);

          await db.execute(`INSERT INTO "BABA" DEFAULT VALUES`);
          await db.execute(`INSERT INTO "BABA" DEFAULT VALUES`);

          const { stdout } = await runSeedScript(
            seedScript[dialect] ?? seedScript.default,
          );
          console.log(stdout);

          expect((await db.query('SELECT * FROM "BABBA"')).length).toBe(0);
          expect((await db.query('SELECT * FROM "BABA"')).length).toBe(2);
        });

        test("should not reset parameterized excluded table with star syntax", async () => {
          const schema: DialectRecordWithDefault = {
            default: `
              CREATE TABLE "BABBA" (
                "id" SERIAL PRIMARY KEY
              );

              CREATE TABLE "BABA" (
                "id" SERIAL PRIMARY KEY
              );
            `,
            sqlite: `
              CREATE TABLE "BABBA" (
                "id" INTEGER PRIMARY KEY AUTOINCREMENT
              );
              CREATE TABLE "BABA" (
                "id" INTEGER PRIMARY KEY AUTOINCREMENT
              );
            `,
          };

          const seedScript: DialectRecordWithDefault = {
            default: `
              import { createSeedClient } from '#seed'

              const seed = await createSeedClient()
              await seed.$resetDatabase({ "BA*": false })
            `,
            postgres: `
              import { createSeedClient } from '#seed'

              const seed = await createSeedClient()
              await seed.$resetDatabase({ "public.BA*": false })
            `,
          };

          const { db, runSeedScript } = await setupProject({
            adapter,
            databaseSchema: schema[dialect] ?? schema.default,
          });

          await db.execute(`INSERT INTO "BABBA" DEFAULT VALUES`);
          await db.execute(`INSERT INTO "BABBA" DEFAULT VALUES`);

          await db.execute(`INSERT INTO "BABA" DEFAULT VALUES`);
          await db.execute(`INSERT INTO "BABA" DEFAULT VALUES`);

          await runSeedScript(seedScript[dialect] ?? seedScript.default);

          expect((await db.query('SELECT * FROM "BABBA"')).length).toBe(2);
          expect((await db.query('SELECT * FROM "BABA"')).length).toBe(2);
        });

        test("should not allow to pass a table already excluded in the config", async () => {
          const tableName: DialectRecordWithDefault = {
            default: "BABA",
            postgres: "public.BABA",
          };
          const schema: DialectRecordWithDefault = {
            default: `
              CREATE TABLE "BABBA" (
                "id" SERIAL PRIMARY KEY
              );

              CREATE TABLE "BABA" (
                "id" SERIAL PRIMARY KEY
              );
            `,
            sqlite: `
              CREATE TABLE "BABBA" (
                "id" INTEGER PRIMARY KEY AUTOINCREMENT
              );
              CREATE TABLE "BABA" (
                "id" INTEGER PRIMARY KEY AUTOINCREMENT
              );
            `,
          };

          const seedConfig: DialectRecordWithDefault = {
            default: `
              import { defineConfig } from "@snaplet/seed/config";

              export default defineConfig({
                select: {
                  "BABA": false,
                },
              })
            `,
            postgres: `
              import { defineConfig } from "@snaplet/seed/config";

              export default defineConfig({
                select: {
                  "${tableName[dialect] ?? tableName.default}": false,
                },
              })
            `,
          };

          const seedScript: DialectRecordWithDefault = {
            default: `
              import { createSeedClient } from '#seed'

              const seed = await createSeedClient()
              await seed.$resetDatabase({ "BABA": false })
            `,
            postgres: `
              import { createSeedClient } from '#seed'

              const seed = await createSeedClient()
              await seed.$resetDatabase({ "${tableName[dialect] ?? tableName.default}": false })
            `,
          };

          await expect(() =>
            setupProject({
              adapter,
              seedConfig: seedConfig[dialect] ?? seedConfig.default,
              databaseSchema: schema[dialect] ?? schema.default,
              seedScript: seedScript[dialect] ?? seedScript.default,
            }),
          ).rejects.toThrow(
            `'"${tableName[dialect] ?? tableName.default}"' does not exist in type 'SelectConfig'`,
          );
        });
      });
    },
    {
      timeout: 45000,
    },
  );
}
