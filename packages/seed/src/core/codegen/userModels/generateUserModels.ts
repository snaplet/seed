import dedent from "dedent";
import { stringify } from "javascript-stringify";
import { type CodegenContext } from "#core/codegen/codegen.js";
import {
  type DataModel,
  type DataModelField,
  type DataModelModel,
  type DataModelScalarField,
} from "#core/dataModel/types.js";
import { type Dialect } from "#core/dialect/types.js";
import { isJsonField } from "#core/fingerprint/fingerprint.js";
import { type Fingerprint } from "#core/fingerprint/types.js";
import { type DataExample } from "#core/predictions/types.js";
import { formatInput } from "#core/predictions/utils.js";
import { generateCodeFromTemplate } from "#core/userModels/templates/codegen.js";
import { type UserModels } from "#core/userModels/types.js";
import { jsonStringify } from "#core/utils.js";
import { type Shape } from "#trpc/shapes.js";
import { shouldGenerateFieldValue } from "../../dataModel/shouldGenerateFieldValue.js";
import { unpackNestedType } from "../../dialect/unpackNestedType.js";
import { encloseValueInArray } from "../../userModels/encloseValueInArray.js";
import { FILES } from "../codegen.js";
import { generateJsonField } from "./generateJsonField.js";

const findEnumType = (dataModel: DataModel, field: DataModelField) =>
  Object.entries(dataModel.enums).find(
    ([enumName]) => enumName === field.type,
  )?.[1];

const hasUniqueConstraint = (model: DataModelModel, field: DataModelField) => {
  const hasUniqueConstraint = model.uniqueConstraints.find((constraint) =>
    constraint.fields.includes(field.name),
  );
  return Boolean(hasUniqueConstraint);
};

const generateDefaultForField = (props: {
  dataModel: DataModel;
  dialect: Dialect;
  field: DataModelField;
  fingerprint: Fingerprint[string][string] | null;
  model: DataModelModel;
  predictionData: {
    examples: Array<string>;
    input?: string;
    shape: Shape | null;
  };
}) => {
  const { field, dataModel, fingerprint, predictionData, dialect, model } =
    props;

  const matchEnum = findEnumType(dataModel, field);

  if (matchEnum) {
    return `({ seed }) => copycat.oneOf(seed, ${jsonStringify(
      matchEnum.values.map((v) => v.name),
    )})`;
  }

  if (fingerprint && isJsonField(fingerprint)) {
    const result = generateJsonField(fingerprint);
    return `({ seed }) => { return ${result}; }`;
  }

  if (field.kind !== "scalar") {
    return null;
  }

  if (
    (predictionData.shape ?? predictionData.input) &&
    predictionData.examples.length > 0 &&
    // If the field has a unique constraint, we don't want to use the shape examples as they will be repeated
    !hasUniqueConstraint(model, field)
  ) {
    const [, dimensions] = unpackNestedType(field.type);
    let resultCode;

    if (predictionData.input) {
      // Use custom examples
      if (field.maxLength) {
        resultCode = `copycat.oneOfString(seed, getCustomExamples('${predictionData.input}'), { limit: ${JSON.stringify(field.maxLength)} })`;
      } else {
        resultCode = `copycat.oneOfString(seed, getCustomExamples('${predictionData.input}'))`;
      }
    } else {
      // Use examples from predicted shape
      if (field.maxLength) {
        resultCode = `copycat.oneOfString(seed, getExamples('${predictionData.shape}'), { limit: ${jsonStringify(field.maxLength)} })`;
      } else {
        resultCode = `copycat.oneOfString(seed, getExamples('${predictionData.shape}'))`;
      }
    }

    resultCode = encloseValueInArray(resultCode, dimensions);
    return `({ seed }) => ${resultCode}`;
  }

  if (!predictionData.shape) {
    // Still do not have a shape, use shape based on type
    predictionData.shape = dialect.determineShapeFromType(field.type);
  }
  const code = generateCodeFromTemplate({
    input: "seed",
    type: field.type,
    maxLength: field.maxLength ?? null,
    shape: predictionData.shape,
    templates: dialect.templates,
    optionsInput: "options",
  });

  return `fallbackFunctionTagger(({ seed, options }) => { return ${code} })`;
};

const generateDefaultsForModel = (props: {
  dataExamples: Array<DataExample>;
  dataModel: DataModel;
  dialect: Dialect;
  fingerprint: Fingerprint[string] | null;
  model: DataModelModel;
}) => {
  const { fingerprint, model, dataModel, dialect } = props;

  const fields: { data: NonNullable<UserModels[string]["data"]> } = {
    data: {},
  };

  const scalarFields = model.fields.filter(
    (f) => f.kind === "scalar",
  ) as Array<DataModelScalarField>;

  for (const field of scalarFields) {
    const predictionData: {
      examples: Array<string>;
      input?: string;
      shape: Shape | null;
    } = { shape: null, examples: [] };

    const customExample = props.dataExamples.find(
      (e) =>
        // The trim was added to support old examples that had a space at start due to no schema name
        // New examples should not have this issue
        e.input.trim() ===
        formatInput([model.schemaName, model.tableName, field.name]),
    );
    if (customExample) {
      predictionData.input = customExample.input;
      predictionData.examples = customExample.examples;
    }
    const fieldFingerprint = fingerprint?.[field.name] ?? null;

    if (!shouldGenerateFieldValue(field)) {
      fields.data[field.name] = null;
    } else {
      fields.data[field.name] = generateDefaultForField({
        field,
        dataModel,
        predictionData,
        fingerprint: fieldFingerprint,
        dialect,
        model,
      });
    }
  }
  return fields;
};

const generateDefaultsForModels = (props: {
  dataExamples: Array<DataExample>;
  dataModel: DataModel;
  dialect: Dialect;
  fingerprint: Fingerprint;
}) => {
  const { fingerprint, dataModel, dialect } = props;
  const models: UserModels = {};

  for (const [modelName, model] of Object.entries(dataModel.models)) {
    const modelFingerprint = fingerprint[modelName] ?? null;
    models[modelName] = generateDefaultsForModel({
      model,
      dataModel,
      dataExamples: props.dataExamples,
      fingerprint: modelFingerprint,
      dialect,
    });
  }

  return models;
};

export const generateUserModels = (context: CodegenContext) => {
  const { fingerprint, dataModel, dataExamples, dialect } = context;

  const defaults = generateDefaultsForModels({
    dataModel,
    dataExamples,
    fingerprint,
    dialect,
  });

  const stringifiedDefaults =
    stringify(
      defaults,
      (value, _indent, recur) => {
        if (value === null) {
          return "null";
        }

        if (typeof value === "string") {
          return value;
        }

        return recur(value);
      },
      "  ",
    ) ?? "";

  // TODO: remove self reference to @snaplet/seed
  return dedent`
    import { readFileSync } from "node:fs";
    import { dirname, join } from "node:path";
    import { fileURLToPath } from "node:url";
    import { copycat } from "@snaplet/copycat";
    import { FallbackSymbol } from "@snaplet/seed/core/symbols";

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);

    const dataExamples = JSON.parse(readFileSync(join(__dirname, "${FILES.DATA_EXAMPLES.name}")));

    const getCustomExamples = (input) => dataExamples.find((e) => e.input === input)?.examples ?? [];

    // This function is used to tag a function as a fallback function so we can later identify if the function comes from codegen or not
    const fallbackFunctionTagger = (fn) => {
      fn[FallbackSymbol] = true
      return fn
    }

    export const userModels = ${stringifiedDefaults};
  `;
};
