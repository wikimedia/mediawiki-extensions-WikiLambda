<template>
	<!--
		WikiLambda Vue component for viewing a function name in different languages.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div>
		<h2>
			{{ $i18n( 'wikilambda-persistentobject-details-label' ).text() }}
		</h2>
		<h3>
			{{ $i18n( 'wikilambda-persistentobject-evaluate-function' ).text() }}
		</h3>
		<wl-z-function-evaluator></wl-z-function-evaluator>
		<div>
			<h3>
				{{ $i18n( 'wikilambda-expert-mode-json-label' ).text() }}
			</h3>
			<wl-z-object-json
				:readonly="true"
				:zobject-raw="getZObjectAsJson"
			></wl-z-object-json>
		</div>
	</div>
</template>

<script>
var mapGetters = require( 'vuex' ).mapGetters,
	ZFunctionEvaluator = require( '../../ZFunctionEvaluator.vue' ),
	ZObjectJson = require( '../../../ZObjectJson.vue' );

// @vue/component
module.exports = exports = {
	name: 'wl-function-viewer-about-details',
	components: {
		'wl-z-function-evaluator': ZFunctionEvaluator,
		'wl-z-object-json': ZObjectJson
	},
	computed: mapGetters( [
		'getZObjectAsJson'
	] )
};

</script>
