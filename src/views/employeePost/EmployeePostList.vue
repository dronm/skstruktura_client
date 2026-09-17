<script setup lang="ts">
import { CollectionListPage } from "@katren/vue-collection-lib";

import { employeePostCollection } from "@/collections/employeePost.gen";
</script>

<template>
	<CollectionListPage :collection="employeePostCollection" />
</template>
