<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import Button from "primevue/button";
import Dialog from "primevue/dialog";
import Textarea from "primevue/textarea";
import InputNumber from "primevue/inputnumber";
import Select from "primevue/select";

import { errorText } from "@katren/vue-collection-lib";

import { concreteHeatingLogApi } from "@/api/concreteHeatingLog.gen";
import TemperatureSelect from "@/components/inputs/TemperatureSelect.vue";
import {
	loadConcreteHeatingLogLookups,
	type ConcreteHeatingLogLookups,
	type ConcreteHeatingLogOption,
} from "@/api/concreteHeatingLogLookups";
import { useAuthStore } from "@/stores/useAuthStore";
import type { ConcreteHeatingLogNew } from "@/types/concreteHeatingLog.gen";
import type { MaterialBalanceConstructionSite } from "@/types/materialBalance";

type FieldGroup = "work" | "location" | "downtime";
type TemperatureField =
	| "outside_air_temperature_c"
	| "concrete_temperature_c"
	| "average_curing_temperature_c";
type EditorField =
	| {
			key: "building_element_id";
			type: "select";
			lookup: "buildingElements";
			group: FieldGroup;
			required: boolean;
	  }
	| { key: TemperatureField; type: "temperature"; group: FieldGroup }
	| {
			key:
				| "volume_m3"
				| "surface_modulus_m_inv"
				| "curing_duration_hours"
				| "degree_hours"
				| "specimen_strength_mpa";
			type: "number";
			group: FieldGroup;
			decimals: number;
			min?: number;
			max?: number;
	  }
	| {
			key:
				| "curing_method"
				| "temperature_well_number"
				| "specimen_marking"
				| "specimen_curing_conditions";
			type: "text";
			group: FieldGroup;
	  }
	| { key: "measured_at"; type: "datetime"; group: FieldGroup };

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
		key: "volume_m3",
		type: "number",
		group: "work",
		decimals: 6,
		min: 0,
	},
	{
		key: "surface_modulus_m_inv",
		type: "number",
		group: "work",
		decimals: 6,
		min: 0,
	},
	{ key: "curing_method", type: "text", group: "work" },
	{ key: "temperature_well_number", type: "text", group: "location" },
	{
		key: "outside_air_temperature_c",
		type: "temperature",
		group: "location",
	},
	{ key: "measured_at", type: "datetime", group: "location" },
	{
		key: "concrete_temperature_c",
		type: "temperature",
		group: "location",
	},
	{
		key: "curing_duration_hours",
		type: "number",
		group: "location",
		decimals: 6,
		min: 0,
	},
	{ key: "degree_hours", type: "number", group: "location", decimals: 6 },
	{
		key: "average_curing_temperature_c",
		type: "temperature",
		group: "location",
	},
	{ key: "specimen_marking", type: "text", group: "downtime" },
	{ key: "specimen_curing_conditions", type: "text", group: "downtime" },
	{
		key: "specimen_strength_mpa",
		type: "number",
		group: "downtime",
		decimals: 6,
		min: 0,
	},
];
const groups: FieldGroup[] = ["work", "location", "downtime"];
const emptyDraft = (): ConcreteHeatingLogNew => ({
	construction_site_id: props.site?.id ?? 0,
	section:
		props.initialSection ??
		((props.site?.section_cnt ?? 0) > 1 ? 1 : null),
	date: new Date(),
	building_element_id: 0,
	volume_m3: 0,
	surface_modulus_m_inv: null,
	curing_method: null,
	temperature_well_number: null,
	outside_air_temperature_c: null,
	measured_at: null,
	concrete_temperature_c: null,
	curing_duration_hours: null,
	degree_hours: null,
	average_curing_temperature_c: null,
	specimen_marking: null,
	specimen_curing_conditions: null,
	specimen_strength_mpa: null,
});
const measurementText = ref("");
const initialMeasurementText = ref("");
const localTimestamp = (date: Date): string => {
	const local = new Date(
		date.getTime() - date.getTimezoneOffset() * 60000,
	);
	return local.toISOString().slice(0, 19);
};
const draft = ref<ConcreteHeatingLogNew>(emptyDraft());
const dateText = ref("");
const lookups = ref<ConcreteHeatingLogLookups | null>(null);
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
): ConcreteHeatingLogOption[] => {
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
	measurementText.value = "";
	initialMeasurementText.value = "";
	draft.value = emptyDraft();
	dateText.value = props.initialDate;
	if (siteID === null || !editableRole.value) {
		loading.value = false;
		return;
	}
	loading.value = true;
	try {
		const [references, record] = await Promise.all([
			loadConcreteHeatingLogLookups(),
			recordID === null
				? Promise.resolve(null)
				: concreteHeatingLogApi.detail({
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
				t("ConcreteHeatingLog.errors.siteChanged"),
			);
		}
		lookups.value = references;
		if (record !== null) {
			const { id: _id, ...model } = record;
			draft.value = model;
			dateText.value = record.date.toISOString().slice(0, 10);
			measurementText.value =
				record.measured_at === null
					? ""
					: localTimestamp(record.measured_at);
			initialMeasurementText.value = measurementText.value;
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
	const date = new Date(`${dateText.value}T00:00:00.000Z`);
	if (
		!/^\d{4}-\d{2}-\d{2}$/.test(dateText.value) ||
		Number.isNaN(date.getTime()) ||
		date.toISOString().slice(0, 10) !== dateText.value
	) {
		return t("ConcreteHeatingLog.errors.dateRequired");
	}
	if (
		!lookups.value?.buildingElements.some(
			(option) => option.id === model.building_element_id,
		)
	) {
		return t("ConcreteHeatingLog.errors.elementRequired");
	}
	if (
		model.section !== null &&
		(!Number.isInteger(model.section) ||
			model.section < 1 ||
			((props.site?.section_cnt ?? 0) > 1 &&
				model.section > (props.site?.section_cnt ?? 0)))
	) {
		return t("ConcreteHeatingLog.errors.sectionInvalid");
	}
	for (const field of fields) {
		if (field.type === "temperature") {
			const value = model[field.key];
			if (
				value !== null &&
				(!Number.isInteger(value) ||
					value < -30 ||
					value > 38)
			)
				return t(
					"ConcreteHeatingLog.errors.temperatureRange",
				);
		} else if (field.type === "number") {
			const value = model[field.key];
			if (
				(field.key === "volume_m3" && value === null) ||
				(value !== null &&
					(!Number.isFinite(value) ||
						(field.min !== undefined &&
							value < field.min)))
			)
				return t(
					"ConcreteHeatingLog.errors.numberInvalid",
				);
		}
	}
	if (
		(measurementText.value === "") !==
		(model.concrete_temperature_c === null)
	)
		return t("ConcreteHeatingLog.errors.measurementPair");
	if (measurementText.value) {
		const timestamp = new Date(measurementText.value);
		if (
			!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(
				measurementText.value,
			) ||
			Number.isNaN(timestamp.getTime()) ||
			localTimestamp(timestamp) !==
				(measurementText.value.length === 16
					? `${measurementText.value}:00`
					: measurementText.value)
		)
			return t(
				"ConcreteHeatingLog.errors.measurementInvalid",
			);
	}
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
	const model: ConcreteHeatingLogNew = {
		...draft.value,
		date: new Date(`${dateText.value}T00:00:00.000Z`),
		measured_at: measurementText.value
			? measurementText.value === initialMeasurementText.value
				? draft.value.measured_at
				: new Date(measurementText.value)
			: null,
		construction_site_id: siteID,
	};
	submitting.value = true;
	emit("submitting-change", true);
	try {
		if (recordID === null) {
			await concreteHeatingLogApi.create(model);
		} else {
			// Keep the original site: edits cannot move a row to another construction site.
			const { construction_site_id: _siteID, ...update } =
				model;
			await concreteHeatingLogApi.update(
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
					? 'ConcreteHeatingLog.dialog.create'
					: 'ConcreteHeatingLog.dialog.edit',
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
							'ConcreteHeatingLog.commands.refresh',
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
						"ConcreteHeatingLog.messages.loadingReferences",
					)
				}}
			</div>
			<fieldset
				:disabled="!ready || submitting"
				class="log-fieldset"
			>
				<legend>
					{{
						t(
							"ConcreteHeatingLog.groups.main",
						)
					}}
				</legend>
				<div class="log-form-grid">
					<div class="log-field log-full-width">
						<span class="log-label">{{
							t(
								"ConcreteHeatingLog.fields.construction_site_id",
							)
						}}</span>
						<div class="log-site-name">
							{{ site?.name }}
						</div>
					</div>
					<div class="log-field">
						<label
							for="concreteHeatingLogEditDate"
							>{{
								t(
									"ConcreteHeatingLog.fields.date",
								)
							}}
							*</label
						>
						<input
							id="concreteHeatingLogEditDate"
							v-model="dateText"
							type="date"
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
							for="concreteHeatingLogEditSection"
							>{{
								t(
									"ConcreteHeatingLog.fields.section",
								)
							}}</label
						>
						<Select
							inputId="concreteHeatingLogEditSection"
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
							`ConcreteHeatingLog.groups.${group}`,
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
									'specimen_curing_conditions',
						}"
					>
						<label
							:for="`concreteHeatingLogEdit-${field.key}`"
							>{{
								t(
									`ConcreteHeatingLog.fields.${field.key}`,
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
							:inputId="`concreteHeatingLogEdit-${field.key}`"
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
							:inputId="`concreteHeatingLogEdit-${field.key}`"
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
							:id="`concreteHeatingLogEdit-${field.key}`"
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
						<input
							v-else-if="
								field.type ===
								'datetime'
							"
							:id="`concreteHeatingLogEdit-${field.key}`"
							v-model="
								measurementText
							"
							type="datetime-local"
							step="1"
							:disabled="
								!ready ||
								submitting
							"
							class="log-date-input"
						/>
						<InputNumber
							v-else
							:inputId="`concreteHeatingLogEdit-${field.key}`"
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
						<small
							v-if="
								field.key ===
								'specimen_strength_mpa'
							"
							>Значение вводится в
							МПа.</small
						>
					</div>
				</div>
			</fieldset>
		</form>
		<template #footer>
			<Button
				:label="t('ConcreteHeatingLog.commands.cancel')"
				severity="secondary"
				text
				:disabled="submitting"
				@click="close"
			/>
			<Button
				:label="t('ConcreteHeatingLog.commands.save')"
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
