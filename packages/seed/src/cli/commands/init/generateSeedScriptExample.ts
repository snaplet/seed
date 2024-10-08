import dedent from "dedent";
import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { getSeedConfigPath } from "#config/seedConfig/seedConfig.js";
import { getDataModel } from "#core/dataModel/dataModel.js";
import { sortModels } from "#core/store/topologicalSort.js";

export async function generateSeedScriptExample() {
  const seedScriptPath = join(dirname(await getSeedConfigPath()), "seed.ts");

  // If the seed script already exists, we don't want to overwrite it
  if (existsSync(seedScriptPath)) {
    return seedScriptPath;
  }

  const dataModel = await getDataModel();
  const [model] = sortModels(dataModel);
  const template = dedent`
    /**
     * ! Executing this script will delete all data in your database and seed it with 10 ${model.modelName}.
     * ! Make sure to adjust the script to your needs.
     * Use any TypeScript runner to run this script, for example: \`npx tsx seed.ts\`
     * Learn more about the Seed Client by following our guide: https://docs.snaplet.dev/seed/getting-started
     */
    import { createSeedClient } from "@snaplet/seed";

    const main = async () => {
      const seed = await createSeedClient();

      // Truncate all tables in the database
      await seed.$resetDatabase();

      // Seed the database with 10 ${model.modelName}
      await seed.${model.modelName}((x) => x(10));

      // Type completion not working? You might want to reload your TypeScript Server to pick up the changes

      console.log("Database seeded successfully!");

      process.exit();
    };

    main();
  `;

  await writeFile(seedScriptPath, template);

  return seedScriptPath;
}
