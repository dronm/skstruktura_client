<script setup lang="ts">
import * as v from "valibot";
import { useI18n } from "vue-i18n";

import {
	CollectionEditPage,
	useCollectionEditPage,
} from "@katren/vue-collection-lib";
import { contactApi } from "@/api/contact";
import ContactForm from "@/components/contact/ContactForm.vue";
import { useContactSchemas } from "@/composables/schemas/useContactSchemas.gen";
import {
	createContactFormModel,
	contactFormMutationFields,
	type ContactFormModel,
} from "@/forms/contact.gen";
import type { ContactCreatePayload } from "@/types/contact";
import type {
	Contact,
	ContactKey,
	ContactUpd,
} from "@/types/contact.gen";

const { t } = useI18n();
const schemas = useContactSchemas();
const createSchema = v.partial(
	schemas.ContactNewSchema,
	["email", "employee_post_id"],
);
const edit = useCollectionEditPage<
	ContactFormModel,
	ContactKey,
	ContactCreatePayload,
	ContactUpd,
	Contact
>({
	api: contactApi,
	createRouteName: "contactCreate",
	listRoute: { name: "contacts" },
	keyFromRoute: (route) => ({
		id: Number(route.params.id ?? 0),
	}),
	copyKeyFromRoute: (route) => route.query.copy_id
		? ({
			id: Number(route.query.copy_id ?? 0),
		})
		: null,
	createModel: createContactFormModel,
	copyModel: (detail) => ({
		...detail,
		id: undefined,
		name: `${detail.name} - ${t("Grid.copySuffix")}`,
	}),
	fields: contactFormMutationFields,
	createSchema,
	updateSchema: schemas.ContactUpdSchema,
	success: { mode: "back" },
});

const submit = async (model: ContactCreatePayload): Promise<void> => {
	await edit.submit(model);
};
</script>

<template>
	<CollectionEditPage
		:title="t(`Contact.form.${edit.mode.value}`)"
		:loading="edit.loading.value"
		@back="edit.goBack"
	>
		<ContactForm
			:model="edit.model.value"
			:mode="edit.mode.value"
			:errors="edit.errors"
			:submitting="edit.submitting.value"
			@submit="submit"
			@cancel="edit.goBack"
		/>
	</CollectionEditPage>
</template>
