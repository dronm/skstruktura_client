<script setup lang="ts">
import { CollectionListPage } from "@katren/vue-collection-lib";

import { downtimeReasonCollection } from "@/collections/downtimeReason.gen";
</script>

<template>
	<CollectionListPage :collection="downtimeReasonCollection" />
</template>
