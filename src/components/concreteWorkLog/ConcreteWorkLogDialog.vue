<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import Button from "primevue/button";
import Dialog from "primevue/dialog";
import Textarea from "primevue/textarea";
import InputNumber from "primevue/inputnumber";
import Select from "primevue/select";

import { errorText } from "@katren/vue-collection-lib";

import { concreteWorkLogApi } from "@/api/concreteWorkLog.gen";
import ConcreteStrengthClassSelect from "@/components/inputs/ConcreteStrengthClassSelect.vue";
import TemperatureSelect from "@/components/inputs/TemperatureSelect.vue";
import {
	loadConcreteWorkLogLookups,
	type ConcreteWorkLogLookups,
	type ConcreteWorkLogOption,
} from "@/api/concreteWorkLogLookups";
import { CONCRETE_STRENGTH_CLASSES } from "@/constants/concreteStrengthClasses";
import { useAuthStore } from "@/stores/useAuthStore";
import type { ConcreteWorkLogNew } from "@/types/concreteWorkLog.gen";
import type { MaterialBalanceConstructionSite } from "@/types/materialBalance";

type FieldGroup = "work" | "location" | "strength";
type SelectField =
	| "building_element_id"
	| "supplier_id"
	| "concrete_type_id"
	| "letter_axis_from_id"
	| "letter_axis_to_id"
	| "number_axis_from_id"
	| "number_axis_to_id"
	| "elevation_id";
type NumberField =
	| "volume_m3"
	| "actual_strength_class_mpa"
	| "required_intermediate_strength_percent"
	| "actual_intermediate_strength_percent"
	| "intermediate_age_mean_strength_mpa"
	| "design_age_mean_strength_mpa";
type EditorField =
	| {
			key: SelectField;
			type: "select";
			lookup: keyof ConcreteWorkLogLookups;
			group: FieldGroup;
			required?: boolean;
	  }
	| {
			key: "outside_air_temperature_c";
			type: "temperature";
			group: FieldGroup;
	  }
	| {
			key: "design_concrete_type_id";
			type: "strength";
			group: FieldGroup;
	  }
	| {
			key: NumberField;
			type: "number";
			group: FieldGroup;
			decimals: number;
			min: number;
			max?: number;
	  }
	| { key: "quality_document_number"; type: "text"; group: FieldGroup };

const props = defineProps<{
	site: MaterialBalanceConstructionSite | null;
	recordID: number | null;
	initialDate: string;
	initialSection: number | null;
}>();
const visible = defineModel<boolean>("visible", { required: true });
const emit = defineEmits<{
	saved: [];
	"submitting-change": [value: boolean];
}>();

const { t } = useI18n();
const authStore = useAuthStore();
const fields: EditorField[] = [
	{
		key: "building_element_id",
		type: "select",
		group: "work",
		lookup: "buildingElements",
		required: true,
	},
	{
		key: "supplier_id",
		type: "select",
		group: "work",
		lookup: "suppliers",
		required: true,
	},
	{
		key: "concrete_type_id",
		type: "select",
		group: "work",
		lookup: "concreteTypes",
		required: true,
	},
	{ key: "quality_document_number", type: "text", group: "work" },
	{
		key: "volume_m3",
		type: "number",
		group: "work",
		decimals: 4,
		min: 0,
	},
	{
		key: "outside_air_temperature_c",
		type: "temperature",
		group: "work",
	},
	{
		key: "letter_axis_from_id",
		type: "select",
		group: "location",
		lookup: "letterAxes",
		required: false,
	},
	{
		key: "letter_axis_to_id",
		type: "select",
		group: "location",
		lookup: "letterAxes",
		required: false,
	},
	{
		key: "number_axis_from_id",
		type: "select",
		group: "location",
		lookup: "numberAxes",
		required: false,
	},
	{
		key: "number_axis_to_id",
		type: "select",
		group: "location",
		lookup: "numberAxes",
		required: false,
	},
	{
		key: "elevation_id",
		type: "select",
		group: "location",
		lookup: "elevations",
		required: false,
	},
	{ key: "design_concrete_type_id", type: "strength", group: "strength" },
	{
		key: "actual_strength_class_mpa",
		type: "number",
		group: "strength",
		decimals: 4,
		min: 0,
	},
	{
		key: "required_intermediate_strength_percent",
		type: "number",
		group: "strength",
		decimals: 4,
		min: 0,
	},
	{
		key: "actual_intermediate_strength_percent",
		type: "number",
		group: "strength",
		decimals: 4,
		min: 0,
	},
	{
		key: "intermediate_age_mean_strength_mpa",
		type: "number",
		group: "strength",
		decimals: 4,
		min: 0,
	},
	{
		key: "design_age_mean_strength_mpa",
		type: "number",
		group: "strength",
		decimals: 4,
		min: 0,
	},
];
const groups: FieldGroup[] = ["work", "location", "strength"];
const emptyDraft = (): ConcreteWorkLogNew => ({
	date: new Date(),
	construction_site_id: props.site?.id ?? 0,
	section:
		props.initialSection ??
		((props.site?.section_cnt ?? 0) > 1 ? 1 : null),
	building_element_id: 0,
	supplier_id: 0,
	concrete_type_id: 0,
	quality_document_number: null,
	volume_m3: 0,
	outside_air_temperature_c: null,
	letter_axis_from_id: null,
	letter_axis_to_id: null,
	number_axis_from_id: null,
	number_axis_to_id: null,
	elevation_id: null,
	design_concrete_type_id: null,
	actual_strength_class_mpa: null,
	required_intermediate_strength_percent: null,
	actual_intermediate_strength_percent: null,
	intermediate_age_mean_strength_mpa: null,
	design_age_mean_strength_mpa: null,
});
const designClass = ref<string | null>(null);
const normalizeStrengthClass = (
	value: string | null | undefined,
): string | null =>
	value
		? value
				.trim()
				.toUpperCase()
				.replace(/^B/, "В")
				.replace(".", ",")
		: null;
const setDesignClass = (value: string | null): void => {
	designClass.value = value;
	if (value === null) {
		draft.value.design_concrete_type_id = null;
		return;
	}
	const options = lookups.value?.concreteTypes ?? [];
	const current = options.find(
		(option) =>
			option.id === draft.value.design_concrete_type_id &&
			normalizeStrengthClass(option.strengthClass) === value,
	);
	const match =
		current ??
		options
			.filter(
				(option) =>
					option.active &&
					normalizeStrengthClass(
						option.strengthClass,
					) === value,
			)
			.sort((first, second) => first.id - second.id)[0];
	draft.value.design_concrete_type_id = match?.id ?? null;
};
const draft = ref<ConcreteWorkLogNew>(emptyDraft());
const dateText = ref("");
const initialPlacementText = ref("");
const localTimestamp = (date: Date): string => {
	return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
		.toISOString()
		.slice(0, 19);
};
const lookups = ref<ConcreteWorkLogLookups | null>(null);
const loading = ref(false);
const submitting = ref(false);
const error = ref("");
const ready = ref(false);
let loadSequence = 0;

const editableRole = computed(() => {
	return (
		authStore.user?.role_id === "admin" ||
		authStore.user?.role_id === "construction_site_manager"
	);
});
const sectionOptions = computed(() => {
	return Array.from(
		{ length: Math.max(0, props.site?.section_cnt ?? 0) },
		(_, index) => ({ id: index + 1, label: String(index + 1) }),
	);
});
const canSubmit = computed(() => {
	return (
		editableRole.value &&
		ready.value &&
		!loading.value &&
		!submitting.value &&
		props.site !== null &&
		draft.value.construction_site_id === props.site.id
	);
});
const lookupOptions = (
	field: Extract<EditorField, { type: "select" }>,
): ConcreteWorkLogOption[] => {
	return (lookups.value?.[field.lookup] ?? []).filter(
		(option) =>
			option.active || option.id === draft.value[field.key],
	);
};
const selectPT = {
	overlay: { style: { maxWidth: "calc(100vw - 2rem)" } },
	optionLabel: {
		style: { whiteSpace: "normal", overflowWrap: "anywhere" },
	},
};

const close = (): void => {
	if (!submitting.value) {
		visible.value = false;
	}
};

const load = async (): Promise<void> => {
	const sequence = ++loadSequence;
	const siteID = props.site?.id ?? null;
	const recordID = props.recordID;
	error.value = "";
	ready.value = false;
	lookups.value = null;
	designClass.value = null;

	draft.value = emptyDraft();
	dateText.value = `${props.initialDate}T${localTimestamp(new Date()).slice(11)}`;
	initialPlacementText.value = "";
	if (siteID === null || !editableRole.value) {
		loading.value = false;
		return;
	}
	loading.value = true;
	try {
		const [references, record] = await Promise.all([
			loadConcreteWorkLogLookups(),
			recordID === null
				? Promise.resolve(null)
				: concreteWorkLogApi.detail({
						id: recordID,
					}),
		]);
		if (
			sequence !== loadSequence ||
			!visible.value ||
			props.site?.id !== siteID ||
			props.recordID !== recordID
		) {
			return;
		}
		if (record !== null && record.construction_site_id !== siteID) {
			throw new Error(
				t("ConcreteWorkLog.errors.siteChanged"),
			);
		}
		lookups.value = references;
		if (record !== null) {
			const { id: _id, ...model } = record;
			draft.value = model;
			dateText.value = localTimestamp(record.date);
			initialPlacementText.value = dateText.value;
			designClass.value = normalizeStrengthClass(
				references.concreteTypes.find(
					(option) =>
						option.id ===
						record.design_concrete_type_id,
				)?.strengthClass,
			);
		}
		ready.value = true;
	} catch (caught: unknown) {
		if (sequence === loadSequence) {
			error.value = errorText(caught);
		}
	} finally {
		if (sequence === loadSequence) {
			loading.value = false;
		}
	}
};

const validate = (): string => {
	const model = draft.value;
	const date = new Date(dateText.value);
	if (
		!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(
			dateText.value,
		) ||
		Number.isNaN(date.getTime()) ||
		localTimestamp(date) !==
			(dateText.value.length === 16
				? `${dateText.value}:00`
				: dateText.value)
	) {
		return t("ConcreteWorkLog.errors.dateRequired");
	}
	for (const field of fields) {
		if (field.type === "select") {
			const value = model[field.key];
			if (
				(field.required && !value) ||
				(value !== null &&
					!lookups.value?.[field.lookup].some(
						(option) => option.id === value,
					))
			)
				return t(
					"ConcreteWorkLog.errors.referenceRequired",
				);
		} else if (field.type === "number") {
			const value = model[field.key];
			if (
				(field.key === "volume_m3" && value === null) ||
				(value !== null &&
					(!Number.isFinite(value) || value < 0))
			)
				return t(
					"ConcreteWorkLog.errors.numberInvalid",
				);
		}
	}
	if (
		model.section !== null &&
		(!Number.isInteger(model.section) ||
			model.section < 1 ||
			((props.site?.section_cnt ?? 0) > 1 &&
				model.section > (props.site?.section_cnt ?? 0)))
	)
		return t("ConcreteWorkLog.errors.sectionInvalid");
	if (
		model.outside_air_temperature_c !== null &&
		(!Number.isInteger(model.outside_air_temperature_c) ||
			model.outside_air_temperature_c < -30 ||
			model.outside_air_temperature_c > 38)
	)
		return t("ConcreteWorkLog.errors.temperatureRange");
	if (
		designClass.value !== null &&
		(!CONCRETE_STRENGTH_CLASSES.some(
			(value) => value === designClass.value,
		) ||
			model.design_concrete_type_id === null)
	)
		return t("ConcreteWorkLog.errors.strengthClassMissing");
	return "";
};

const submit = async (): Promise<void> => {
	if (!canSubmit.value || props.site === null) {
		return;
	}
	error.value = validate();
	if (error.value) {
		return;
	}
	const siteID = props.site.id;
	const recordID = props.recordID;
	const model: ConcreteWorkLogNew = {
		...draft.value,
		date:
			recordID !== null &&
			dateText.value === initialPlacementText.value
				? draft.value.date
				: new Date(dateText.value),
		construction_site_id: siteID,
	};
	submitting.value = true;
	emit("submitting-change", true);
	try {
		if (recordID === null) {
			await concreteWorkLogApi.create(model);
		} else {
			// Keep the original site: edits cannot move a row to another construction site.
			const { construction_site_id: _siteID, ...update } =
				model;
			await concreteWorkLogApi.update(
				{ id: recordID },
				update,
			);
		}
		visible.value = false;
		emit("saved");
	} catch (caught: unknown) {
		error.value = errorText(caught);
	} finally {
		submitting.value = false;
		emit("submitting-change", false);
	}
};

watch(
	() => [visible.value, props.site?.id, props.recordID] as const,
	([isVisible]) => {
		if (isVisible) {
			void load();
		} else {
			++loadSequence;
			ready.value = false;
			loading.value = false;
		}
	},
);
</script>

<template>
	<Dialog
		class="construction-log-dialog"
		:visible="visible"
		@update:visible="close"
		modal
		:header="
			t(
				recordID === null
					? 'ConcreteWorkLog.dialog.create'
					: 'ConcreteWorkLog.dialog.edit',
			)
		"
		:closable="!submitting"
		:dismissableMask="false"
		:closeOnEscape="!submitting"
		:style="{ width: '52rem', maxWidth: 'calc(100vw - 1rem)' }"
	>
		<form class="construction-log-form" @submit.prevent="submit">
			<div v-if="error" class="log-alert" role="alert">
				<span>{{ error }}</span>
				<Button
					v-if="!ready && !loading"
					:label="
						t(
							'ConcreteWorkLog.commands.refresh',
						)
					"
					severity="secondary"
					text
					@click="load"
				/>
			</div>
			<div v-if="loading" class="log-loading" role="status">
				<i
					class="pi pi-spin pi-spinner"
					aria-hidden="true"
				/>
				{{
					t(
						"ConcreteWorkLog.messages.loadingReferences",
					)
				}}
			</div>
			<fieldset
				:disabled="!ready || submitting"
				class="log-fieldset"
			>
				<legend>
					{{ t("ConcreteWorkLog.groups.main") }}
				</legend>
				<div class="log-form-grid">
					<div class="log-field log-full-width">
						<span class="log-label">{{
							t(
								"ConcreteWorkLog.fields.construction_site_id",
							)
						}}</span>
						<div class="log-site-name">
							{{ site?.name }}
						</div>
					</div>
					<div class="log-field">
						<label
							for="concreteWorkLogEditDate"
							>{{
								t(
									"ConcreteWorkLog.fields.date",
								)
							}}
							*</label
						>
						<input
							id="concreteWorkLogEditDate"
							v-model="dateText"
							type="datetime-local"
							step="1"
							required
							class="log-date-input"
						/>
					</div>
					<div
						v-if="
							(site?.section_cnt ??
								0) > 1
						"
						class="log-field"
					>
						<label
							for="concreteWorkLogEditSection"
							>{{
								t(
									"ConcreteWorkLog.fields.section",
								)
							}}</label
						>
						<Select
							inputId="concreteWorkLogEditSection"
							v-model="draft.section"
							:options="
								sectionOptions
							"
							optionValue="id"
							optionLabel="label"
							:disabled="
								!ready ||
								submitting
							"
							:pt="selectPT"
							showClear
							class="log-control"
						/>
					</div>
				</div>
			</fieldset>
			<fieldset
				v-for="group in groups"
				:key="group"
				:disabled="!ready || submitting"
				class="log-fieldset"
			>
				<legend>
					{{
						t(
							`ConcreteWorkLog.groups.${group}`,
						)
					}}
				</legend>
				<div class="log-form-grid">
					<div
						v-for="field in fields.filter(
							(entry) =>
								entry.group ===
								group,
						)"
						:key="field.key"
						class="log-field"
						:class="{
							'log-full-width':
								field.key ===
									'building_element_id' ||
								field.key ===
									'supplier_id',
						}"
					>
						<label
							:for="`concreteWorkLogEdit-${field.key}`"
							>{{
								t(
									`ConcreteWorkLog.fields.${field.key}`,
								)
							}}{{
								field.type ===
									"select" &&
								field.required
									? " *"
									: ""
							}}</label
						>
						<Select
							v-if="
								field.type ===
								'select'
							"
							:inputId="`concreteWorkLogEdit-${field.key}`"
							v-model="
								draft[field.key]
							"
							:options="
								lookupOptions(
									field,
								)
							"
							optionValue="id"
							optionLabel="label"
							:disabled="
								!ready ||
								submitting
							"
							:showClear="
								!field.required
							"
							:pt="selectPT"
							filter
							class="log-control"
						/>
						<TemperatureSelect
							v-else-if="
								field.type ===
								'temperature'
							"
							:inputId="`concreteWorkLogEdit-${field.key}`"
							v-model="
								draft[field.key]
							"
							:disabled="
								!ready ||
								submitting
							"
							:pt="selectPT"
							showClear
							class="log-control"
						/>
						<Textarea
							v-else-if="
								field.type ===
								'text'
							"
							:id="`concreteWorkLogEdit-${field.key}`"
							v-model="
								draft[field.key]
							"
							:disabled="
								!ready ||
								submitting
							"
							autoResize
							rows="2"
							class="log-control"
						/>
						<ConcreteStrengthClassSelect
							v-else-if="
								field.type ===
								'strength'
							"
							:inputId="`concreteWorkLogEdit-${field.key}`"
							:model-value="
								designClass
							"
							@update:model-value="
								setDesignClass
							"
							:disabled="
								!ready ||
								submitting
							"
							:pt="selectPT"
							class="log-control"
						/>
						<InputNumber
							v-else
							:inputId="`concreteWorkLogEdit-${field.key}`"
							v-model="
								draft[field.key]
							"
							:disabled="
								!ready ||
								submitting
							"
							:min="field.min"
							:max="field.max"
							:maxFractionDigits="
								field.decimals
							"
							:useGrouping="false"
							:pt="{
								pcInputText: {
									root: {
										inputmode: 'decimal',
									},
								},
							}"
							locale="ru-RU"
							showButtons
							buttonLayout="stacked"
							incrementIcon="pi pi-plus"
							decrementIcon="pi pi-minus"
							class="log-control"
						/>
					</div>
				</div>
			</fieldset>
		</form>
		<template #footer>
			<Button
				:label="t('ConcreteWorkLog.commands.cancel')"
				severity="secondary"
				text
				:disabled="submitting"
				@click="close"
			/>
			<Button
				:label="t('ConcreteWorkLog.commands.save')"
				icon="pi pi-check"
				:loading="submitting"
				:disabled="!canSubmit"
				@click="submit"
			/>
		</template>
	</Dialog>
</template>

<style scoped>
.construction-log-form,
.log-fieldset,
.log-field,
.log-control {
	min-width: 0;
	max-width: 100%;
}
.construction-log-form {
	display: grid;
	gap: 1rem;
}
.log-fieldset {
	border: 1px solid #e2e8f0;
	border-radius: 0.5rem;
	padding: 0.75rem;
}
.log-fieldset legend {
	padding: 0 0.35rem;
	font-weight: 600;
	font-size: 0.875rem;
}
.log-form-grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 0.75rem;
}
.log-field {
	display: grid;
	align-content: start;
	gap: 0.3rem;
}
.log-field label,
.log-label {
	font-size: 0.875rem;
	font-weight: 500;
	overflow-wrap: anywhere;
}
.log-full-width {
	grid-column: 1 / -1;
}
.log-site-name {
	padding: 0.5rem 0.75rem;
	border-radius: 0.375rem;
	background: #f1f5f9;
	overflow-wrap: anywhere;
}
.log-date-input {
	box-sizing: border-box;
	width: 100%;
	min-width: 0;
	max-width: 100%;
	border: 1px solid #cbd5e1;
	border-radius: 0.375rem;
	padding: 0.5rem 0.75rem;
	background: white;
	color: #0f172a;
}
.log-control {
	width: 100%;
}
.log-control :deep(.p-select-label),
.log-control :deep(.p-inputnumber-input) {
	min-width: 0;
	width: 100%;
}
.log-control :deep(.p-inputnumber-input) {
	padding-right: 2.25rem !important;
}
.log-control :deep(.p-select-label) {
	white-space: normal;
	overflow-wrap: anywhere;
}
.log-alert {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 0.5rem;
	border: 1px solid #fca5a5;
	border-radius: 0.375rem;
	padding: 0.75rem;
	color: #b91c1c;
	background: #fef2f2;
	overflow-wrap: anywhere;
}
.log-alert > span {
	flex: 1 1 12rem;
	min-width: 0;
}
.log-loading {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	padding: 0.5rem;
	font-size: 0.875rem;
}
.construction-log-dialog :deep(.p-dialog-content),
.construction-log-dialog :deep(.p-dialog-title) {
	min-width: 0;
	overflow-wrap: anywhere;
}
.construction-log-dialog :deep(.p-dialog-footer) {
	flex-wrap: wrap;
}
@media (max-width: 479px) {
	.log-form-grid {
		grid-template-columns: minmax(0, 1fr);
	}
}
</style>
