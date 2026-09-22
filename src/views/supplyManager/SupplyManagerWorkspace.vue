<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { onBeforeRouteLeave } from "vue-router";

import SupplyManagerAssignmentHistory from "@/components/supplyManager/SupplyManagerAssignmentHistory.vue";
import SupplyManagerIncomingRequests from "@/components/supplyManager/SupplyManagerIncomingRequests.vue";
import { useSupplyManagerDraftGuard } from "@/composables/useSupplyManagerDraftGuard";

type WorkspaceTab = "incoming" | "history";

const { t } = useI18n();
const activeTab = ref<WorkspaceTab>("incoming");
const historyVisited = ref(false);
const historyRevision = ref(0);
const constructionSiteID = ref<number | null>(null);
const draftActive = ref(false);
const { active: guardedDraftActive } = useSupplyManagerDraftGuard();

const selectTab = (tab: WorkspaceTab): void => {
	activeTab.value = tab;
	if (tab === "history") {
		historyVisited.value = true;
	}
};

const assignmentSubmitted = (): void => {
	historyRevision.value += 1;
};

const beforeUnload = (event: BeforeUnloadEvent): void => {
	if (!guardedDraftActive.value) {
		return;
	}
	event.preventDefault();
	event.returnValue = "";
};

watch(
	draftActive,
	(active) => {
		guardedDraftActive.value = active;
	},
	{ immediate: true },
);

onBeforeRouteLeave(() => {
	if (!guardedDraftActive.value) {
		return true;
	}
	if (
		!window.confirm(
			t("SupplyManagerWorkspace.assignment.leaveWarning"),
		)
	) {
		return false;
	}
	guardedDraftActive.value = false;
	return true;
});

onMounted(() => {
	window.addEventListener("beforeunload", beforeUnload);
});

onBeforeUnmount(() => {
	window.removeEventListener("beforeunload", beforeUnload);
	guardedDraftActive.value = false;
});
</script>

<template>
	<div class="mx-auto w-full max-w-[1600px] space-y-4">
		<nav
			class="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-2 shadow-sm"
			role="tablist"
			:aria-label="t('SupplyManagerWorkspace.title')"
		>
			<button
				type="button"
				role="tab"
				class="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
				:class="
					activeTab === 'incoming'
						? 'bg-cyan-700 text-white'
						: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
				"
				:aria-selected="activeTab === 'incoming'"
				@click="selectTab('incoming')"
			>
				<i
					class="pi pi-inbox mr-2"
					aria-hidden="true"
				/>
				{{ t("SupplyManagerWorkspace.tabs.incoming") }}
			</button>
			<button
				type="button"
				role="tab"
				class="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
				:class="
					activeTab === 'history'
						? 'bg-cyan-700 text-white'
						: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
				"
				:aria-selected="activeTab === 'history'"
				@click="selectTab('history')"
			>
				<i
					class="pi pi-history mr-2"
					aria-hidden="true"
				/>
				{{ t("SupplyManagerWorkspace.tabs.history") }}
			</button>
		</nav>

		<SupplyManagerIncomingRequests
			v-show="activeTab === 'incoming'"
			v-model:constructionSiteID="constructionSiteID"
			@submitted="assignmentSubmitted"
			@draft-change="draftActive = $event"
		/>
		<SupplyManagerAssignmentHistory
			v-if="historyVisited"
			v-show="activeTab === 'history'"
			:revision="historyRevision"
			:siteFilterDisabled="draftActive"
			v-model:constructionSiteID="constructionSiteID"
		/>
	</div>
</template>
