<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";

import Button from "primevue/button";
import Dialog from "primevue/dialog";
import Message from "primevue/message";

import {
	CollectionGrid,
	FilterOperatorParam,
	ReferenceKeyInput,
	useChildCollection,
	type CollectionGridApi,
	type CollectionParams,
	type GridColumn,
	type GridCommand,
} from "@katren/vue-collection-lib";

import { contactApi } from "@/api/contact";
import { entityContactApi } from "@/api/entityContact.gen";
import ContactForm from "@/components/contact/ContactForm.vue";
import {
	createContactFormModel,
	type ContactFormModel,
} from "@/forms/contact.gen";
import { contactReference } from "@/references/contactReferences";
import type { ContactCreatePayload } from "@/types/contact";
import type {
	EntityContactKey,
	EntityContactNew,
	EntityContactUpd,
} from "@/types/entityContact.gen";
import type { EntityContactList } from "@/types/entityContactList.gen";

const USER_ENTITY_TYPE = "users";

const props = defineProps<{
	userId: number;
}>();

const { t } = useI18n();

const contactDialogVisible = ref(false);
const contactSubmitting = ref(false);
const contactError = ref("");
const contactModel = ref<Partial<ContactFormModel>>(createContactFormModel());
const contactTargetRow = ref<EntityContactList | null>(null);

const numberValue = (value: unknown): number => {
	return typeof value === "number" && Number.isFinite(value) ? value : 0;
};

const contactDescr = (row: EntityContactList): string => {
	const descr = row.contact?.descr;
	return typeof descr === "string" && descr.trim()
		? descr
		: row.contact_id > 0
			? `#${row.contact_id}`
			: "";
};

const userEntityContactApi: CollectionGridApi<
	EntityContactList,
	EntityContactKey,
	EntityContactNew,
	EntityContactUpd
> = {
	list: async (params: CollectionParams = {}) => {
		return await entityContactApi.list({
			...params,
			filter: [
				...(params.filter ?? []),
				{
					f: {
						entity_type: {
							o: FilterOperatorParam.E,
							v: USER_ENTITY_TYPE,
						},
					},
				},
			],
		});
	},
	create: entityContactApi.create,
	update: entityContactApi.update,
	delete: entityContactApi.delete,
};

const entityContacts = useChildCollection<
	EntityContactList,
	EntityContactKey,
	EntityContactNew,
	EntityContactUpd,
	number
>({
	api: userEntityContactApi,
	parent: {
		field: "entity_id",
		value: () => props.userId,
	},
	temporaryKeyField: "id",
	getKey: (row) => ({
		id: row.id,
	}),
	createDefaults: () => ({
		entity_type: USER_ENTITY_TYPE,
		contact_id: 0,
		contact: {},
		contact_attrs: {},
		is_active: true,
	}),
	createModel: (row) => ({
		entity_type: USER_ENTITY_TYPE,
		entity_id: props.userId,
		contact_id: row.contact_id,
		is_active: row.is_active,
	}),
});

const columns: GridColumn<EntityContactList>[] = [
	{
		field: "contact_id",
		referenceField: "contact",
		headerKey: "EntityContact.fields.contact_id",
		editable: true,
		dataType: "reference",
		normalizeValue: numberValue,
		reference: contactReference,
		searchable: false,
		width: "48rem",
		format: (_value, row) => contactDescr(row),
		editorProps: {
			required: true,
		},
	},
];

const commands: GridCommand<EntityContactList, EntityContactKey>[] = [
	{ name: "create" },
	{ name: "edit" },
	{ name: "delete" },
	{ name: "refresh" },
];

const setContactID = (
	row: EntityContactList,
	value: unknown,
): void => {
	row.contact_id = numberValue(value);
};

const openContactDialog = (row: EntityContactList): void => {
	contactTargetRow.value = row;
	contactModel.value = createContactFormModel();
	contactError.value = "";
	contactDialogVisible.value = true;
};

const closeContactDialog = (): void => {
	if (contactSubmitting.value) {
		return;
	}

	contactDialogVisible.value = false;
	contactTargetRow.value = null;
};

const createContact = async (model: ContactCreatePayload): Promise<void> => {
	contactSubmitting.value = true;
	contactError.value = "";

	try {
		const key = await contactApi.create(model);
		if (contactTargetRow.value) {
			contactTargetRow.value.contact_id = key.id;
		}
		contactDialogVisible.value = false;
		contactTargetRow.value = null;
	} catch (caught: unknown) {
		contactError.value = caught instanceof Error
			? caught.message
			: String(caught);
	} finally {
		contactSubmitting.value = false;
	}
};
</script>

<template>
	<div class="space-y-2">
		<h3 class="text-lg font-semibold">
			{{ t("EntityContact.title") }}
		</h3>

		<CollectionGrid
			:api="entityContacts.api"
			:columns="columns"
			:commands="commands"
			dataKey="id"
			:getKey="entityContacts.getKey"
			:createRow="entityContacts.createRow"
			:createModel="entityContacts.createModel"
			editMode="inline"
			:defaultSorter="entityContacts.defaultSorter"
			:stateKey="`userEntityContacts-${props.userId}`"
			:pageSize="100"
			:showCommandShortcuts="false"
		>
			<template #editor-contact_id="{ data }">
				<div class="flex w-full items-center gap-2">
					<ReferenceKeyInput
						:modelValue="data.contact_id"
						:reference="contactReference"
						required
						class="min-w-0 flex-1"
						@update:modelValue="setContactID(data, $event)"
					/>
					<Button
						icon="pi pi-plus"
						severity="secondary"
						outlined
						:aria-label="t('EntityContact.commands.createContact')"
						:title="t('EntityContact.commands.createContact')"
						@click.stop="openContactDialog(data)"
					/>
				</div>
			</template>
		</CollectionGrid>

		<Dialog
			v-model:visible="contactDialogVisible"
			modal
			:header="t('Contact.form.create')"
			:style="{ width: 'min(52rem, 96vw)' }"
			@hide="contactTargetRow = null"
		>
			<Message
				v-if="contactError"
				severity="error"
				:closable="false"
				class="mb-4"
			>
				{{ contactError }}
			</Message>
			<ContactForm
				v-if="contactDialogVisible"
				:model="contactModel"
				mode="create"
				:submitting="contactSubmitting"
				@submit="createContact"
				@cancel="closeContactDialog"
			/>
		</Dialog>
	</div>
</template>
