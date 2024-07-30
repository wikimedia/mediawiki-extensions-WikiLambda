<!--
	WikiLambda Vue interface module for generic ZObject manipulation.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div id="ext-wikilambda-app" class="ext-wikilambda-edit">
		<wl-clipboard-manager
			:class-names="[
				'ext-wikilambda-viewpage-header-zid',
				'ext-wikilambda-editpage-header-zid'
			]">
		</wl-clipboard-manager>
		<template v-if="isInitialized && isAppSetup">
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
const { defineComponent } = require( 'vue' );
const mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions,
	ClipboardManager = require( './base/ClipboardManager.vue' ),
	eventLogUtils = require( '../mixins/eventLogUtils.js' ),
	urlUtils = require( '../mixins/urlUtils.js' ),
	FunctionEvaluator = require( '../views/FunctionEvaluator.vue' ),
	FunctionEditor = require( '../views/FunctionEditor.vue' ),
	FunctionViewer = require( '../views/FunctionViewer.vue' ),
	DefaultView = require( '../views/DefaultView.vue' );

const startTime = Date.now();

module.exports = exports = defineComponent( {
	name: 'app',
	components: {
		'wl-function-evaluator': FunctionEvaluator,
		'wl-function-editor': FunctionEditor,
		'wl-function-viewer': FunctionViewer,
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
		mapGetters( [
			'isInitialized',
			'isCreateNewPage',
			'getCurrentView'
		] )
	),
	methods: Object.assign(
		mapActions( [
			'initializeView',
			'prefetchZids',
			'fetchUserRights',
			'evaluateUri'
		] ),
		{
			/**
			 * Instrument how long our view took to load, split by type of view
			 */
			newViewMounted: function () {
				// Log using Metrics Platform
				// Pending to remove due to T350495
				const customData = {
					viewname: this.getCurrentView || null,
					isnewzobject: this.isCreateNewPage,
					loadtime: Date.now() - startTime
				};
				this.dispatchEvent( 'wf.ui.newView.mounted', customData );
				// T350495 Update the WikiLambda instrumentation to use core interaction events
				// We should remove this event after migration (it's a performance event)
			}
		}
	),
	created: function () {
		// Set zobject
		this.fetchUserRights();
		this.prefetchZids().then( () => {
			this.initializeView().then( () => {
				this.evaluateUri();
				this.isAppSetup = true;
			} );
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
				this.initializeView().then(
					() => {
						this.evaluateUri();
					}
				);
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
