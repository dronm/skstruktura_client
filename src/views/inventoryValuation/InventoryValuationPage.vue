<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";

import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import ToggleSwitch from "primevue/toggleswitch";

import { errorText } from "@katren/vue-collection-lib";

import { inventoryValuationApi } from "@/api/inventoryValuation";
import type { InventoryValuationState } from "@/types/inventoryValuation";

const { t } = useI18n();

const state = ref<InventoryValuationState | null>(null);
const loading = ref(false);
const actionLoading = ref(false);
const error = ref("");
const closeDate = ref<Date | null>(null);
const allowNegative = ref(true);
const excludeVAT = ref(true);

const canManage = computed(() => state.value?.can_manage === true);
const hasClosedPeriod = computed(
	() => state.value?.settings.closed_through !== null,
);

const numberFormatter = new Intl.NumberFormat("ru-RU", {
	minimumFractionDigits: 2,
	maximumFractionDigits: 4,
});

const formatAmount = (value: number | null): string => {
	if (value === null) {
		return t("InventoryValuation.pending");
	}
	return numberFormatter.format(value);
};

const formatDate = (value: Date | null): string => {
	return value?.toLocaleDateString("ru-RU") ?? "—";
};

const formatDateTime = (value: Date | null): string => {
	return value?.toLocaleString("ru-RU") ?? "—";
};

const applyState = (value: InventoryValuationState): void => {
	state.value = value;
	allowNegative.value = value.settings.allow_negative_open_period;
	excludeVAT.value = value.settings.exclude_vat_from_cost;
};

const load = async (): Promise<void> => {
	loading.value = true;
	error.value = "";
	try {
		applyState(await inventoryValuationApi.state());
	} catch (err: unknown) {
		error.value = errorText(err);
	} finally {
		loading.value = false;
	}
};

const saveSettings = async (): Promise<void> => {
	if (!canManage.value || state.value === null) {
		return;
	}

	actionLoading.value = true;
	error.value = "";
	try {
		const input: {
			allow_negative_open_period: boolean;
			exclude_vat_from_cost?: boolean;
		} = {
			allow_negative_open_period: allowNegative.value,
		};
		if (state.value.settings.vat_basis_editable) {
			input.exclude_vat_from_cost = excludeVAT.value;
		}
		applyState(await inventoryValuationApi.updateSettings(input));
	} catch (err: unknown) {
		error.value = errorText(err);
	} finally {
		actionLoading.value = false;
	}
};

const recalculate = async (): Promise<void> => {
	if (!canManage.value) {
		return;
	}
	actionLoading.value = true;
	error.value = "";
	try {
		applyState(await inventoryValuationApi.recalculate());
	} catch (err: unknown) {
		error.value = errorText(err);
	} finally {
		actionLoading.value = false;
	}
};

const closePeriod = async (): Promise<void> => {
	if (!canManage.value || closeDate.value === null) {
		return;
	}
	if (!window.confirm(t("InventoryValuation.confirmClose"))) {
		return;
	}
	actionLoading.value = true;
	error.value = "";
	try {
		applyState(await inventoryValuationApi.close(closeDate.value));
		closeDate.value = null;
	} catch (err: unknown) {
		error.value = errorText(err);
	} finally {
		actionLoading.value = false;
	}
};

const reopenPeriod = async (): Promise<void> => {
	if (!canManage.value || !hasClosedPeriod.value) {
		return;
	}
	if (!window.confirm(t("InventoryValuation.confirmReopen"))) {
		return;
	}
	actionLoading.value = true;
	error.value = "";
	try {
		applyState(await inventoryValuationApi.reopen());
	} catch (err: unknown) {
		error.value = errorText(err);
	} finally {
		actionLoading.value = false;
	}
};

onMounted(() => {
	void load();
});
</script>

<template>
	<div class="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 md:p-6">
		<div class="flex flex-wrap items-center justify-between gap-3">
			<div>
				<h1 class="text-2xl font-semibold">
					{{ t("InventoryValuation.title") }}
				</h1>
				<p class="mt-1 text-sm text-gray-500">
					{{ t("InventoryValuation.description") }}
				</p>
			</div>
			<Button
				:label="t('InventoryValuation.refresh')"
				icon="pi pi-refresh"
				severity="secondary"
				:loading="loading"
				@click="load"
			/>
		</div>

		<div
			v-if="error"
			class="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
		>
			{{ error }}
		</div>

		<div v-if="state" class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
			<div class="rounded border border-gray-200 bg-white p-4 shadow-sm">
				<div class="text-sm text-gray-500">
					{{ t("InventoryValuation.currentAmount") }}
				</div>
				<div class="mt-2 text-2xl font-semibold">
					{{ formatAmount(state.current_amount) }}
				</div>
			</div>
			<div class="rounded border border-gray-200 bg-white p-4 shadow-sm">
				<div class="text-sm text-gray-500">
					{{ t("InventoryValuation.pendingCount") }}
				</div>
				<div class="mt-2 text-2xl font-semibold">
					{{ state.pending_count }}
				</div>
			</div>
			<div class="rounded border border-gray-200 bg-white p-4 shadow-sm">
				<div class="text-sm text-gray-500">
					{{ t("InventoryValuation.negativeCount") }}
				</div>
				<div class="mt-2 text-2xl font-semibold">
					{{ state.negative_count }}
				</div>
			</div>
			<div class="rounded border border-gray-200 bg-white p-4 shadow-sm">
				<div class="text-sm text-gray-500">
					{{ t("InventoryValuation.closedThrough") }}
				</div>
				<div class="mt-2 text-2xl font-semibold">
					{{ formatDate(state.settings.closed_through) }}
				</div>
			</div>
		</div>

		<section
			v-if="state"
			class="rounded border border-gray-200 bg-white p-4 shadow-sm"
		>
			<h2 class="text-lg font-semibold">
				{{ t("InventoryValuation.settings.title") }}
			</h2>
			<div class="mt-4 grid gap-4 md:grid-cols-2">
				<label class="flex items-center justify-between gap-4 rounded border border-gray-200 p-3">
					<span>
						<span class="block font-medium">{{ t("InventoryValuation.settings.allowNegative") }}</span>
						<span class="block text-sm text-gray-500">{{ t("InventoryValuation.settings.allowNegativeHelp") }}</span>
					</span>
					<ToggleSwitch v-model="allowNegative" :disabled="!canManage" />
				</label>
				<label class="flex items-center justify-between gap-4 rounded border border-gray-200 p-3">
					<span>
						<span class="block font-medium">{{ t("InventoryValuation.settings.excludeVAT") }}</span>
						<span class="block text-sm text-gray-500">{{ t("InventoryValuation.settings.excludeVATHelp") }}</span>
					</span>
					<ToggleSwitch
						v-model="excludeVAT"
						:disabled="!canManage || !state.settings.vat_basis_editable"
					/>
				</label>
			</div>
			<div v-if="canManage" class="mt-4 flex flex-wrap gap-2">
				<Button
					:label="t('InventoryValuation.settings.save')"
					icon="pi pi-save"
					:loading="actionLoading"
					@click="saveSettings"
				/>
				<Button
					:label="t('InventoryValuation.recalculate')"
					icon="pi pi-sync"
					severity="secondary"
					:loading="actionLoading"
					@click="recalculate"
				/>
			</div>
		</section>

		<section
			v-if="state && canManage"
			class="rounded border border-gray-200 bg-white p-4 shadow-sm"
		>
			<h2 class="text-lg font-semibold">
				{{ t("InventoryValuation.closing.title") }}
			</h2>
			<div class="mt-4 flex flex-wrap items-end gap-3">
				<div class="flex min-w-64 flex-col gap-1">
					<label class="text-sm font-medium">{{ t("InventoryValuation.closing.date") }}</label>
					<DatePicker
						v-model="closeDate"
						dateFormat="dd.mm.yy"
						showIcon
					/>
				</div>
				<Button
					:label="t('InventoryValuation.closing.close')"
					icon="pi pi-lock"
					:disabled="closeDate === null"
					:loading="actionLoading"
					@click="closePeriod"
				/>
				<Button
					:label="t('InventoryValuation.closing.reopen')"
					icon="pi pi-lock-open"
					severity="warn"
					:disabled="!hasClosedPeriod"
					:loading="actionLoading"
					@click="reopenPeriod"
				/>
			</div>
			<p class="mt-3 text-sm text-gray-500">
				{{ t("InventoryValuation.closing.help") }}
			</p>
		</section>

		<section
			v-if="state"
			class="rounded border border-gray-200 bg-white p-4 shadow-sm"
		>
			<h2 class="text-lg font-semibold">
				{{ t("InventoryValuation.history.title") }}
			</h2>
			<div class="mt-4 overflow-x-auto">
				<table class="w-full border-collapse text-sm">
					<thead>
						<tr class="bg-gray-100">
							<th class="border border-gray-300 px-2 py-2 text-left">{{ t("InventoryValuation.history.closedThrough") }}</th>
							<th class="border border-gray-300 px-2 py-2 text-left">{{ t("InventoryValuation.history.closedAt") }}</th>
							<th class="border border-gray-300 px-2 py-2 text-left">{{ t("InventoryValuation.history.reopenedAt") }}</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="item in state.closures" :key="item.id">
							<td class="border border-gray-300 px-2 py-2">{{ formatDate(item.closed_through) }}</td>
							<td class="border border-gray-300 px-2 py-2">{{ formatDateTime(item.closed_at) }}</td>
							<td class="border border-gray-300 px-2 py-2">{{ formatDateTime(item.reopened_at) }}</td>
						</tr>
						<tr v-if="state.closures.length === 0">
							<td colspan="3" class="border border-gray-300 px-2 py-6 text-center text-gray-500">
								{{ t("InventoryValuation.history.empty") }}
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</section>
	</div>
</template>
