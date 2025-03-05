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
				<!-- Widget Function Evaluator -->
				<wl-function-evaluator-widget
					:function-zid="getCurrentZObjectId"
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
				{{ $i18n( 'wikilambda-publish-successful' ).text() }}
			</cdx-message>
		</div>
	</div>
</template>

<script>
const { defineComponent } = require( 'vue' );
const { mapState } = require( 'pinia' );

const Constants = require( '../Constants.js' );
const eventLogMixin = require( '../mixins/eventLogMixin.js' );
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
	mixins: [ eventLogMixin ],
	data: function () {
		return {
			functionType: Constants.Z_FUNCTION
		};
	},
	computed: Object.assign( {}, mapState( useMainStore, [
		'getCurrentZObjectId',
		'getUserLangZid'
	] ), {
		displaySuccessMessage: function () {
			const url = new URL( window.location.href );
			return url.searchParams.get( 'success' ) === 'true';
		}
	} ),
	methods: {
		/**
		 * Dispatch event after a click of the edit icon in the About widget.
		 */
		dispatchAboutEvent: function () {
			// Log an event using Metrics Platform's core interaction events
			const interactionData = {
				zobjecttype: Constants.Z_FUNCTION,
				zobjectid: this.getCurrentZObjectId || null,
				zlang: this.getUserLangZid || null
			};
			this.submitInteraction( 'edit', interactionData );
		}
	},
	watch: {
		/**
		 * Remove the success query parameter from the URL when the success message is displayed.
		 *
		 * @param {boolean} value
		 */
		displaySuccessMessage: {
			immediate: true,
			handler: function ( value ) {
				if ( value ) {
					const url = new URL( window.location.href );
					url.searchParams.delete( 'success' );
					history.replaceState( null, '', `${ url.pathname }${ url.search }` );
				}
			}
		}
	},
	mounted: function () {
		// Log an event using Metrics Platform's core interaction events
		const interactionData = {
			zobjecttype: Constants.Z_FUNCTION,
			zobjectid: this.getCurrentZObjectId || null,
			zlang: this.getUserLangZid || null
		};
		this.submitInteraction( 'view', interactionData );
		this.$emit( 'mounted' );
	}
} );
</script>
