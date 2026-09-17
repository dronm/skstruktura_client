import * as v from "valibot";

import { defaultTranslate, type TranslateFn } from "@/schemas/common";
import { createSupplierSchemas as createGeneratedSupplierSchemas } from "@/schemas/supplier.gen";

export const createSupplierSchemas = (t: TranslateFn) => {
	const schemas = createGeneratedSupplierSchemas(t);
	const SupplierSubmitSchema = v.pipe(
		schemas.SupplierNewSchema,
		v.forward(
			v.partialCheck(
				[["inn"]],
				({ inn }) =>
					inn.length === 10 || inn.length === 12,
				t("Supplier.validation.innLength"),
			),
			["inn"],
		),
		v.forward(
			v.partialCheck(
				[["inn"], ["kpp"]],
				({ inn, kpp }) =>
					inn.length !== 10 ||
					Boolean(kpp?.trim()),
				t("Supplier.validation.kppRequired"),
			),
			["kpp"],
		),
		v.forward(
			v.partialCheck(
				[["inn"], ["kpp"]],
				({ inn, kpp }) =>
					inn.length !== 12 || !kpp?.trim(),
				t("Supplier.validation.kppForbidden"),
			),
			["kpp"],
		),
	);

	return {
		...schemas,
		SupplierSubmitSchema,
	};
};

const supplierSchemas = createSupplierSchemas(defaultTranslate);

export const SupplierSubmitSchema = supplierSchemas.SupplierSubmitSchema;
