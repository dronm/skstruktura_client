<script setup lang="ts">
import { onMounted } from "vue";
import { useRouter } from "vue-router";

import { useAuthStore } from "@/stores/useAuthStore";

const authStore = useAuthStore();
const router = useRouter();

onMounted(async (): Promise<void> => {
	if (authStore.isAuthenticated()) {
		await router.replace({
			name:
				authStore.user?.role_id === "admin"
					? "users"
					: "userProfile",
		});
	}
});
</script>

<template>
	<div />
</template>
