<script setup lang="ts">
import type { MaxUser, MaxUserKey, MaxUserUpd } from "@/types/maxUser.gen";
import type { MaxUserList } from "@/types/maxUserList.gen";
import { CollectionListPage, defineCollection, type GridCommand } from "@katren/vue-collection-lib";
import { maxUserApi } from "@/api/maxUser.gen";
import { formatReference } from "@/utils/reference";

type CreateModel = never;
type ListModel = MaxUserList;

const commands: GridCommand<ListModel, MaxUserKey>[] = [
	{ name: "delete" },
	{ name: "search" },
	{ name: "refresh" },
];

const maxUserCollection = defineCollection<
	ListModel,
	MaxUserKey,
	CreateModel,
	MaxUserUpd,
	MaxUser
>({
	titleKey: "MaxUser.title",
	api: maxUserApi,
	columns: [
		{
			field: "username",
			headerKey: "MaxUser.fields.username",
			sortable: true,
			width: "24rem",
		},
		{
			field: "contact",
			headerKey: "MaxUser.fields.contact",
			sortable: true,
			width: "30rem",
			sortField: "contact->>'descr'",
			format: formatReference,
		},
		{
			field: "max_user_id",
			headerKey: "MaxUser.fields.max_user_id",
			sortable: true,
			dataType: "number",
			align: "right",
			width: "12rem",
		},
		{
			field: "is_active",
			headerKey: "MaxUser.fields.is_active",
			sortable: true,
			dataType: "boolean",
			width: "8rem",
		},
	],
	commands,
	dataKey: "id",
	getKey: (row) => ({
		id: row.id,
	}),
	routes: {
	},
	editMode: "page",
	stateKey: "maxUser-grid",
	pageSize: 30,
	showCommandShortcuts: false,
});
</script>

<template>
	<CollectionListPage :collection="maxUserCollection" />
</template>
