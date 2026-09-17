<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useConfirm } from "primevue/useconfirm";

import Button from "primevue/button";
import Checkbox from "primevue/checkbox";
import DatePicker from "primevue/datepicker";
import Dialog from "primevue/dialog";
import Message from "primevue/message";
import Tag from "primevue/tag";
import ToggleSwitch from "primevue/toggleswitch";

import {
	getDiadocState,
	replayDiadocEvents,
	updateDiadocState,
} from "@/api/diadoc";
import type { DiadocState } from "@/types/diadoc";

const visible = defineModel<boolean>("visible", { required: true });

const emit = defineEmits<{
	changed: [];
}>();

const confirm = useConfirm();
const state = ref<DiadocState | null>(null);
const loading = ref(false);
const saving = ref(false);
const error = ref("");
const enabled = ref(false);
const replayFrom = ref<Date | null>(null);
const restoreIgnored = ref(false);
const retryFailed = ref(true);

const formatDateTime = (value: Date | null): string => {
	return value?.toLocaleString("ru-RU") ?? "—";
};

const stateCounts = computed(() => {
	return Object.entries(state.value?.buffer_counts ?? {}).sort(
		([left], [right]) => left.localeCompare(right),
	);
});

const load = async (): Promise<void> => {
	loading.value = true;
	error.value = "";
	try {
		state.value = await getDiadocState();
		enabled.value = state.value.enabled;
		replayFrom.value = new Date(state.value.event_timestamp_from);
	} catch (caught: unknown) {
		error.value =
			caught instanceof Error
				? caught.message
				: String(caught);
	} finally {
		loading.value = false;
	}
};

const saveEnabled = async (): Promise<void> => {
	if (!state.value) {
		return;
	}

	saving.value = true;
	error.value = "";
	try {
		state.value = await updateDiadocState(
			state.value.version,
			enabled.value,
		);
		enabled.value = state.value.enabled;
		emit("changed");
	} catch (caught: unknown) {
		error.value =
			caught instanceof Error
				? caught.message
				: String(caught);
	} finally {
		saving.value = false;
	}
};

const executeReplay = async (): Promise<void> => {
	if (!state.value || !replayFrom.value) {
		return;
	}

	saving.value = true;
	error.value = "";
	try {
		state.value = await replayDiadocEvents(
			state.value.version,
			replayFrom.value,
			restoreIgnored.value,
			retryFailed.value,
		);
		enabled.value = state.value.enabled;
		replayFrom.value = new Date(state.value.event_timestamp_from);
		emit("changed");
	} catch (caught: unknown) {
		error.value =
			caught instanceof Error
				? caught.message
				: String(caught);
	} finally {
		saving.value = false;
	}
};

const requestReplay = (): void => {
	confirm.require({
		header: "Повторная загрузка документов",
		message: "Позиция чтения Диадока будет сброшена. Уже импортированные документы не будут импортированы повторно.",
		icon: "pi pi-exclamation-triangle",
		acceptLabel: "Продолжить",
		rejectLabel: "Отмена",
		accept: () => {
			void executeReplay();
		},
	});
};

watch(
	() => visible.value,
	(isVisible) => {
		if (isVisible) {
			void load();
		}
	},
);
</script>

<template>
	<Dialog
		v-model:visible="visible"
		modal
		header="Настройки интеграции с Диадоком"
		:style="{ width: 'min(52rem, 96vw)' }"
	>
		<div v-if="loading" class="flex justify-center py-12">
			<i
				class="pi pi-spin pi-spinner text-3xl text-sky-600"
			/>
		</div>
		<div v-else-if="state" class="space-y-6">
			<Message
				v-if="error"
				severity="error"
				:closable="false"
			>
				{{ error }}
			</Message>

			<div
				class="grid grid-cols-1 gap-3 rounded-xl bg-slate-50 p-4 md:grid-cols-2"
			>
				<div>
					<div
						class="text-xs uppercase tracking-wide text-slate-500"
					>
						Состояние
					</div>
					<div class="mt-1 flex gap-2">
						<Tag
							:value="
								state.configured
									? 'Настроено'
									: 'Не настроено'
							"
							:severity="
								state.configured
									? 'success'
									: 'danger'
							"
						/>
						<Tag
							:value="
								state.authorized
									? 'Авторизовано'
									: 'Не авторизовано'
							"
							:severity="
								state.authorized
									? 'success'
									: 'warn'
							"
						/>
					</div>
				</div>
				<div>
					<div
						class="text-xs uppercase tracking-wide text-slate-500"
					>
						Box ID
					</div>
					<div
						class="mt-1 break-all font-mono text-sm"
					>
						{{ state.box_id || "—" }}
					</div>
				</div>
				<div>
					<div
						class="text-xs uppercase tracking-wide text-slate-500"
					>
						Последняя синхронизация
					</div>
					<div class="mt-1 text-sm">
						{{
							formatDateTime(
								state.last_sync_finished_at,
							)
						}}
					</div>
				</div>
				<div>
					<div
						class="text-xs uppercase tracking-wide text-slate-500"
					>
						Курсор событий
					</div>
					<div class="mt-1 text-sm">
						{{
							state.has_cursor
								? "Установлен"
								: "Не установлен"
						}}
					</div>
				</div>
			</div>

			<Message
				v-if="state.last_sync_error"
				severity="warn"
				:closable="false"
			>
				{{ state.last_sync_error }}
			</Message>

			<div
				class="flex items-center justify-between rounded-xl border border-slate-200 p-4"
			>
				<div>
					<div class="font-semibold">
						Автоматическая синхронизация
					</div>
					<div class="text-sm text-slate-500">
						Приостановка не удаляет
						авторизацию и документы.
					</div>
				</div>
				<div class="flex items-center gap-3">
					<ToggleSwitch v-model="enabled" />
					<Button
						label="Сохранить"
						icon="pi pi-save"
						:loading="saving"
						:disabled="
							enabled ===
							state.enabled
						"
						@click="saveEnabled"
					/>
				</div>
			</div>

			<div
				class="space-y-4 rounded-xl border border-amber-200 bg-amber-50/60 p-4"
			>
				<div>
					<div
						class="font-semibold text-amber-950"
					>
						Загрузить события повторно
					</div>
					<div class="text-sm text-amber-800">
						Существующие сопоставления и
						импортированные поступления
						сохраняются.
					</div>
				</div>
				<div
					class="grid grid-cols-1 gap-4 md:grid-cols-2"
				>
					<label class="space-y-1">
						<span
							class="text-sm font-medium"
							>Начиная с даты</span
						>
						<DatePicker
							v-model="replayFrom"
							showTime
							showSeconds
							fluid
						/>
					</label>
					<div class="space-y-3 pt-1 md:pt-6">
						<label
							class="flex items-center gap-2 text-sm"
						>
							<Checkbox
								v-model="
									retryFailed
								"
								binary
							/>
							Повторить документы с
							ошибками
						</label>
						<label
							class="flex items-center gap-2 text-sm"
						>
							<Checkbox
								v-model="
									restoreIgnored
								"
								binary
							/>
							Вернуть исключённые
							документы в буфер
						</label>
					</div>
				</div>
				<div class="flex justify-end">
					<Button
						label="Сбросить позицию и загрузить"
						icon="pi pi-history"
						severity="warn"
						:loading="saving"
						:disabled="!replayFrom"
						@click="requestReplay"
					/>
				</div>
			</div>

			<div
				v-if="stateCounts.length"
				class="flex flex-wrap gap-2"
			>
				<Tag
					v-for="entry in stateCounts"
					:key="entry[0]"
					:value="`${entry[0]}: ${entry[1]}`"
					severity="secondary"
				/>
			</div>
		</div>
		<Message v-else-if="error" severity="error" :closable="false">
			{{ error }}
		</Message>
	</Dialog>
</template>
