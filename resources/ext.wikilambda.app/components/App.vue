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
		<!-- Provide a nice error message when fetching zids or initializing the page fails  -->
		<cdx-message v-else-if="hasError" type="warning">
			{{ $i18n( 'wikilambda-initialize-error' ).text() }}<br>
			<!-- eslint-disable vue/no-v-html -->
			<span v-html="$i18n( 'wikilambda-renderer-error-footer-project-chat' ).parse()"></span>
		</cdx-message>
		<span v-else>
			{{ $i18n( 'wikilambda-loading' ).text() }}
		</span>
	</div>
</template>

<script>
const { defineComponent } = require( 'vue' );
const { mapActions, mapState } = require( 'pinia' );

const ClipboardManager = require( './base/ClipboardManager.vue' );
const eventLogMixin = require( '../mixins/eventLogMixin.js' );
const FunctionEditorView = require( '../views/FunctionEditor.vue' );
const FunctionEvaluatorView = require( '../views/FunctionEvaluator.vue' );
const FunctionViewerView = require( '../views/FunctionViewer.vue' );
const { removeHashFromURL } = require( '../utils/urlUtils.js' );
const DefaultView = require( '../views/Default.vue' );
const useMainStore = require( '../store/index.js' );
const { CdxMessage } = require( '../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'app',
	components: {
		'wl-function-evaluator-view': FunctionEvaluatorView,
		'wl-function-editor-view': FunctionEditorView,
		'wl-function-viewer-view': FunctionViewerView,
		'wl-default-view': DefaultView,
		'wl-clipboard-manager': ClipboardManager,
		'cdx-message': CdxMessage
	},
	mixins: [ eventLogMixin ],
	inject: {
		viewmode: { default: false }
	},
	data: function () {
		return {
			isAppSetup: false,
			hasError: false
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
					} )
					.catch( () => {
						this.hasError = true;
					} );
			} )
			.catch( () => {
				this.hasError = true;
			} );

		window.onpopstate = function ( event ) {
			/**
			 * Prevent reinitializing the view when there is a hash in the URL,
			 * this is most likely when using a a11y SkipLink.
			 */
			if ( window.location.hash && event.state === null ) {
				event.preventDefault();
				// Remove hash from url so it does not persist after navigation
				removeHashFromURL();
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
