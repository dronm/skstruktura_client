<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";

import Button from "primevue/button";

import { userApi } from "@/api/user";
import {
	useCollectionFormSubmit,
	useFormErrors,
} from "@katren/vue-collection-lib/composables/form";
import { useUserSchemas } from "@/composables/schemas/useUserSchemas";
import UserConstructionSitesGrid from "@/components/user/UserConstructionSitesGrid.vue";
import UserEntityContactsGrid from "@/components/user/UserEntityContactsGrid.vue";
import UserForm from "@/components/user/UserForm.vue";
import type { User, UserKey, UserNew, UserUpd } from "@/types/user";

type UserFormModel = Partial<User> & {
	pwd?: string;
};

interface PendingEditGuard {
	hasPendingEdit: () => boolean;
}

const { t } = useI18n();
const userSchemas = useUserSchemas();
const route = useRoute();
const router = useRouter();

const loading = ref(false);
const model = ref<UserFormModel>({});
const constructionSiteIDs = ref<number[]>([]);
const constructionSitesGrid = ref<PendingEditGuard | null>(null);
const formErrors = useFormErrors();

const isCreate = computed(() => route.name === "userCreate");
const mode = computed<"create" | "edit" | "copy">(() => {
	if (!isCreate.value) {
		return "edit";
	}

	return route.query.copy_id ? "copy" : "create";
});

const routeKey = computed<UserKey>(() => {
	return {
		id: Number(route.params.id ?? 0),
	};
});

const goBack = async (): Promise<void> => {
	await router.push({
		name: "users",
	});
};

const formSubmit = useCollectionFormSubmit<
	UserFormModel,
	UserKey,
	UserNew,
	UserUpd
>({
	api: userApi,
	mode,
	key: routeKey,
	fields: ["name", "role_id", "pwd", "construction_site_ids"],
	createSchema: userSchemas.UserNewSchema,
	updateSchema: userSchemas.UserUpdSchema,
	errors: formErrors,
	onSuccess: goBack,
});

const load = async (): Promise<void> => {
	loading.value = true;
	try {
		formErrors.clear();

		if (mode.value === "edit") {
			const detail = await userApi.detail(routeKey.value);
			model.value = detail;
			constructionSiteIDs.value = [
				...detail.construction_site_ids,
			];
			formSubmit.setInitialModel(detail);
			return;
		}

		if (mode.value === "copy") {
			const detail = await userApi.detail({
				id: Number(route.query.copy_id ?? 0),
			});
			model.value = {
				...detail,
				name: `${detail.name} - ${t("Grid.copySuffix")}`,
			};
			constructionSiteIDs.value = [
				...detail.construction_site_ids,
			];
			formSubmit.setInitialModel(null);
			return;
		}

		model.value = {
			name: "",
			role_id: "admin",
			pwd: "",
			construction_site_ids: [],
		};
		constructionSiteIDs.value = [];
		formSubmit.setInitialModel(null);
	} finally {
		loading.value = false;
	}
};

const submit = async (formModel: UserNew | UserUpd): Promise<void> => {
	if (constructionSitesGrid.value?.hasPendingEdit()) {
		formErrors.setForm(
			t("User.constructionSites.errors.finishEditing"),
		);
		return;
	}

	await formSubmit.submit({
		...formModel,
		construction_site_ids: [...constructionSiteIDs.value],
	});
};

onMounted(load);
</script>

<template>
	<section class="py-4">
		<div class="mb-4 flex items-center justify-between gap-3">
			<div>
				<h1 class="text-2xl font-semibold">
					{{ t(`User.form.${mode}`) }}
				</h1>
			</div>

			<Button
				:label="t('Grid.commands.back')"
				icon="pi pi-arrow-left"
				severity="secondary"
				outlined
				@click="goBack"
			/>
		</div>

		<div
			v-if="loading"
			class="rounded-md border border-gray-200 p-4"
		>
			{{ t("Grid.loading") }}
		</div>

		<div v-else class="space-y-4">
			<div
				class="rounded-md border border-gray-200 bg-white p-4"
			>
				<UserForm
					:model="model"
					:mode="mode"
					:errors="formErrors"
					:submitting="
						formSubmit.submitting.value
					"
					@submit="submit"
					@cancel="goBack"
				>
					<template #before-actions>
						<div
							class="border-t border-gray-200 pt-5"
						>
							<UserConstructionSitesGrid
								ref="constructionSitesGrid"
								v-model="
									constructionSiteIDs
								"
							/>
						</div>
					</template>
				</UserForm>
			</div>

			<div
				v-if="mode === 'edit'"
				class="rounded-md border border-gray-200 bg-white p-4"
			>
				<UserEntityContactsGrid :userId="routeKey.id" />
			</div>
		</div>
	</section>
</template>
