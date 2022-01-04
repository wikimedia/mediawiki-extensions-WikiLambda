<template>
	<!--
		WikiLambda Vue component for the Function editor.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-fn-editor-base">
		<h2>
			<slot name="title"></slot>
		</h2>
		<div v-if="$slots.subtitle" class="ext-wikilambda-fn-editor-subtitle">
			<slot name="subtitle"></slot>
		</div>
		<slot></slot>
	</div>
</template>

<script>
module.exports = {};
</script>

<style lang="less">
.ext-wikilambda-fn-editor-base {
	flex-grow: 1;
}

.ext-wikilambda-fn-editor-subtitle {
	color: #999;
	font-style: italic;
	padding: 1em 0;
}
</style>
