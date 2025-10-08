<!--
	WikiLambda Vue component for the special view of a ZFunction object.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-app-function-editor-view">
		<div class="ext-wikilambda-app-function-editor-view__main">
			<main class="ext-wikilambda-app-function-editor-view__content">
				<wl-function-editor></wl-function-editor>
			</main>
		</div>
	</div>
</template>

<script>
const { defineComponent, onMounted } = require( 'vue' );

const FunctionEditor = require( '../components/function/editor/FunctionEditor.vue' );

module.exports = exports = defineComponent( {
	name: 'wl-function-editor-view',
	components: {
		'wl-function-editor': FunctionEditor
	},
	emits: [ 'mounted' ],
	setup( _, { emit } ) {
		onMounted( () => {
			emit( 'mounted' );
		} );

		return {};
	}
} );
</script>

<style lang="less">
.ext-wikilambda-app-function-editor-view {
	.ext-wikilambda-app-function-editor-view__content {
		width: 100%;
	}
}
</style>
