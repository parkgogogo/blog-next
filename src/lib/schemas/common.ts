import { z } from "zod";

const stringFromUnknown = (value: unknown) => {
  const parsed = z.string().safeParse(value);
  return parsed.success ? parsed.data : undefined;
};

const numberFromUnknown = (value: unknown) => {
  const parsed = z.number().safeParse(value);
  return parsed.success ? parsed.data : undefined;
};

const booleanFromUnknown = (value: unknown) => {
  const parsed = z.boolean().safeParse(value);
  return parsed.success ? parsed.data : undefined;
};

export const trimmedStringSchema = z.string().trim();
export const nonEmptyTrimmedStringSchema = trimmedStringSchema.min(1);

export const optionalTrimmedStringSchema = z.preprocess(
  (value) => stringFromUnknown(value),
  trimmedStringSchema.optional(),
);

export const optionalNullableTrimmedStringSchema = z.preprocess(
  (value) => {
    if (value === null) return null;
    return stringFromUnknown(value);
  },
  trimmedStringSchema.nullable().optional(),
);

export const optionalFiniteNumberSchema = z.preprocess(
  (value) => numberFromUnknown(value),
  z.number().finite().optional(),
);

export const optionalPositiveIntSchema = z.preprocess(
  (value) => numberFromUnknown(value),
  z.number().finite().positive().transform(Math.floor).optional(),
);

export const optionalNonNegativeIntSchema = z.preprocess(
  (value) => numberFromUnknown(value),
  z.number().finite().min(0).transform(Math.floor).optional(),
);

export const optionalBooleanSchema = z.preprocess(
  (value) => booleanFromUnknown(value),
  z.boolean().optional(),
);
