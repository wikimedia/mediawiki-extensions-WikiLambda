<template>
	<!--
		WikiLambda Vue component for the special view of a ZFunction object.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-function-editor">
		<div class="ext-wikilambda-function-editor__main">
			<main class="ext-wikilambda-function-editor__main__content">
				<wl-function-editor-definition></wl-function-editor-definition>
			</main>
		</div>
	</div>
</template>

<script>
var FunctionEditorDefinition = require( '../components/function/editor/FunctionEditorDefinition.vue' );

// @vue/component
module.exports = exports = {
	name: 'wl-function-editor',
	components: {
		'wl-function-editor-definition': FunctionEditorDefinition
	},
	mounted: function () {
		this.$emit( 'mounted' );
	}
};
</script>

<style lang="less">

.ext-wikilambda-function-editor {
	&__main {
		&__content {
			width: 100%;
		}
	}
}
</style>
