<!--
	WikiLambda Vue component for the special view of a ZFunction object.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-app-function-viewer-view">
		<div class="ext-wikilambda-app-row">
			<div class="ext-wikilambda-app-col ext-wikilambda-app-col-8 ext-wikilambda-app-col-tablet-24">
				<!-- Widget About -->
				<wl-about-widget
					:edit="false"
					:type="functionType"
					@edit-metadata="dispatchAboutEvent"
				></wl-about-widget>
			</div>
			<div class="ext-wikilambda-app-col ext-wikilambda-app-col-16 ext-wikilambda-app-col-tablet-24">
				<!-- Share URL error message -->
				<cdx-message
					v-if="shareUrlError"
					type="error"
					class="ext-wikilambda-app-function-viewer-view__message"
				>
					{{ shareUrlError }}
				</cdx-message>
				<!-- Widget Function Evaluator -->
				<wl-function-evaluator-widget
					:function-zid="getCurrentZObjectId"
					:shared-function-call="sharedFunctionCall"
				></wl-function-evaluator-widget>
				<!-- Function Details for Testers and Implementations -->
				<wl-function-viewer-details>
				</wl-function-viewer-details>
			</div>
		</div>
	</div>
</template>

<script>
const { computed, defineComponent, inject, onBeforeUnmount, onMounted, ref, watch } = require( 'vue' );
const { storeToRefs } = require( 'pinia' );

const Constants = require( '../Constants.js' );
const useEventLog = require( '../composables/useEventLog.js' );
const useShareUrl = require( '../composables/useShareUrl.js' );
const useMainStore = require( '../store/index.js' );

// Widget components
const AboutWidget = require( '../components/widgets/about/About.vue' );
const FunctionEvaluatorWidget = require( '../components/widgets/function-evaluator/FunctionEvaluator.vue' );
// Function view components
const FunctionViewerDetails = require( '../components/function/viewer/FunctionViewerDetails.vue' );
// Codex components
const { CdxMessage, useToast } = require( '../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'wl-function-viewer-view',
	components: {
		'wl-about-widget': AboutWidget,
		'wl-function-evaluator-widget': FunctionEvaluatorWidget,
		'wl-function-viewer-details': FunctionViewerDetails,
		'cdx-message': CdxMessage
	},
	emits: [ 'mounted' ],
	setup( _, { emit } ) {
		const i18n = inject( 'i18n' );
		const store = useMainStore();
		const { getCurrentZObjectId } = storeToRefs( store );
		const { submitInteraction } = useEventLog();
		const toast = useToast();
		const successToastId = ref( null );
		const {
			sharedFunctionCall,
			shareUrlError,
			loadFunctionCallFromUrl
		} = useShareUrl();

		// Constants
		const functionType = Constants.Z_FUNCTION;

		// UI display
		/**
		 * Returns whether to display the success message
		 *
		 * @return {boolean}
		 */
		const displaySuccessMessage = computed( () => store.getShowPublishSuccess );

		/**
		 * Dismisses the success toast
		 */
		function dismissSuccessToast() {
			if ( successToastId.value ) {
				toast.dismiss( successToastId.value );
				successToastId.value = null;
			}
		}

		/**
		 * Handles the dismissal of the success toast
		 */
		function onDismissSuccessToast() {
			successToastId.value = null;
			store.clearShowPublishSuccess();
		}

		/**
		 * Handles pageshow - when restored from bfcache (back button), clean up to avoid showing stale toast
		 *
		 * @param {PageTransitionEvent} event
		 */
		function onPageShow( event ) {
			if ( event.persisted ) {
				dismissSuccessToast();
			}
		}

		/**
		 * Shows the success toast when the publish success flag is set (only on fresh load after actual publish)
		 *
		 * @param {boolean} show - Whether to show the success toast
		 */
		watch( displaySuccessMessage, ( show ) => {
			if ( show ) {
				successToastId.value = toast.success( i18n( 'wikilambda-publish-successful' ).text(), {
					autoDismiss: true,
					onUserDismissed: onDismissSuccessToast,
					onAutoDismissed: onDismissSuccessToast
				} );
			}
		}, { immediate: true } );

		// Actions
		/**
		 * Dispatch event after a click of the edit icon in the About widget.
		 */
		function dispatchAboutEvent() {
			const interactionData = {
				zobjecttype: Constants.Z_FUNCTION,
				zobjectid: store.getCurrentZObjectId || null,
				zlang: store.getUserLangZid || null
			};
			submitInteraction( 'edit', interactionData );
		}

		// Lifecycle
		onMounted( () => {
			// Handle pageshow - when restored from bfcache (back button), clean up to avoid showing stale toast
			window.addEventListener( 'pageshow', onPageShow );

			// Check if we should show publish success message (session storage key set by Publish.vue before redirect)
			store.checkPublishSuccess( getCurrentZObjectId.value );

			// Load function call from URL if present (validate against current function)
			loadFunctionCallFromUrl( getCurrentZObjectId.value );
			const interactionData = {
				zobjecttype: Constants.Z_FUNCTION,
				zobjectid: store.getCurrentZObjectId || null,
				zlang: store.getUserLangZid || null
			};
			submitInteraction( 'view', interactionData );
			emit( 'mounted' );
		} );

		onBeforeUnmount( () => {
			window.removeEventListener( 'pageshow', onPageShow );
		} );

		return {
			dispatchAboutEvent,
			functionType,
			getCurrentZObjectId,
			shareUrlError,
			sharedFunctionCall
		};
	}
} );
</script>

<style lang="less">
@import '../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-function-viewer-view {
	.ext-wikilambda-app-function-viewer-view__message {
		margin-bottom: @spacing-125;
	}
}
</style>
