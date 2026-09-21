<script setup lang="ts">
import { CollectionListPage } from "@katren/vue-collection-lib";

import { materialStatusCollection } from "@/collections/materialStatus.gen";
</script>

<template>
	<CollectionListPage :collection="materialStatusCollection" />
</template>
