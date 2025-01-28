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
const { CdxMessage } = require( '../../codex.js' );
const { defineComponent } = require( 'vue' );
const { mapState } = require( 'pinia' );

const Constants = require( '../Constants.js' );
const AboutWidget = require( '../components/widgets/about/About.vue' );
const FunctionEvaluatorWidget = require( '../components/widgets/function-evaluator/FunctionEvaluator.vue' );
const FunctionViewerDetails = require( '../components/function/viewer/FunctionViewerDetails.vue' );
const eventLogUtils = require( '../mixins/eventLogUtils.js' );
const useMainStore = require( '../store/index.js' );

module.exports = exports = defineComponent( {
	name: 'wl-function-viewer-view',
	components: {
		'wl-about-widget': AboutWidget,
		'wl-function-evaluator-widget': FunctionEvaluatorWidget,
		'wl-function-viewer-details': FunctionViewerDetails,
		'cdx-message': CdxMessage
	},
	mixins: [ eventLogUtils ],
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
			if ( mw.Uri().query ) {
				return mw.Uri().query.success === 'true';
			}
			return false;
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
