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
		<div
			v-if="displaySuccessMessage"
			class="ext-wikilambda-app-toast-message"
		>
			<cdx-message
				:auto-dismiss="true"
				:fade-in="true"
				type="success"
			>
				{{ i18n( 'wikilambda-publish-successful' ).text() }}
			</cdx-message>
		</div>
	</div>
</template>

<script>
const { computed, defineComponent, inject, onMounted } = require( 'vue' );
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
const { CdxMessage } = require( '../../codex.js' );

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
		const {
			sharedFunctionCall,
			shareUrlError,
			loadFunctionCallFromUrl
		} = useShareUrl();

		const functionType = Constants.Z_FUNCTION;

		/**
		 * Returns whether to display the success message
		 *
		 * @return {boolean}
		 */
		const displaySuccessMessage = computed( () => store.getShowPublishSuccess );

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
			// Check if we should show publish success message
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

		return {
			displaySuccessMessage,
			dispatchAboutEvent,
			functionType,
			getCurrentZObjectId,
			i18n,
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
