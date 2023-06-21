<template>
	<!--
		WikiLambda Vue interface module for generic ZObject manipulation.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
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
var configureCompat = require( 'vue' ).configureCompat,
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions,
	FunctionEditor = require( '../views/FunctionEditor.vue' ),
	FunctionViewer = require( '../views/FunctionViewer.vue' ),
	DefaultView = require( '../views/DefaultView.vue' );

const startTime = Date.now();

configureCompat( { MODE: 3 } );

// @vue/component
module.exports = exports = {
	name: 'app',
	components: {
		'wl-function-editor': FunctionEditor,
		'wl-function-viewer': FunctionViewer,
		'wl-default-view': DefaultView
	},
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
			'prefetchZids'
		] ),
		mapActions( 'router', [ 'evaluateUri' ] ),
		{
			/**
			 * Instrument how long our view took to load, split by type of view
			 */
			newViewMounted: function () {
				// HACK: Is there a nicer way to split this by type of view?
				const viewName = ( window.vueInstance && window.vueInstance.getCurrentView ) || 'testComponent';

				// Log using Metrics Platform
				const customData = {
					viewname: viewName,
					loadtime: Date.now() - startTime
				};
				mw.eventLog.dispatch( 'wf.ui.newView.mounted', customData );
			}
		}
	),
	created: function () {
		// Set zobject
		this.initializeView().then(
			function () {
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
