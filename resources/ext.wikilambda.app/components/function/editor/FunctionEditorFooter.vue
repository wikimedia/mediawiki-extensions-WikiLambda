<!--
	WikiLambda Vue component footer for the Function Editor, including publish, cancel and implement buttons.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-app-function-editor-footer">
		<wl-publish-widget
			:is-dirty="isFunctionDirty"
			:function-signature-changed="functionSignatureChanged"
			@start-publish="raiseFunctionWarnings"
		></wl-publish-widget>
	</div>
</template>

<script>
const { defineComponent } = require( 'vue' );
const { mapActions, mapState } = require( 'pinia' );

const Constants = require( '../../../Constants.js' );
const eventLogMixin = require( '../../../mixins/eventLogMixin.js' );
const PublishWidget = require( '../../widgets/publish/Publish.vue' );
const useMainStore = require( '../../../store/index.js' );

module.exports = exports = defineComponent( {
	name: 'wl-function-editor-footer',
	components: {
		'wl-publish-widget': PublishWidget
	},
	mixins: [ eventLogMixin ],
	props: {
		functionInputChanged: {
			type: Boolean,
			required: false,
			default: false
		},
		functionOutputChanged: {
			type: Boolean,
			required: false,
			default: false
		},
		isFunctionDirty: {
			type: Boolean,
			required: false,
			default: false
		}
	},
	computed: Object.assign( {}, mapState( useMainStore, [
		'isCreateNewPage',
		'getCurrentZObjectId',
		'getConnectedImplementations',
		'getConnectedTests',
		'getUserLangZid'
	] ), {

		/**
		 * Returns whether the function has connected objects (implementations or tests).
		 *
		 * @return {boolean}
		 */
		hasConnectedObjects: function () {
			return !!this.getConnectedImplementations().length || !!this.getConnectedTests().length;
		},
		/**
		 * Returns whether the function type signature (input types
		 * and output type) has changed from its initial value.
		 *
		 * @return {boolean}
		 */
		functionSignatureChanged: function () {
			return this.functionInputChanged || this.functionOutputChanged;
		},
		/**
		 * Returns the error code for the type of function
		 * signature warning to be shown to the user, depending on
		 * whether the inputs have changed, the output, or both.
		 *
		 * @return {string}
		 */
		signatureWarningCode: function () {
			if ( this.functionInputChanged && this.functionOutputChanged ) {
				return Constants.ERROR_CODES.FUNCTION_INPUT_OUTPUT_CHANGED;
			} else if ( this.functionInputChanged ) {
				return Constants.ERROR_CODES.FUNCTION_INPUT_CHANGED;
			} else if ( this.functionOutputChanged ) {
				return Constants.ERROR_CODES.FUNCTION_OUTPUT_CHANGED;
			}
			return '';
		}
	} ),
	methods: Object.assign( {}, mapActions( useMainStore, [
		'setError'
	] ), {

		/**
		 * Set warnings when there are changes in the function signature
		 * to announce that
		 */
		raiseFunctionWarnings: function () {
			// Only warn of changes if we are editing an existing function
			if ( this.isCreateNewPage ) {
				return;
			}

			// If there's changes in the function signature, warn that
			// implementations and testers will be detached
			if ( this.functionSignatureChanged && this.hasConnectedObjects ) {
				this.setError( {
					rowId: 0,
					errorType: Constants.ERROR_TYPES.WARNING,
					errorCode: this.signatureWarningCode
				} );
			}
		}
	} ),
	watch: {
		isFunctionDirty: function ( newValue ) {
			if ( newValue === true ) {
				const interactionData = {
					zobjectid: this.getCurrentZObjectId,
					zobjecttype: 'Z8',
					zlang: this.getUserLangZid || null
				};
				this.submitInteraction( 'change', interactionData );
			}
		}
	}
} );

</script>

<style lang="less">
@import '../../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-function-editor-footer {
	padding: 0;
	margin-top: @spacing-150;
}
</style>
