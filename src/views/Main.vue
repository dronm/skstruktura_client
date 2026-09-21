<script setup lang="ts">
import { onMounted } from "vue";
import { useRouter } from "vue-router";

import { getDefaultRouteForRole } from "@/router/defaultRoute";
import { useAuthStore } from "@/stores/useAuthStore";

const authStore = useAuthStore();
const router = useRouter();

onMounted(async (): Promise<void> => {
	if (authStore.isAuthenticated()) {
		await router.replace(
			getDefaultRouteForRole(authStore.user?.role_id),
		);
	}
});
</script>

<template>
	<div />
</template>
