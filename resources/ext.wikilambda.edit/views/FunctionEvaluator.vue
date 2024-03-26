<!--
	WikiLambda Vue root component to render the Function Evaluator Special Page

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-function-evaluator-view">
		<div class="ext-wikilambda-row">
			<div class="ext-wikilambda-col">
				<!-- Widget Function Evaluator -->
				<wl-function-evaluator-widget></wl-function-evaluator-widget>
			</div>
		</div>
	</div>
</template>

<script>
const FunctionEvaluatorWidget = require( '../components/widgets/FunctionEvaluator.vue' );

// @vue/component
module.exports = exports = {
	name: 'wl-function-evaluator',
	components: {
		'wl-function-evaluator-widget': FunctionEvaluatorWidget
	},
	mounted: function () {
		this.$emit( 'mounted' );
	}
};
</script>
