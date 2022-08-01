<template>
	<!--
		WikiLambda Vue component for viewing a function name in different languages.

		@copyright 2022– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div>
		<h2>
			{{ $i18n( 'wikilambda-persistentobject-details-label' ).text() }}
		</h2>
		<h3>
			{{ $i18n( 'wikilambda-persistentobject-evaluate-function' ).text() }}
		</h3>
		<z-function-evaluator></z-function-evaluator>
		<div>
			<h3>
				{{ $i18n( 'wikilambda-expert-mode-json-label' ).text() }}
			</h3>
			<z-object-json
				:readonly="true"
				:zobject-raw="getZObjectAsJson"
			></z-object-json>
		</div>
	</div>
</template>

<script>
var mapGetters = require( 'vuex' ).mapGetters,
	ZFunctionEvaluator = require( '../../../components/function/ZFunctionEvaluator.vue' ),
	ZObjectJson = require( '../../../components/ZObjectJson.vue' );

// @vue/component
module.exports = exports = {
	name: 'function-viewer-about-details',
	components: {
		'z-function-evaluator': ZFunctionEvaluator,
		'z-object-json': ZObjectJson
	},
	computed: mapGetters( [
		'getZObjectAsJson'
	] )
};

</script>
