<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import Checkbox from "primevue/checkbox";
import InputText from "primevue/inputtext";

import {
	CollectionForm,
	FormField,
	ReferenceKeyInput,
	useCollectionFormModel,
	type FormErrorsView,
} from "@katren/vue-collection-lib";
import {
	createContactFormModel,
	type ContactFormModel,
} from "@/forms/contact.gen";
import { employeePostReference } from "@/references/employeePostReferences";
import type { ContactCreatePayload } from "@/types/contact";

type FormMode = "create" | "edit" | "copy";

const props = withDefaults(defineProps<{
	model?: Partial<ContactFormModel>;
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
	submit: [model: ContactCreatePayload];
	cancel: [];
}>();

const { t } = useI18n();
const { form } = useCollectionFormModel<ContactFormModel>({
	model: () => props.model,
	defaults: createContactFormModel,
});

const phoneDigits = (value: unknown): string => {
	return String(value ?? "").replace(/\D/g, "");
};

const normalizePhone = (value: unknown): string => {
	let digits = phoneDigits(value);
	if (!digits) {
		return "";
	}

	if (digits.startsWith("8")) {
		digits = `7${digits.slice(1)}`;
	} else if (!digits.startsWith("7")) {
		digits = `7${digits}`;
	}

	return digits.slice(0, 11);
};

const formatPhone = (value: unknown): string => {
	const normalized = normalizePhone(value);
	if (!normalized) {
		return "";
	}

	const subscriber = normalized.startsWith("7")
		? normalized.slice(1)
		: normalized;
	const operator = subscriber.slice(0, 3);
	const first = subscriber.slice(3, 6);
	const second = subscriber.slice(6, 8);
	const third = subscriber.slice(8, 10);

	let result = "+7";
	if (operator) {
		result += `(${operator}`;
	}
	if (operator.length === 3) {
		result += ")";
	}
	if (first) {
		result += `-${first}`;
	}
	if (second) {
		result += `-${second}`;
	}
	if (third) {
		result += `-${third}`;
	}

	return result;
};

const phoneDisplay = computed((): string => {
	return formatPhone(form.value.phone);
});

const updatePhone = (value: string | undefined): void => {
	const digits = phoneDigits(value);
	form.value.phone = digits.length === 0
		? ""
		: normalizePhone(value);
};

const normalizeEmployeePostID = (value: unknown): number | null => {
	const id = Number(value ?? 0);
	return Number.isInteger(id) && id > 0 ? id : null;
};

const submit = (): void => {
	const employeePostID = normalizeEmployeePostID(
		form.value.employee_post_id,
	);
	const email = form.value.email?.trim() || null;
	const model: ContactCreatePayload = {
		name: form.value.name?.trim() ?? "",
		phone: normalizePhone(form.value.phone),
		...(props.mode === "edit"
			? { email }
			: email !== null
				? { email }
				: {}),
		...(props.mode === "edit"
			? { employee_post_id: employeePostID }
			: employeePostID !== null
				? { employee_post_id: employeePostID }
				: {}),
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
		<div class="contact-form-grid">
			<FormField
				field="name"
				forId="contactName"
				:label="t('Contact.fields.name')"
				:errors="props.errors"
				containerClass="min-w-0"
				v-slot="{ invalid }"
			>
				<InputText
					id="contactName"
					v-model="form.name"
					:invalid="invalid"
					class="w-full min-w-0"
					autofocus
					required
				/>
			</FormField>

			<FormField
				field="phone"
				forId="contactPhone"
				:label="t('Contact.fields.phone')"
				:errors="props.errors"
				containerClass="min-w-0"
				v-slot="{ invalid }"
			>
				<InputText
					id="contactPhone"
					:modelValue="phoneDisplay"
					:invalid="invalid"
					class="w-full min-w-0"
					inputmode="tel"
					maxlength="18"
					placeholder="+7(922)-269-52-51"
					@update:modelValue="updatePhone"
				/>
			</FormField>

			<FormField
				field="email"
				forId="contactEmail"
				:label="t('Contact.fields.email')"
				:errors="props.errors"
				containerClass="min-w-0"
				v-slot="{ invalid }"
			>
				<InputText
					id="contactEmail"
					v-model="form.email"
					:invalid="invalid"
					class="w-full min-w-0"
				/>
			</FormField>

			<FormField
				field="employee_post_id"
				forId="contactEmployeePostID"
				:label="t('Contact.fields.employee_post_id')"
				:errors="props.errors"
				containerClass="min-w-0 w-full"
				v-slot="{ invalid }"
			>
				<ReferenceKeyInput
					id="contactEmployeePostID"
					v-model="form.employee_post_id"
					:reference="employeePostReference"
					:invalid="invalid"
					class="w-full min-w-0"
				/>
			</FormField>

			<div class="contact-form-active">
				<FormField
					field="is_active"
					:errors="props.errors"
					containerClass="pt-7"
					v-slot="{ invalid }"
				>
					<div class="flex items-center gap-2">
						<Checkbox
							v-model="form.is_active"
							inputId="contactIsActive"
							:invalid="invalid"
							binary
						/>
						<label for="contactIsActive">{{
							t("Contact.fields.is_active")
						}}</label>
					</div>
				</FormField>
			</div>
		</div>
	</CollectionForm>
</template>

<style scoped>
.contact-form-grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 1rem;
	width: 100%;
}

.contact-form-grid > * {
	min-width: 0;
	width: 100%;
}

.contact-form-active {
	grid-column: 1;
}

@media (max-width: 767px) {
	.contact-form-grid {
		grid-template-columns: minmax(0, 1fr);
	}
}
</style>
