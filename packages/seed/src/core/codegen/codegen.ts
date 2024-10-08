import dedent from "dedent";
import { findUp } from "find-up";
import { mkdirp } from "fs-extra/esm";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { type SeedConfig } from "#config/seedConfig/seedConfig.js";
import { type DataModel } from "#core/dataModel/types.js";
import { type Dialect } from "#core/dialect/types.js";
import { type Fingerprint } from "#core/fingerprint/types.js";
import { type DataExample } from "#core/predictions/types.js";
import { jsonStringify } from "#core/utils.js";
import { type TableShapePredictions } from "#trpc/shapes.js";
import { generateUserModels } from "./userModels/generateUserModels.js";

export interface CodegenContext {
  dataExamples: Array<DataExample>;
  dataModel: DataModel;
  dialect: Dialect;
  fingerprint: Fingerprint;
  outputDir?: string;
  rawDataModel: DataModel;
  seedConfig: SeedConfig;
  seedConfigPath: string;
  shapePredictions: Array<TableShapePredictions>;
}

export const FILES = {
  PKG: {
    name: "package.json",
    template() {
      return dedent`{
        "name": "@snaplet/seed/assets",
        "type": "module",
        "exports": {
          ".": {
            "types": "./index.d.ts",
            "default": "./index.js"
          },
          "./config": {
            "types": "./defineConfig.d.ts"
          }
        }
      }`;
    },
  },
  INDEX: {
    name: "index.js",
    template({ dialect, seedConfigPath }: CodegenContext) {
      // TODO: remove self reference to @snaplet/seed
      return dedent`
        import { readFileSync } from "node:fs";
        import { dirname, join } from "node:path";
        import { fileURLToPath } from "node:url";
        import { getSeedClient } from "@snaplet/seed/dialects/${dialect.id}/client";
        import { userModels } from "./${FILES.USER_MODELS.name}";

        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);

        const dataModel = JSON.parse(readFileSync(join(__dirname, "${FILES.DATA_MODEL.name}")));

        const seedConfigPath = "<SEED_CONFIG_PATH>";

        export const createSeedClient = getSeedClient({ dataModel, seedConfigPath, userModels });
      `.replace("<SEED_CONFIG_PATH>", seedConfigPath.replaceAll("\\", "\\\\"));
    },
  },
  TYPEDEFS: {
    name: "index.d.ts",
    template({ dialect, dataModel, fingerprint, seedConfig }: CodegenContext) {
      return dialect.generateClientTypes({
        dataModel,
        fingerprint,
        seedConfig,
      });
    },
  },
  CONFIGTYPEDEFS: {
    name: "defineConfig.d.ts",
    template: async ({ dialect, dataModel, rawDataModel }: CodegenContext) => {
      const configTypes = await dialect.generateConfigTypes({
        dataModel,
        rawDataModel,
      });
      return `
      declare module "@snaplet/seed/config" {
        ${configTypes}
      }`;
    },
  },
  DATA_EXAMPLES: {
    name: "dataExamples.json",
    template({ dataExamples }: CodegenContext) {
      return jsonStringify(dataExamples);
    },
  },
  DATA_MODEL: {
    name: "dataModel.json",
    template({ dataModel }: CodegenContext) {
      return jsonStringify(dataModel);
    },
  },
  USER_MODELS: {
    name: "userModels.js",
    template(context: CodegenContext) {
      return generateUserModels(context);
    },
  },
} as const;

const findPackageDirPath = async () => {
  // In case of monorepo like turborepo and workspaces, a dependency can be put in a structure like this:
  // turborepo/ -> packages/ -> ui/ -> package.json <--- Here is the @snaplet/seed dependency
  // But the actual code of the modules will be upward in the hierarchy like this:
  // turborepo/ -> node_modules -> @snaplet/seed/ -> dist/ -> assets/
  // So we must find the closest node_modules folder
  const closestNodeModulesWithSnapletAssets = await findUp(
    path.join("node_modules", "@snaplet", "seed", "dist", "assets"),
    {
      type: "directory",
    },
  );

  if (!closestNodeModulesWithSnapletAssets) {
    throw new Error(
      "@snaplet/seed could not find a node_modules folder for @snaplet/seed in your project. We use this to decide where to generate assets. Either add @snaplet/seed to your project, or use the --output option when using `npx @snaplet/seed generate`",
    );
  }

  return closestNodeModulesWithSnapletAssets;
};

export const generateAssets = async (context: CodegenContext) => {
  const packageDirPath = context.outputDir ?? (await findPackageDirPath());
  await mkdirp(packageDirPath);

  for (const file of Object.values(FILES)) {
    const filePath = path.join(packageDirPath, file.name);
    await writeFile(filePath, await file.template(context));
  }

  return packageDirPath;
};
