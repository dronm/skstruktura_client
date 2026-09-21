import {
	defineCrudReference,
	FilterOperatorParam,
	type CollectionParams,
} from "@katren/vue-collection-lib";

import { constructionSiteApi } from "@/api/constructionSite.gen";
import { materialApi } from "@/api/material.gen";
import { materialRequestStatusApi } from "@/api/materialRequestStatus.gen";
import { materialTypeApi } from "@/api/materialType.gen";
import { measureUnitApi } from "@/api/measureUnit.gen";
import { orderImportanceApi } from "@/api/orderImportance.gen";
import { supplierApi } from "@/api/supplier.gen";
import { userApi } from "@/api/user";
import type { ConstructionSite } from "@/types/constructionSite.gen";
import type { Material } from "@/types/material.gen";
import type { MaterialRequestStatus } from "@/types/materialRequestStatus.gen";
import type { MaterialType } from "@/types/materialType.gen";
import type { MeasureUnit } from "@/types/measureUnit.gen";
import type { OrderImportance } from "@/types/orderImportance.gen";
import type { Supplier } from "@/types/supplier.gen";
import type { User } from "@/types/user";

export type IdReferenceKey = {
	id: number;
};

const constructionManagerList = async (
	params: CollectionParams = {},
) => {
	return await userApi.list({
		...params,
		filter: [
			...(params.filter ?? []),
			{
				f: {
					role_id: {
						o: FilterOperatorParam.E,
						v: "construction_site_manager",
					},
				},
			},
		],
	});
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

export const constructionManagerReference = defineCrudReference<
	User,
	IdReferenceKey,
	number
>({
	list: constructionManagerList,
	detail: userApi.detail,
	keyField: "id",
	searchField: "name",
	descrFields: ["name"],
	minLength: 0,
	completeOnFocus: true,
	fallback: (id) => `#${id}`,
	isEmpty: (id) => id <= 0,
	emptyValue: 0,
	openRoute: (value) => ({
		name: "userEdit",
		params: value.keys ?? {},
	}),
	selectRoute: {
		name: "users",
	},
});

export const orderImportanceReference = defineCrudReference<
	OrderImportance,
	IdReferenceKey,
	number
>({
	list: orderImportanceApi.list,
	detail: orderImportanceApi.detail,
	keyField: "id",
	searchField: "name",
	descrFields: ["name"],
	minLength: 0,
	completeOnFocus: true,
	fallback: (id) => `#${id}`,
	isEmpty: (id) => id <= 0,
	emptyValue: 0,
	selectRoute: {
		name: "orderImportances",
	},
});

export const materialRequestStatusReference = defineCrudReference<
	MaterialRequestStatus,
	IdReferenceKey,
	number
>({
	list: materialRequestStatusApi.list,
	detail: materialRequestStatusApi.detail,
	keyField: "id",
	searchField: "name",
	descrFields: ["name"],
	minLength: 0,
	completeOnFocus: true,
	fallback: (id) => `#${id}`,
	isEmpty: (id) => id <= 0,
	emptyValue: 0,
	selectRoute: {
		name: "materialRequestStatuses",
	},
});
