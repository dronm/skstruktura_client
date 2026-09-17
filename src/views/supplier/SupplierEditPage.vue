<script setup lang="ts">
import { useI18n } from "vue-i18n";

import {
	CollectionEditPage,
	parseWithSchema,
	useCollectionEditPage,
} from "@katren/vue-collection-lib";

import { supplierApi } from "@/api/supplier.gen";
import ObjectHistoryButton from "@/components/history/ObjectHistoryButton.vue";
import SupplierForm from "@/components/supplier/SupplierForm.vue";
import { useSupplierSchemas } from "@/composables/schemas/useSupplierSchemas";
import {
	createSupplierFormModel,
	supplierFormMutationFields,
	type SupplierFormModel,
} from "@/forms/supplier.gen";
import type {
	Supplier,
	SupplierKey,
	SupplierNew,
	SupplierUpd,
} from "@/types/supplier.gen";

const { t } = useI18n();
const schemas = useSupplierSchemas();
const edit = useCollectionEditPage<
	SupplierFormModel,
	SupplierKey,
	SupplierNew,
	SupplierUpd,
	Supplier
>({
	api: supplierApi,
	createRouteName: "supplierCreate",
	listRoute: { name: "suppliers" },
	keyFromRoute: (route) => ({ id: Number(route.params.id ?? 0) }),
	copyKeyFromRoute: (route) =>
		route.query.copy_id
			? { id: Number(route.query.copy_id) }
			: null,
	createModel: createSupplierFormModel,
	copyModel: (detail) => ({
		...detail,
		id: undefined,
		name: `${detail.name} - ${t("Grid.copySuffix")}`,
	}),
	fields: supplierFormMutationFields,
	createSchema: schemas.SupplierNewSchema,
	updateSchema: schemas.SupplierUpdSchema,
	success: { mode: "back" },
});

const submit = async (model: SupplierNew): Promise<void> => {
	try {
		const validatedModel = parseWithSchema(
			schemas.SupplierSubmitSchema,
			model,
		);
		await edit.submit(validatedModel);
	} catch (error: unknown) {
		edit.errors.setFromError(error);
	}
};
</script>

<template>
	<CollectionEditPage
		:title="t(`Supplier.form.${edit.mode.value}`)"
		:loading="edit.loading.value"
		@back="edit.goBack"
	>
		<div
			v-if="edit.mode.value === 'edit'"
			class="mb-4 flex justify-end"
		>
			<ObjectHistoryButton
				object-type="suppliers"
				:object-id="edit.key.value.id"
			/>
		</div>
		<SupplierForm
			:model="edit.model.value"
			:mode="edit.mode.value"
			:errors="edit.errors"
			:submitting="edit.submitting.value"
			@submit="submit"
			@cancel="edit.goBack"
		/>
	</CollectionEditPage>
</template>
