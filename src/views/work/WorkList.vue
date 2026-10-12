<script setup lang="ts">
import { CollectionListPage } from "@katren/vue-collection-lib";

import { workCollection } from "@/collections/work.gen";
</script>

<template>
	<CollectionListPage :collection="workCollection" />
</template>
