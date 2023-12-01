<!--
	WikiLambda Vue interface module for generic ZObject manipulation.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div id="ext-wikilambda-app" class="ext-wikilambda-edit">
		<template v-if="getZObjectInitialized && isAppSetup">
			<!-- Append wl- prefix to the router current view, to help reference component correctly -->
			<component
				:is="`wl-${getCurrentView}`"
				@mounted="newViewMounted"
			></component>
		</template>
		<span v-else>
			{{ $i18n( 'wikilambda-loading' ).text() }}
		</span>
	</div>
</template>

<script>
var mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions,
	eventLogUtils = require( '../mixins/eventLogUtils.js' ),
	FunctionEvaluator = require( '../views/FunctionEvaluator.vue' ),
	FunctionEditor = require( '../views/FunctionEditor.vue' ),
	FunctionViewer = require( '../views/FunctionViewer.vue' ),
	DefaultView = require( '../views/DefaultView.vue' );

const startTime = Date.now();

// @vue/component
module.exports = exports = {
	name: 'app',
	components: {
		'wl-function-evaluator': FunctionEvaluator,
		'wl-function-editor': FunctionEditor,
		'wl-function-viewer': FunctionViewer,
		'wl-default-view': DefaultView
	},
	mixins: [ eventLogUtils ],
	inject: {
		viewmode: { default: false }
	},
	data: function () {
		return {
			isAppSetup: false
		};
	},
	computed: $.extend(
		mapGetters( [
			'getZObjectInitialized',
			'isNewZObject'
		] ),
		mapGetters( 'router', [ 'getCurrentView' ] )
	),
	methods: $.extend(
		mapActions( [
			'initializeView',
			'prefetchZids',
			'fetchUserRights'
		] ),
		mapActions( 'router', [ 'evaluateUri' ] ),
		{
			/**
			 * Instrument how long our view took to load, split by type of view
			 */
			newViewMounted: function () {
				// Log using Metrics Platform
				const customData = {
					viewname: this.getCurrentView || null,
					isnewzobject: this.isNewZObject,
					loadtime: Date.now() - startTime
				};
				this.dispatchEvent( 'wf.ui.newView.mounted', customData );
			}
		}
	),
	created: function () {
		// Set zobject
		this.initializeView().then(
			function () {
				this.fetchUserRights();
				this.prefetchZids();
				this.evaluateUri();
				this.isAppSetup = true;
			}.bind( this )
		);

		window.onpopstate = function () {
			// Reinitialize zObject is current zobject is new and user changes route
			if ( this.isNewZObject ) {
				this.initializeView().then(
					function () {
						this.evaluateUri();
					}.bind( this )
				);
				return;
			}

			this.evaluateUri();
		}.bind( this );
	}
};
</script>

<style lang="less">
.ext-wikilambda-view-nojsfallback,
.ext-wikilambda-editor-nojswarning {
	display: none;
}
</style>
