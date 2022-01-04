<template>
	<!--
		WikiLambda Vue interface module for rendering a function's type signature.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-function-signature">
		( {{ arguments }} ): {{ returnType }}
	</div>
</template>

<script>
module.exports = {
	props: {
		arguments: {
			type: String,
			default: ''
		},
		returnType: {
			type: String,
			default: 'Any'
		}
	}
};
</script>

<style lang="less">
.ext-wikilambda-function-signature {
	font-family: 'Courier New', 'Courier', monospace;
	padding: 1em;
	margin-bottom: 1em;
	background: #efe;
	outline: 1px dashed #888;
}
</style>
