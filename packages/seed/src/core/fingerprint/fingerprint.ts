import { camelize } from "inflection";
import {
  FetchingJSONSchemaStore,
  InputData,
  JSONSchemaInput,
  quicktype,
} from "quicktype-core";
import { mergeDeep } from "remeda";
import { getFingerprintConfig } from "#config/fingerprintConfig.js";
import { getSnapletConfig } from "#config/snapletConfig/snapletConfig.js";
import {
  type Fingerprint,
  type FingerprintField,
  type FingerprintJsonField,
  type FingerprintOptionsField,
} from "./types.js";

export function isJsonField(
  field: FingerprintField,
): field is FingerprintJsonField {
  return "schema" in field;
}

export function isOptionsField(
  field: FingerprintField,
): field is FingerprintOptionsField {
  return "options" in field;
}
/**
 * @public will be used during code generation
 */
export async function getFingerprint(): Promise<Fingerprint> {
  const snapletConfig = await getSnapletConfig();
  const fingerprintConfig = await getFingerprintConfig();

  return mergeDeep(fingerprintConfig, snapletConfig.seed?.fingerprint ?? {});
}

export async function jsonSchemaToTypescriptType(
  namespace: string,
  schema: string,
) {
  const schemaInput = new JSONSchemaInput(new FetchingJSONSchemaStore());

  await schemaInput.addSource({ name: "default", schema });

  const inputData = new InputData();
  inputData.addInput(schemaInput);

  const typescriptType = await quicktype({
    inputData,
    lang: "typescript",
    indentation: "  ",
    rendererOptions: {
      "just-types": true,
    },
  });

  const types = typescriptType.lines.join("\n");

  const standardNamespace = camelize(namespace);

  return {
    name: `${standardNamespace}JsonField.Default`,
    types: `declare namespace ${standardNamespace}JsonField {
  ${types}}`,
  };
}
