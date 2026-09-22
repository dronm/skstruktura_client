import { ref } from "vue";

const supplyManagerDraftActive = ref(false);

export const useSupplyManagerDraftGuard = () => ({
	active: supplyManagerDraftActive,
});
