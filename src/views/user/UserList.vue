<script setup lang="ts">
import { useI18n } from "vue-i18n";

import { userApi } from "@/api/user";
import type { User, UserKey } from "@/types/user";
import CollectionGrid from "@katren/vue-collection-lib/components/crudGrid/CollectionGrid.vue";
import type { GridColumn } from "@katren/vue-collection-lib/components/crudGrid/types";

const { t } = useI18n();

const columns: GridColumn<User>[] = [
	{
		field: "id",
		headerKey: "User.fields.id",
		sortable: true,
		dataType: "number",
		align: "right",
		width: "8rem",
	},
	{
		field: "name",
		headerKey: "User.fields.name",
		sortable: true,
		width: "18rem",
	},
	{
		field: "role_id",
		headerKey: "User.fields.role_id",
		sortable: true,
		width: "12rem",
		format: (value) => t(`RoleId.${String(value)}`),
	},
];

const getKey = (row: User): UserKey => ({
	id: Number(row.id ?? 0),
});

const routes = {
	create: () => ({
		name: "userCreate",
	}),
	edit: (row: User) => ({
		name: "userEdit",
		params: {
			id: String(row.id),
		},
	}),
	copy: (row: User) => ({
		name: "userCreate",
		query: {
			copy_id: String(row.id),
		},
	}),
};
</script>

<template>
	<section class="py-4">
		<div
			class="mb-4 flex flex-wrap items-center justify-between gap-3"
		>
			<h3 class="text-2xl font-semibold">
				{{ t("User.title") }}
			</h3>
		</div>

		<CollectionGrid
			:api="userApi"
			:columns="columns"
			dataKey="id"
			:getKey="getKey"
			:routes="routes"
			editMode="page"
			stateKey="user-grid"
			:pageSize="30"
			:showCommandShortcuts="false"
		/>
	</section>
</template>
