import { getDataModelConfig } from "#config/dataModelConfig.js";
import { getSeedConfig } from "../../config/seedConfig/seedConfig.js";
import { getAliasedDataModel } from "./aliases.js";
import { getSelectFilteredDataModel } from "./select.js";
import {
  type DataModel,
  type DataModelField,
  type DataModelObjectField,
} from "./types.js";

export function isParentField(
  field: DataModelField,
): field is DataModelObjectField {
  return field.kind === "object" && field.relationFromFields.length > 0;
}

export function isNullableParent(
  dataModel: DataModel,
  model: string,
  fieldName: string,
) {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const field = dataModel.models[model].fields.find(
    (f) => f.name === fieldName,
  )!;

  return (
    !field.isRequired &&
    dataModel.models[model].fields.some(
      (f) => f.kind === "object" && f.relationFromFields.includes(fieldName),
    )
  );
}

export async function getRawDataModel() {
  const dataModel = await getDataModelConfig();
  if (dataModel === null) {
    // TODO: Add a better error
    throw new Error(
      "DataModel not found. Please run `snaplet introspect` to generate it.",
    );
  }
  return dataModel;
}

export async function getDataModel() {
  const dataModelConfig = await getDataModelConfig();

  if (dataModelConfig === null) {
    // TODO: Add a better error
    throw new Error(
      "DataModel not found. Please run `snaplet introspect` to generate it.",
    );
  }

  const snapletConfig = await getSeedConfig();

  const filteredDataModel = getSelectFilteredDataModel(
    dataModelConfig,
    snapletConfig.select,
  );
  return getAliasedDataModel(filteredDataModel, snapletConfig.alias);
}
