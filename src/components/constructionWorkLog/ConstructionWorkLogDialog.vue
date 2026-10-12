<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputNumber from "primevue/inputnumber";
import Select from "primevue/select";

import { errorText } from "@katren/vue-collection-lib";

import { constructionWorkLogApi } from "@/api/constructionWorkLog.gen";
import {
	loadConstructionWorkLogLookups,
	type ConstructionWorkLogLookups,
	type ConstructionWorkLogOption,
} from "@/api/constructionWorkLogLookups";
import { useAuthStore } from "@/stores/useAuthStore";
import type { ConstructionWorkLogNew } from "@/types/constructionWorkLog.gen";
import type { MaterialBalanceConstructionSite } from "@/types/materialBalance";

type SelectField = Exclude<
	keyof ConstructionWorkLogNew,
	| "date"
	| "construction_site_id"
	| "section"
	| "readiness"
	| "quantity"
	| "time_quantity"
>;
type NumberField = "quantity" | "time_quantity";
type FieldGroup = "work" | "location" | "downtime";
type EditorField =
	| { key: "readiness"; type: "readiness"; group: FieldGroup }
	| {
			key: SelectField;
			type: "select";
			lookup: keyof ConstructionWorkLogLookups;
			group: FieldGroup;
			required?: boolean;
	  }
	| {
			key: NumberField;
			type: "number";
			group: FieldGroup;
			max?: number;
			decimals: number;
	  };

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
		key: "work_id",
		type: "select",
		lookup: "works",
		group: "work",
		required: true,
	},
	{
		key: "readiness",
		type: "readiness",
		group: "work",
	},
	{
		key: "concrete_type_id",
		type: "select",
		lookup: "concreteTypes",
		group: "work",
	},
	{ key: "quantity", type: "number", group: "work", decimals: 4 },
	{
		key: "measure_unit_id",
		type: "select",
		lookup: "measureUnits",
		group: "work",
	},
	{
		key: "letter_axis_from_id",
		type: "select",
		lookup: "letterAxes",
		group: "location",
	},
	{
		key: "letter_axis_to_id",
		type: "select",
		lookup: "letterAxes",
		group: "location",
	},
	{
		key: "number_axis_from_id",
		type: "select",
		lookup: "numberAxes",
		group: "location",
	},
	{
		key: "number_axis_to_id",
		type: "select",
		lookup: "numberAxes",
		group: "location",
	},
	{
		key: "elevation_id",
		type: "select",
		lookup: "elevations",
		group: "location",
	},
	{
		key: "downtime_reason_id",
		type: "select",
		lookup: "downtimeReasons",
		group: "downtime",
	},
	{
		key: "time_quantity",
		type: "number",
		group: "downtime",
		decimals: 4,
	},
	{
		key: "time_measure_unit_id",
		type: "select",
		lookup: "measureUnits",
		group: "downtime",
	},
];
const readinessOptions = Array.from({ length: 10 }, (_, index) => ({
	id: (index + 1) * 10,
	label: `${(index + 1) * 10}%`,
}));
const groups: FieldGroup[] = ["work", "location", "downtime"];
const emptyDraft = (): ConstructionWorkLogNew => ({
	date: new Date(),
	construction_site_id: props.site?.id ?? 0,
	section:
		props.initialSection ??
		((props.site?.section_cnt ?? 0) > 1 ? 1 : null),
	work_id: 0,
	readiness: null,
	concrete_type_id: null,
	quantity: null,
	measure_unit_id: null,
	letter_axis_from_id: null,
	letter_axis_to_id: null,
	number_axis_from_id: null,
	number_axis_to_id: null,
	elevation_id: null,
	downtime_reason_id: null,
	time_quantity: null,
	time_measure_unit_id: null,
});
const draft = ref<ConstructionWorkLogNew>(emptyDraft());
const dateText = ref("");
const lookups = ref<ConstructionWorkLogLookups | null>(null);
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
): ConstructionWorkLogOption[] => {
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
	draft.value = emptyDraft();
	dateText.value = props.initialDate;
	if (siteID === null || !editableRole.value) {
		loading.value = false;
		return;
	}
	loading.value = true;
	try {
		const [references, record] = await Promise.all([
			loadConstructionWorkLogLookups(),
			recordID === null
				? Promise.resolve(null)
				: constructionWorkLogApi.detail({
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
				t("ConstructionWorkLog.errors.siteChanged"),
			);
		}
		lookups.value = references;
		if (record !== null) {
			const { id: _id, ...model } = record;
			draft.value = model;
			dateText.value = record.date.toISOString().slice(0, 10);
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
		return t("ConstructionWorkLog.errors.dateRequired");
	}
	if (
		!model.work_id ||
		!lookups.value?.works.some(
			(option) => option.id === model.work_id,
		)
	) {
		return t("ConstructionWorkLog.errors.workRequired");
	}
	if (
		model.section !== null &&
		(!Number.isInteger(model.section) ||
			model.section < 1 ||
			((props.site?.section_cnt ?? 0) > 1 &&
				model.section > (props.site?.section_cnt ?? 0)))
	) {
		return t("ConstructionWorkLog.errors.sectionInvalid");
	}
	if (
		model.readiness !== null &&
		(!Number.isInteger(model.readiness) ||
			model.readiness < 10 ||
			model.readiness > 100 ||
			model.readiness % 10 !== 0)
	) {
		return t("ConstructionWorkLog.errors.readinessRange");
	}
	if (
		model.quantity !== null &&
		(!Number.isFinite(model.quantity) || model.quantity < 0)
	) {
		return t("ConstructionWorkLog.errors.quantityInvalid");
	}
	if (
		model.time_quantity !== null &&
		(!Number.isFinite(model.time_quantity) ||
			model.time_quantity < 0)
	) {
		return t("ConstructionWorkLog.errors.timeQuantityInvalid");
	}
	if ((model.quantity === null) !== (model.measure_unit_id === null)) {
		return t("ConstructionWorkLog.errors.quantityPair");
	}
	if (
		(model.time_quantity === null) !==
		(model.time_measure_unit_id === null)
	) {
		return t("ConstructionWorkLog.errors.timePair");
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
	const model: ConstructionWorkLogNew = {
		...draft.value,
		date: new Date(`${dateText.value}T00:00:00.000Z`),
		construction_site_id: siteID,
	};
	submitting.value = true;
	emit("submitting-change", true);
	try {
		if (recordID === null) {
			await constructionWorkLogApi.create(model);
		} else {
			// Keep the original site: edits cannot move a row to another construction site.
			const { construction_site_id: _siteID, ...update } =
				model;
			await constructionWorkLogApi.update(
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
					? 'ConstructionWorkLog.dialog.create'
					: 'ConstructionWorkLog.dialog.edit',
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
							'ConstructionWorkLog.commands.refresh',
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
						"ConstructionWorkLog.messages.loadingReferences",
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
							"ConstructionWorkLog.groups.main",
						)
					}}
				</legend>
				<div class="log-form-grid">
					<div class="log-field log-full-width">
						<span class="log-label">{{
							t(
								"ConstructionWorkLog.fields.construction_site_id",
							)
						}}</span>
						<div class="log-site-name">
							{{ site?.name }}
						</div>
					</div>
					<div class="log-field">
						<label
							for="constructionLogEditDate"
							>{{
								t(
									"ConstructionWorkLog.fields.date",
								)
							}}
							*</label
						>
						<input
							id="constructionLogEditDate"
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
							for="constructionLogEditSection"
							>{{
								t(
									"ConstructionWorkLog.fields.section",
								)
							}}</label
						>
						<Select
							inputId="constructionLogEditSection"
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
							`ConstructionWorkLog.groups.${group}`,
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
									'work_id' ||
								field.key ===
									'downtime_reason_id',
						}"
					>
						<label
							:for="`constructionLogEdit-${field.key}`"
							>{{
								t(
									`ConstructionWorkLog.fields.${field.key}`,
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
							:inputId="`constructionLogEdit-${field.key}`"
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
						<Select
							v-else-if="
								field.type ===
								'readiness'
							"
							:inputId="`constructionLogEdit-${field.key}`"
							v-model="
								draft.readiness
							"
							:options="
								readinessOptions
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
						<InputNumber
							v-else
							:inputId="`constructionLogEdit-${field.key}`"
							v-model="
								draft[field.key]
							"
							:disabled="
								!ready ||
								submitting
							"
							:min="0"
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
				:label="
					t('ConstructionWorkLog.commands.cancel')
				"
				severity="secondary"
				text
				:disabled="submitting"
				@click="close"
			/>
			<Button
				:label="t('ConstructionWorkLog.commands.save')"
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
