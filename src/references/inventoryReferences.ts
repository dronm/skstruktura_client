import { defineCrudReference } from "@katren/vue-collection-lib";

import { constructionSiteApi } from "@/api/constructionSite.gen";
import { materialApi } from "@/api/material.gen";
import { materialTypeApi } from "@/api/materialType.gen";
import { measureUnitApi } from "@/api/measureUnit.gen";
import { supplierApi } from "@/api/supplier.gen";
import type { ConstructionSite } from "@/types/constructionSite.gen";
import type { Material } from "@/types/material.gen";
import type { MaterialType } from "@/types/materialType.gen";
import type { MeasureUnit } from "@/types/measureUnit.gen";
import type { Supplier } from "@/types/supplier.gen";

export type IdReferenceKey = {
	id: number;
};

export const constructionSiteReference = defineCrudReference<
	ConstructionSite,
	IdReferenceKey,
	number
>({
	list: constructionSiteApi.list,
	detail: constructionSiteApi.detail,
	keyField: "id",
	searchField: "name",
	descrFields: ["name"],
	minLength: 0,
	completeOnFocus: true,
	fallback: (id) => `#${id}`,
	isEmpty: (id) => id <= 0,
	emptyValue: 0,
	openRoute: (value) => ({
		name: "constructionSiteEdit",
		params: value.keys ?? {},
	}),
	selectRoute: {
		name: "constructionSites",
	},
});

export const supplierReference = defineCrudReference<
	Supplier,
	IdReferenceKey,
	number
>({
	list: supplierApi.list,
	detail: supplierApi.detail,
	keyField: "id",
	searchField: "name",
	descrFields: ["name"],
	minLength: 0,
	completeOnFocus: true,
	fallback: (id) => `#${id}`,
	isEmpty: (id) => id <= 0,
	emptyValue: 0,
	openRoute: (value) => ({
		name: "supplierEdit",
		params: value.keys ?? {},
	}),
	selectRoute: {
		name: "suppliers",
	},
});

export const materialReference = defineCrudReference<
	Material,
	IdReferenceKey,
	number
>({
	list: materialApi.list,
	detail: materialApi.detail,
	keyField: "id",
	searchField: "name",
	descrFields: ["name"],
	minLength: 0,
	completeOnFocus: true,
	fallback: (id) => `#${id}`,
	isEmpty: (id) => id <= 0,
	emptyValue: 0,
	openRoute: (value) => ({
		name: "materialEdit",
		params: value.keys ?? {},
	}),
	selectRoute: {
		name: "materials",
	},
});

export const materialTypeReference = defineCrudReference<
	MaterialType,
	IdReferenceKey,
	number
>({
	list: materialTypeApi.list,
	detail: materialTypeApi.detail,
	keyField: "id",
	searchField: "name",
	descrFields: ["name"],
	minLength: 0,
	completeOnFocus: true,
	fallback: (id) => `#${id}`,
	isEmpty: (id) => id <= 0,
	emptyValue: 0,
	openRoute: (value) => ({
		name: "materialTypeEdit",
		params: value.keys ?? {},
	}),
	selectRoute: {
		name: "materialTypes",
	},
});

export const measureUnitReference = defineCrudReference<
	MeasureUnit,
	IdReferenceKey,
	number
>({
	list: measureUnitApi.list,
	detail: measureUnitApi.detail,
	keyField: "id",
	searchField: "name",
	descrFields: ["name"],
	minLength: 0,
	completeOnFocus: true,
	fallback: (id) => `#${id}`,
	isEmpty: (id) => id <= 0,
	emptyValue: 0,
	openRoute: (value) => ({
		name: "measureUnitEdit",
		params: value.keys ?? {},
	}),
	selectRoute: {
		name: "measureUnits",
	},
});
