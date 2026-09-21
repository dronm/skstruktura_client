<script setup lang="ts">
import {
	CollectionListPage,
	defineCollection,
	type GridCommand,
} from "@katren/vue-collection-lib";

import { materialRequestDocumentApi } from "@/api/materialDocuments";
import { materialRequestApi } from "@/api/materialRequest.gen";
import { useAuthStore } from "@/stores/useAuthStore";
import type { MaterialRequestDocument } from "@/types/materialDocuments";
import type {
	MaterialRequestKey,
	MaterialRequestNew,
	MaterialRequestUpd,
} from "@/types/materialRequest.gen";
import type { MaterialRequestList } from "@/types/materialRequestList.gen";
import { formatReference } from "@/utils/reference";

const formatDate = (value: unknown): string => {
	return value instanceof Date ? value.toLocaleString("ru-RU") : "";
};

const authStore = useAuthStore();
const roleID = authStore.user?.role_id;
const canManageRequests =
	roleID === "admin" || roleID === "construction_site_manager";
const canEditRequests = canManageRequests || roleID === "supplier";

const commands: GridCommand<MaterialRequestList, MaterialRequestKey>[] = [
	...(canManageRequests ? ([{ name: "create" }] as const) : []),
	...(canEditRequests ? ([{ name: "edit" }] as const) : []),
	...(canManageRequests ? ([{ name: "copy" }] as const) : []),
	...(canManageRequests ? ([{ name: "delete" }] as const) : []),
	{ name: "search" },
	{ name: "refresh" },
];

const collection = defineCollection<
	MaterialRequestList,
	MaterialRequestKey,
	MaterialRequestNew,
	MaterialRequestUpd,
	MaterialRequestDocument
>({
	titleKey: "MaterialRequest.title",
	api: {
		serviceName: materialRequestApi.serviceName,
		list: materialRequestApi.list,
		detail: materialRequestDocumentApi.detail,
		delete: materialRequestApi.delete,
	},
	columns: [
		{
			field: "id",
			headerKey: "MaterialRequest.fields.id",
			sortable: true,
			dataType: "number",
			align: "right",
			width: "8rem",
		},
		{
			field: "date",
			headerKey: "MaterialRequest.fields.date",
			sortable: true,
			dataType: "datetime",
			format: formatDate,
			width: "14rem",
		},
		{
			field: "construction_site",
			headerKey: "MaterialRequest.fields.construction_site_id",
			sortable: true,
			sortField: "construction_site->>'descr'",
			format: formatReference,
			width: "20rem",
		},
		{
			field: "construction_manager",
			headerKey: "MaterialRequest.fields.construction_manager_id",
			sortable: true,
			sortField: "construction_manager->>'descr'",
			format: formatReference,
			width: "20rem",
		},
		{
			field: "comment",
			headerKey: "MaterialRequest.fields.comment",
			sortable: true,
			width: "28rem",
		},
	],
	commands,
	dataKey: "id",
	getKey: (row) => ({ id: row.id }),
	routes: {
		create: () => ({ name: "materialRequestCreate" }),
		edit: (row) => ({
			name: "materialRequestEdit",
			params: { id: String(row.id) },
		}),
		copy: (row) => ({
			name: "materialRequestCreate",
			query: { copy_id: String(row.id) },
		}),
	},
	stateKey: "materialRequest-grid",
	pageSize: 30,
	showCommandShortcuts: false,
});
</script>

<template>
	<CollectionListPage :collection="collection" />
</template>
