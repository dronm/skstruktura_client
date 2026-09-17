<script setup lang="ts">
import { FormActions } from "@katren/vue-collection-lib";

const props = withDefaults(
	defineProps<{
		submitting?: boolean;
	}>(),
	{
		submitting: false,
	},
);

const emit = defineEmits<{
	cancel: [];
}>();
</script>

<template>
	<FormActions
		:submitting="props.submitting"
		saveLabel="Ok"
		@cancel="emit('cancel')"
	/>
</template>
