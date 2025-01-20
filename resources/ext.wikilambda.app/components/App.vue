<!--
	WikiLambda Vue interface module for generic ZObject manipulation.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div id="ext-wikilambda-app" class="ext-wikilambda-app">
		<wl-clipboard-manager
			:class-names="[
				'ext-wikilambda-viewpage-header__zid',
				'ext-wikilambda-editpage-header__zid'
			]">
		</wl-clipboard-manager>
		<template v-if="isInitialized && isAppSetup">
			<!-- Append wl- prefix to the router current view, to help reference component correctly -->
			<component
				:is="`wl-${getCurrentView}`"
			></component>
		</template>
		<span v-else>
			{{ $i18n( 'wikilambda-loading' ).text() }}
		</span>
	</div>
</template>

<script>
const { defineComponent } = require( 'vue' );
const { mapState, mapActions } = require( 'pinia' ),
	useMainStore = require( '../store/index.js' ),
	ClipboardManager = require( './base/ClipboardManager.vue' ),
	eventLogUtils = require( '../mixins/eventLogUtils.js' ),
	urlUtils = require( '../mixins/urlUtils.js' ),
	FunctionEvaluatorView = require( '../views/FunctionEvaluator.vue' ),
	FunctionEditorView = require( '../views/FunctionEditor.vue' ),
	FunctionViewerView = require( '../views/FunctionViewer.vue' ),
	DefaultView = require( '../views/Default.vue' );

module.exports = exports = defineComponent( {
	name: 'app',
	components: {
		'wl-function-evaluator-view': FunctionEvaluatorView,
		'wl-function-editor-view': FunctionEditorView,
		'wl-function-viewer-view': FunctionViewerView,
		'wl-default-view': DefaultView,
		'wl-clipboard-manager': ClipboardManager
	},
	mixins: [ eventLogUtils, urlUtils ],
	inject: {
		viewmode: { default: false }
	},
	data: function () {
		return {
			isAppSetup: false
		};
	},
	computed: Object.assign(
		mapState( useMainStore, [
			'isInitialized',
			'isCreateNewPage',
			'getCurrentView'
		] )
	),
	methods: Object.assign(
		mapActions( useMainStore, [
			'initializeView',
			'prefetchZids',
			'fetchUserRights',
			'evaluateUri'
		] )
	),
	created: function () {
		// Set zobject
		this.fetchUserRights();
		this.prefetchZids()
			.then( () => {
				this.initializeView()
					.then( () => {
						this.evaluateUri();
						this.isAppSetup = true;
					} );
			} )
			.catch( () => {
			// Do nothing
			} );

		window.onpopstate = function ( event ) {
			/**
			 * Prevent reinitializing the view when there is a hash in the URL,
			 * this is most likely when using a a11y SkipLink.
			 */
			if ( window.location.hash && event.state === null ) {
				event.preventDefault();
				// Remove hash from url so it does not persist after navigation
				this.removeHashFromURL();
				return false;
			}

			// Reinitialize zObject if current page/zObject is new and user changes route
			if ( this.isCreateNewPage ) {
				this.initializeView()
					.then( () => this.evaluateUri() )
					.catch( () => {
					// Do nothing
					} );
				return;
			}

			this.evaluateUri();
		}.bind( this );
	}
} );
</script>

<style lang="less">
.ext-wikilambda-view-nojsfallback,
.ext-wikilambda-editor-nojswarning {
	display: none;
}
</style>
