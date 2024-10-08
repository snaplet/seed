import { type copycat } from "@snaplet/copycat";
import { type Json } from "#core/data/types.js";
import { jsonStringify } from "#core/utils.js";
import { type TemplateContext, type TemplateFn } from "./types.js";

type Copycat = typeof copycat;

type CopycatMethodName = keyof Copycat;

type CopycatMethodOptions<MethodName extends CopycatMethodName> = Last<
  Parameters<Copycat[MethodName]>
>;

type Last<Items extends Array<unknown>> = Items extends [
  ...infer _Rest,
  infer Item,
]
  ? Item
  : Items extends [...infer _Rest, (infer Item)?]
    ? Item
    : never;

interface CopycatTemplateOptions<MethodName extends CopycatMethodName> {
  args?: Array<Json>;
  isString?: boolean;
  options?: Partial<CopycatMethodOptions<MethodName>>;
  wrap?: (code: string) => string;
}

const COPYCAT_METHODS_SUPPORTING_LIMIT_SET = new Set<CopycatMethodName>([
  "email",
  "username",
  "firstName",
  "lastName",
  "fullName",
  "oneOfString",
  "url",
]);

const COPYCAT_METHODS_RETURNING_NON_STRINGS_SET = new Set<CopycatMethodName>([
  "bool",
  "float",
  "int",
  "oneOf",
]);

export const generateCopycatCall = <
  MethodName extends CopycatMethodName,
>(props: {
  context: TemplateContext;
  extraOptions?: Partial<CopycatMethodOptions<MethodName>>;
  inputs: Array<string>;
  isString: boolean;
  methodName: MethodName;
}): string => {
  const { context, methodName, inputs, isString, extraOptions } = props;
  const args = [...inputs.map((input) => String(input))];

  const { maxLength, optionsInput } = context;

  const options: Partial<CopycatMethodOptions<MethodName>> = {
    ...(extraOptions ?? {}),
  };

  let needsTruncating = false;

  if (maxLength != null) {
    if (COPYCAT_METHODS_SUPPORTING_LIMIT_SET.has(methodName)) {
      (options as { limit?: number }).limit = maxLength;
    } else {
      needsTruncating = true;
    }
  }

  const hasOwnOptions = Object.keys(options).length > 0;
  let optionsArg: null | string = null;

  if (optionsInput != null && hasOwnOptions) {
    optionsArg = `{ ...${jsonStringify(options)}, ...${optionsInput} }`;
  } else if (optionsInput == null && hasOwnOptions) {
    optionsArg = jsonStringify(options);
  } else if (optionsInput != null && !hasOwnOptions) {
    optionsArg = optionsInput;
  }

  if (optionsArg != null) {
    args.push(optionsArg);
  }

  let code = `copycat.${methodName}(${args.join(", ")})`;

  if (isString && COPYCAT_METHODS_RETURNING_NON_STRINGS_SET.has(methodName)) {
    code = `${code}.toString()`;
  }

  if (needsTruncating && isString) {
    code = `${code}.slice(0, ${context.maxLength})`;
  }

  return code;
};

export const copycatTemplate = <MethodName extends CopycatMethodName>(
  methodName: MethodName,
  options?: CopycatTemplateOptions<MethodName>,
): TemplateFn => {
  const { wrap } = options ?? {};
  const serializedArgs = (options?.args ?? []).map((arg) => jsonStringify(arg));

  const templateFn: TemplateFn = (context) => {
    const code = generateCopycatCall({
      context,
      methodName,
      inputs: [context.input, ...serializedArgs],
      isString: options?.isString ?? false,
      extraOptions: options?.options,
    });

    return wrap ? wrap(code) : code;
  };

  return templateFn;
};

export const copycatStringTemplate = <MethodName extends CopycatMethodName>(
  methodName: MethodName,
  options?: CopycatTemplateOptions<MethodName>,
): TemplateFn =>
  copycatTemplate(methodName, {
    isString: true,
    ...options,
  });
