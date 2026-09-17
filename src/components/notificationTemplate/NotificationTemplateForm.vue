<script setup lang="ts">
import { useI18n } from "vue-i18n";
import Checkbox from "primevue/checkbox";
import InputText from "primevue/inputtext";

import {
	CollectionForm,
	FormField,
	useCollectionFormModel,
	type FormErrorsView,
} from "@katren/vue-collection-lib";
import {
	createNotificationTemplateFormModel,
	type NotificationTemplateFormModel,
} from "@/forms/notificationTemplate.gen";
import type { NotificationTemplateNew } from "@/types/notificationTemplate.gen";

type FormMode = "create" | "edit" | "copy";

const props = withDefaults(defineProps<{
	model?: Partial<NotificationTemplateFormModel>;
	mode?: FormMode;
	errors?: FormErrorsView;
	submitting?: boolean;
}>(), {
	model: () => ({}),
	mode: "create",
	errors: undefined,
	submitting: false,
});

const emit = defineEmits<{
	submit: [model: NotificationTemplateNew];
	cancel: [];
}>();

const { t } = useI18n();
const { form } = useCollectionFormModel<NotificationTemplateFormModel>({
	model: () => props.model,
	defaults: createNotificationTemplateFormModel,
});

const submit = (): void => {
	const model: NotificationTemplateNew = {
		code: form.value.code?.trim() ?? "",
		event: form.value.event?.trim() ?? "",
		body_template: form.value.body_template?.trim() ?? "",
		is_active: form.value.is_active ?? false,
	};
	emit("submit", model);
};
</script>

<template>
	<CollectionForm
		:errors="props.errors"
		:submitting="props.submitting"
		@submit="submit"
		@cancel="emit('cancel')"
	>
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<FormField
				field="code"
				forId="notificationTemplateCode"
				:label="t('NotificationTemplate.fields.code')"
				:errors="props.errors"
				containerClass=""
				v-slot="{ invalid }"
			>
				<InputText
					id="notificationTemplateCode"
					v-model="form.code"
					:invalid="invalid"
					:disabled="false"
				/>
			</FormField>
			<FormField
				field="event"
				forId="notificationTemplateEvent"
				:label="t('NotificationTemplate.fields.event')"
				:errors="props.errors"
				containerClass=""
				v-slot="{ invalid }"
			>
				<InputText
					id="notificationTemplateEvent"
					v-model="form.event"
					:invalid="invalid"
					:disabled="false"
					required
				/>
			</FormField>
			<FormField
				field="body_template"
				forId="notificationTemplateBodyTemplate"
				:label="t('NotificationTemplate.fields.body_template')"
				:errors="props.errors"
				containerClass=""
				v-slot="{ invalid }"
			>
				<InputText
					id="notificationTemplateBodyTemplate"
					v-model="form.body_template"
					:invalid="invalid"
					:disabled="false"
					required
				/>
			</FormField>
			<FormField
				field="is_active"
				forId="notificationTemplateIsActive"
				:label="t('NotificationTemplate.fields.is_active')"
				:errors="props.errors"
				containerClass=" pt-7"
				v-slot="{ invalid }"
			>
				<div class="flex items-center gap-2">
					<Checkbox
						v-model="form.is_active"
						inputId="notificationTemplateIsActive"
						:invalid="invalid"
						:disabled="false"
						binary
					/>
					<label for="notificationTemplateIsActive">{{ t("NotificationTemplate.fields.is_active") }}</label>
				</div>
			</FormField>
		</div>
	</CollectionForm>
</template>
