<!--
	WikiLambda Vue interface module for generic ZObject manipulation.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div id="ext-wikilambda-app" class="ext-wikilambda-app">
		<template v-if="isInitialized && isAppSetup">
			<!-- Append wl- prefix to the router current view, to help reference component correctly -->
			<component
				:is="`wl-${getCurrentView}`"
			></component>
		</template>
		<!-- Provide a nice error message when fetching zids or initializing the page fails  -->
		<cdx-message v-else-if="hasError" type="warning">
			{{ i18n( 'wikilambda-initialize-error' ).text() }}<br>
			<!-- eslint-disable-next-line vue/no-v-html -->
			<span v-html="i18n( 'wikilambda-renderer-error-footer-project-chat' ).parse()"></span>
		</cdx-message>
		<span v-else>
			{{ i18n( 'wikilambda-loading' ).text() }}
		</span>
	</div>
</template>

<script>
const { defineComponent, inject, onMounted, ref } = require( 'vue' );
const { storeToRefs } = require( 'pinia' );
const FunctionEditorView = require( '../views/FunctionEditor.vue' );
const FunctionEvaluatorView = require( '../views/FunctionEvaluator.vue' );
const FunctionViewerView = require( '../views/FunctionViewer.vue' );
const { removeHashFromURL } = require( '../utils/urlUtils.js' );
const DefaultView = require( '../views/Default.vue' );
const useMainStore = require( '../store/index.js' );
const useClipboardManager = require( '../composables/useClipboardManager.js' );
const { CdxMessage } = require( '../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'app',
	components: {
		'wl-function-evaluator-view': FunctionEvaluatorView,
		'wl-function-editor-view': FunctionEditorView,
		'wl-function-viewer-view': FunctionViewerView,
		'wl-default-view': DefaultView,
		'cdx-message': CdxMessage
	},
	setup() {
		const i18n = inject( 'i18n' );
		const isAppSetup = ref( false );
		const hasError = ref( false );

		const store = useMainStore();
		const { isInitialized, getCurrentView } = storeToRefs( store );

		// Set up global clipboard manager for copyable elements
		useClipboardManager( {
			classNames: [ 'ext-wikilambda-viewpage-header__zid', 'ext-wikilambda-editpage-header__zid' ]
		} );

		onMounted( () => {
			store.fetchUserRights();
			store.prefetchZids()
				.then( () => {
					store.initializeView()
						.then( () => {
							store.evaluateUri();
							isAppSetup.value = true;
						} )
						.catch( () => {
							hasError.value = true;
						} );
				} )
				.catch( () => {
					hasError.value = true;
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
				if ( store.isCreateNewPage ) {
					store.initializeView()
						.then( () => store.evaluateUri() )
						.catch( () => {
						// Do nothing
						} );
					return;
				}

				store.evaluateUri();
			};
		} );

		return {
			// Reactive store data
			getCurrentView,
			isInitialized,
			// Other data
			hasError,
			i18n,
			isAppSetup
		};
	}
} );
</script>

<style lang="less">
.ext-wikilambda-view-nojsfallback,
.ext-wikilambda-editor-nojswarning {
	display: none;
}
</style>
