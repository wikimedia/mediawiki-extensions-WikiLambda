<!--
	WikiLambda Vue root component to render the Function Evaluator Special Page

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-app-function-evaluator-view">
		<div class="ext-wikilambda-app-row">
			<div class="ext-wikilambda-app-col">
				<!-- Widget Function Evaluator -->
				<wl-function-evaluator-widget></wl-function-evaluator-widget>
			</div>
		</div>
	</div>
</template>

<script>
const { defineComponent } = require( 'vue' );
const FunctionEvaluatorWidget = require( '../components/widgets/function-evaluator/FunctionEvaluator.vue' );

module.exports = exports = defineComponent( {
	name: 'wl-function-evaluator-view',
	components: {
		'wl-function-evaluator-widget': FunctionEvaluatorWidget
	},
	mounted: function () {
		this.$emit( 'mounted' );
	}
} );
</script>
