<script setup lang="ts">
import { ref } from "vue";

import Dialog from "primevue/dialog";
import Message from "primevue/message";
import {
	FilterOperatorParam,
	parseWithSchema,
	useFormErrors,
	type FormErrorsView,
} from "@katren/vue-collection-lib";

import { materialApi } from "@/api/material.gen";
import { measureUnitApi } from "@/api/measureUnit.gen";
import { supplierApi } from "@/api/supplier.gen";
import MaterialForm from "@/components/material/MaterialForm.vue";
import SupplierForm from "@/components/supplier/SupplierForm.vue";
import { useSupplierSchemas } from "@/composables/schemas/useSupplierSchemas";
import type { MaterialFormModel } from "@/forms/material.gen";
import type { SupplierFormModel } from "@/forms/supplier.gen";
import type { DiadocDocumentDetail, DiadocDocumentItem } from "@/types/diadoc";
import type { MaterialNew } from "@/types/material.gen";
import type { SupplierNew } from "@/types/supplier.gen";

const emit = defineEmits<{
	"supplier-created": [id: number];
	"material-created": [itemID: number, id: number];
}>();

const supplierSchemas = useSupplierSchemas();
const supplierVisible = ref(false);
const materialVisible = ref(false);
const supplierSubmitting = ref(false);
const materialSubmitting = ref(false);
const supplierError = ref("");
const materialError = ref("");
const supplierErrors = useFormErrors();
const materialErrors = ref<FormErrorsView>();
const supplierModel = ref<Partial<SupplierFormModel>>({});
const materialModel = ref<Partial<MaterialFormModel>>({});
const materialItemID = ref(0);
const materialSourceOKEI = ref("");

const errorMessage = (caught: unknown): string => {
	return caught instanceof Error ? caught.message : String(caught);
};

const findMeasureUnitID = async (okeiCode: string): Promise<number> => {
	const normalizedCode = okeiCode.trim();
	if (!normalizedCode) {
		return 0;
	}

	const response = await measureUnitApi.list({
		filter: [
			{
				f: {
					okei_code: {
						o: FilterOperatorParam.E,
						v: normalizedCode,
					},
					is_active: {
						o: FilterOperatorParam.E,
						v: true,
					},
				},
			},
		],
		count: 2,
	});

	return response.rows.length === 1 ? response.rows[0].id : 0;
};

const openSupplier = (document: DiadocDocumentDetail): void => {
	supplierError.value = "";
	supplierErrors.clear();
	supplierModel.value = {
		name: document.sender_name.trim(),
		name_full: document.sender_name.trim(),
		inn: document.sender_inn.trim(),
		kpp: document.sender_kpp.trim(),
		is_active: true,
	};
	supplierVisible.value = true;
};

const openMaterial = async (item: DiadocDocumentItem): Promise<void> => {
	materialError.value = "";
	materialErrors.value = undefined;
	materialItemID.value = item.id;
	materialSourceOKEI.value = item.source_okei_code?.trim() ?? "";
	let measureUnitID = item.measure_unit_id > 0 ? item.measure_unit_id : 0;

	try {
		if (measureUnitID === 0) {
			measureUnitID = await findMeasureUnitID(
				materialSourceOKEI.value,
			);
		}
	} catch (caught: unknown) {
		materialError.value = `Не удалось определить единицу по ОКЕИ: ${errorMessage(caught)}`;
	}

	materialModel.value = {
		name: item.source_name.trim(),
		name_full: item.source_name.trim(),
		measure_unit_id: measureUnitID,
		is_active: true,
	};
	materialVisible.value = true;
};

const createSupplier = async (model: SupplierNew): Promise<void> => {
	supplierError.value = "";
	supplierErrors.clear();

	let validatedModel: SupplierNew;
	try {
		validatedModel = parseWithSchema(
			supplierSchemas.SupplierSubmitSchema,
			model,
		);
	} catch (caught: unknown) {
		supplierErrors.setFromError(caught);
		return;
	}

	supplierSubmitting.value = true;
	try {
		const key = await supplierApi.create(validatedModel);
		supplierVisible.value = false;
		emit("supplier-created", key.id);
	} catch (caught: unknown) {
		supplierError.value = errorMessage(caught);
	} finally {
		supplierSubmitting.value = false;
	}
};

const createMaterial = async (model: MaterialNew): Promise<void> => {
	materialError.value = "";
	if (model.measure_unit_id <= 0) {
		materialError.value = "Выберите единицу измерения.";
		return;
	}

	materialSubmitting.value = true;
	try {
		const key = await materialApi.create({
			...model,
			is_active: true,
		});
		materialVisible.value = false;
		emit("material-created", materialItemID.value, key.id);
	} catch (caught: unknown) {
		materialError.value = errorMessage(caught);
	} finally {
		materialSubmitting.value = false;
	}
};

defineExpose({
	openSupplier,
	openMaterial,
});
</script>

<template>
	<Dialog
		v-model:visible="supplierVisible"
		modal
		header="Создание поставщика из Диадока"
		:style="{ width: 'min(48rem, 96vw)' }"
	>
		<Message
			v-if="supplierError"
			severity="error"
			:closable="false"
			class="mb-4"
		>
			{{ supplierError }}
		</Message>
		<SupplierForm
			v-if="supplierVisible"
			:model="supplierModel"
			:errors="supplierErrors"
			:submitting="supplierSubmitting"
			@submit="createSupplier"
			@cancel="supplierVisible = false"
		/>
	</Dialog>

	<Dialog
		v-model:visible="materialVisible"
		modal
		header="Создание материала из Диадока"
		:style="{ width: 'min(48rem, 96vw)' }"
	>
		<Message
			v-if="materialSourceOKEI"
			severity="info"
			:closable="false"
			class="mb-4"
		>
			Единица Диадока: ОКЕИ {{ materialSourceOKEI }}. Если она
			не была определена автоматически, выберите единицу
			вручную.
		</Message>
		<Message
			v-if="materialError"
			severity="error"
			:closable="false"
			class="mb-4"
		>
			{{ materialError }}
		</Message>
		<MaterialForm
			v-if="materialVisible"
			:model="materialModel"
			:errors="materialErrors"
			:submitting="materialSubmitting"
			:showActive="false"
			@submit="createMaterial"
			@cancel="materialVisible = false"
		/>
	</Dialog>
</template>
