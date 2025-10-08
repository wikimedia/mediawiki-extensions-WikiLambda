<!--
	WikiLambda Vue root component to render the Function Evaluator Special Page

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-app-function-evaluator-view">
		<div class="ext-wikilambda-app-row">
			<div class="ext-wikilambda-app-col">
				<!-- Share URL error message -->
				<cdx-message
					v-if="shareUrlError"
					type="error"
					class="ext-wikilambda-app-function-evaluator-view__message"
				>
					{{ shareUrlError }}
				</cdx-message>
				<!-- Widget Function Evaluator -->
				<wl-function-evaluator-widget
					:shared-function-call="sharedFunctionCall"
				></wl-function-evaluator-widget>
			</div>
		</div>
	</div>
</template>

<script>
const { defineComponent, onMounted } = require( 'vue' );
const FunctionEvaluatorWidget = require( '../components/widgets/function-evaluator/FunctionEvaluator.vue' );
const useShareUrl = require( '../composables/useShareUrl.js' );
const { CdxMessage } = require( '../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'wl-function-evaluator-view',
	components: {
		'cdx-message': CdxMessage,
		'wl-function-evaluator-widget': FunctionEvaluatorWidget
	},
	emits: [ 'mounted' ],
	setup( _, { emit } ) {
		const {
			sharedFunctionCall,
			shareUrlError,
			loadFunctionCallFromUrl
		} = useShareUrl();
		onMounted( () => {
			// Load function call from URL if present
			loadFunctionCallFromUrl();
			emit( 'mounted' );
		} );

		return {
			sharedFunctionCall,
			shareUrlError
		};
	}
} );
</script>

<style lang="less">
@import '../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-function-evaluator-view {
	.ext-wikilambda-app-function-evaluator-view__message {
		margin-bottom: @spacing-125;
	}
}
</style>
