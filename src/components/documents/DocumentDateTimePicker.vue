<script setup lang="ts">
import DatePicker from "primevue/datepicker";

const props = withDefaults(
	defineProps<{
		inputId: string;
		invalid?: boolean;
		required?: boolean;
	}>(),
	{
		invalid: false,
		required: false,
	},
);

const model = defineModel<Date | undefined>({ required: true });

const parseLocalDateTime = (text: string): Date | null => {
	const match = text
		.trim()
		.match(
			/^(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?$/,
		);
	if (!match) {
		return null;
	}

	const [
		,
		dayText,
		monthText,
		yearText,
		hourText,
		minuteText,
		secondText,
	] = match;
	const day = Number(dayText);
	const month = Number(monthText);
	const year = Number(yearText);
	const hour = Number(hourText);
	const minute = Number(minuteText);
	const second = Number(secondText ?? 0);

	if (
		month < 1 ||
		month > 12 ||
		day < 1 ||
		day > 31 ||
		hour > 23 ||
		minute > 59 ||
		second > 59
	) {
		return null;
	}

	const value = new Date(year, month - 1, day, hour, minute, second, 0);
	if (
		value.getFullYear() !== year ||
		value.getMonth() !== month - 1 ||
		value.getDate() !== day ||
		value.getHours() !== hour ||
		value.getMinutes() !== minute ||
		value.getSeconds() !== second
	) {
		return null;
	}

	return value;
};

const updateFromText = (text: string): void => {
	const value = parseLocalDateTime(text);
	if (value !== null) {
		model.value = value;
	}
};

const onInput = (event: Event): void => {
	const target = event.target as HTMLInputElement | null;
	if (target !== null) {
		updateFromText(target.value);
	}
};

const onBlur = (event: { value: string }): void => {
	updateFromText(event.value);
};
</script>

<template>
	<DatePicker
		:inputId="props.inputId"
		v-model="model"
		:invalid="props.invalid"
		:required="props.required"
		dateFormat="dd.mm.yy"
		showIcon
		showTime
		showSeconds
		hourFormat="24"
		@input="onInput"
		@blur="onBlur"
	/>
</template>
