<!--
	WikiLambda Vue component footer for the Function Editor, including publish, cancel and implement buttons.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-function-definition-footer">
		<wl-publish-widget
			:is-dirty="isFunctionDirty"
			:function-signature-changed="functionSignatureChanged"
			@start-publish="raiseFunctionWarnings"
		></wl-publish-widget>
	</div>
</template>

<script>
const PublishWidget = require( '../../widgets/Publish.vue' ),
	Constants = require( '../../../Constants.js' ),
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions;

// @vue/component
module.exports = exports = {
	name: 'wl-function-editor-footer',
	components: {
		'wl-publish-widget': PublishWidget
	},
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
	computed: $.extend( mapGetters( [
		'isCreateNewPage'
	] ), {
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
				return Constants.errorCodes.FUNCTION_INPUT_OUTPUT_CHANGED;
			} else if ( this.functionInputChanged ) {
				return Constants.errorCodes.FUNCTION_INPUT_CHANGED;
			} else if ( this.functionOutputChanged ) {
				return Constants.errorCodes.FUNCTION_OUTPUT_CHANGED;
			}
			return '';
		}
	} ),
	methods: $.extend( mapActions( [
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
			if ( this.functionSignatureChanged ) {
				this.setError( {
					rowId: 0,
					errorType: Constants.errorTypes.WARNING,
					errorCode: this.signatureWarningCode
				} );
			}
		}
	} )
};

</script>

<style lang="less">
@import '../../../ext.wikilambda.edit.variables.less';

.ext-wikilambda-function-definition-footer {
	padding: 0;
	margin-top: @spacing-150;
}
</style>
