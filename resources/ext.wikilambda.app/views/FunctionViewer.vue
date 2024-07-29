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
const CdxMessage = require( '@wikimedia/codex' ).CdxMessage,
	Constants = require( '../Constants.js' ),
	AboutWidget = require( '../components/widgets/about/About.vue' ),
	FunctionEvaluatorWidget = require( '../components/widgets/function-evaluator/FunctionEvaluator.vue' ),
	FunctionViewerDetails = require( '../components/function/viewer/FunctionViewerDetails.vue' ),
	eventLogUtils = require( '../mixins/eventLogUtils.js' ),
	mapGetters = require( 'vuex' ).mapGetters;

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
	computed: Object.assign( mapGetters( [
		'getCurrentZObjectId',
		'getUserLangZid',
		'isCreateNewPage'
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
			this.dispatchEvent( 'wf.ui.editFunction.load', {
				edit: true,
				zobjecttype: Constants.Z_FUNCTION,
				isnewzobject: false,
				zobjectid: this.getCurrentZObjectId || null,
				zlang: this.getUserLangZid || null
			} );
			// T350495 Update the WikiLambda instrumentation to use core interaction events
			const interactionData = {
				zobjecttype: Constants.Z_FUNCTION,
				zobjectid: this.getCurrentZObjectId || null,
				zlang: this.getUserLangZid || null
			};
			this.submitInteraction( 'edit', interactionData );
		}
	},
	mounted: function () {
		this.dispatchEvent( 'wf.ui.editFunction.load', {
			edit: false,
			zobjecttype: Constants.Z_FUNCTION,
			isnewzobject: this.isCreateNewPage,
			zobjectid: this.getCurrentZObjectId || null,
			zlang: this.getUserLangZid || null
		} );
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
