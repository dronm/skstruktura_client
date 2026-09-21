<script setup lang="ts">
import { CollectionListPage } from "@katren/vue-collection-lib";

import { materialRequestStatusCollection } from "@/collections/materialRequestStatus.gen";
</script>

<template>
	<CollectionListPage :collection="materialRequestStatusCollection" />
</template>
