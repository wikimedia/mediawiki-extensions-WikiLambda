<!--
	WikiLambda Vue component for Visual Editor Wikifunctions function call
	insertion and edit plugin.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-app-function-input-setup">
		<div class="ext-wikilambda-app-function-input-setup__body">
			<cdx-message v-if="hasMissingContent">
				<!-- eslint-disable-next-line vue/no-v-html -->
				<span v-html="missingContentMsg"></span>
			</cdx-message>
			<wl-expandable-description
				v-if="functionDescription"
				:description="functionDescription"
				class="ext-wikilambda-app-function-input-setup__description"
			></wl-expandable-description>
			<p v-else class="ext-wikilambda-app-function-input-setup__description--empty">
				{{ $i18n( 'brackets',
					$i18n( 'wikilambda-visualeditor-wikifunctionscall-no-description' ).text()
				).text() }}
			</p>
			<div v-if="allArgumentsFetched" class="ext-wikilambda-app-function-input-setup__fields">
				<wl-function-input-field
					v-for="( field, index ) in inputFields"
					:key="field.argumentKey"
					v-model="field.value"
					:is-editing="isEditing"
					:argument-type="field.argumentType"
					:label-data="field.labelData"
					:error-message="field.errorMessage"
					@update="value => handleUpdate( index, value )"
					@validate="payload => handleValidation( index, payload )"
					@loading-start="$emit( 'loading-start' )"
					@loading-end="$emit( 'loading-end' )"
				></wl-function-input-field>
			</div>
		</div>
		<div class="ext-wikilambda-app-function-input-setup__footer">
			<cdx-icon :icon="icon"></cdx-icon>
			<!-- eslint-disable-next-line vue/no-v-html -->
			<span class="ext-wikilambda-app-function-input-setup__link" v-html="functionLink"></span>
		</div>
	</div>
</template>

<script>
const { CdxIcon, CdxMessage } = require( '../../../codex.js' );
const { defineComponent } = require( 'vue' );
const { mapState, mapActions } = require( 'pinia' );
const useMainStore = require( '../../store/index.js' );
const Constants = require( '../../Constants.js' );
const FunctionInputField = require( './FunctionInputField.vue' );
const ExpandableDescription = require( './ExpandableDescription.vue' );
const wikifunctionsIconSvg = require( './wikifunctionsIconSvg.js' );

module.exports = exports = defineComponent( {
	name: 'wl-function-input-setup',
	components: {
		'wl-function-input-field': FunctionInputField,
		'wl-expandable-description': ExpandableDescription,
		'cdx-icon': CdxIcon,
		'cdx-message': CdxMessage
	},
	emits: [ 'update', 'loading-start', 'loading-end' ],
	data: function () {
		return {
			icon: wikifunctionsIconSvg,
			inputFields: [],
			allArgumentsFetched: false
		};
	},
	computed: Object.assign( {}, mapState( useMainStore, [
		'getLabelData',
		'getDescription',
		'getVEFunctionId',
		'getVEEditing',
		'getVEFunctionParams',
		'getInputsOfFunctionZid'
	] ), {
		/**
		 * Returns if the function is being edited.
		 *
		 * @return {boolean}
		 */
		isEditing: function () {
			return this.getVEEditing;
		},
		/**
		 * Returns the VisualEditor function ID.
		 *
		 * @return {string}
		 */
		functionZid: function () {
			return this.getVEFunctionId;
		},
		/**
		 * Returns the text for the link to the function in Wikifunctions.
		 *
		 * @return {string}
		 */
		functionLink: function () {
			return this.$i18n(
				'wikilambda-visualeditor-wikifunctionscall-dialog-function-link-footer',
				this.functionZid
			).parse();
		},
		/**
		 * Returns the message notifying about missing content in the user language
		 * with a link to the Wikifunctions page for the function.
		 *
		 * @return {string}
		 */
		missingContentMsg: function () {
			return this.$i18n(
				'wikilambda-visualeditor-wikifunctionscall-info-missing-content',
				this.functionZid
			).parse();
		},
		/**
		 * Returns the LabelData object for the function name
		 *
		 * @return {LabelData}
		 */
		functionName: function () {
			return this.getLabelData( this.functionZid );
		},
		/**
		 * Returns the description of the function.
		 *
		 * @return {LabelData}
		 */
		functionDescription: function () {
			return this.getDescription( this.functionZid );
		},
		/**
		 * Returns the arguments of the function.
		 *
		 * @return {Array}
		 */
		functionArguments: function () {
			return this.getInputsOfFunctionZid( this.functionZid );
		},
		/**
		 * Checks if all input fields are valid.
		 *
		 * @param {Object} state - The state object.
		 * @return {boolean} - True if all fields are valid, otherwise false.
		 */
		areInputFieldsValid: function () {
			return this.inputFields.every( ( field ) => field.isValid );
		},
		/**
		 * Returns whether any of the shown multilingual labels
		 * are missing in the user language. Will determine whether
		 * to display an info box with a call to action to translate.
		 *
		 * @return {boolean}
		 */
		hasMissingContent: function () {
			return (
				!this.functionName.isUserLang ||
				!this.functionDescription.isUserLang ||
				!this.inputFields.every( ( item ) => item.labelData.isUserLang )
			);
		}
	} ),
	methods: Object.assign( {}, mapActions( useMainStore, [
		'setVEFunctionParam',
		'setVEFunctionParamsValid',
		'fetchZids'
	] ), {
		/**
		 * Initializes the function input fields with the current Visual Editor function parameters.
		 */
		initializeInputFields: function () {
			this.inputFields = this.functionArguments.map( ( arg, index ) => ( {
				argumentKey: arg[ Constants.Z_ARGUMENT_KEY ],
				argumentType: arg[ Constants.Z_ARGUMENT_TYPE ],
				labelData: this.getLabelData( arg[ Constants.Z_ARGUMENT_KEY ] ),
				value: this.getVEFunctionParams[ index ]
			} ) );
		},
		/**
		 * Updates the value of a specific input field in the Visual Editor.
		 *
		 * @param {number} index - The index of the field to update.
		 * @param {string} value - The new value for the field.
		 */
		handleUpdate: function ( index, value ) {
			this.setVEFunctionParam( index, value );
		},
		/**
		 * Handles the validation event for a specific input field.
		 *
		 * @param {number} index - The index of the field to validate.
		 * @param {Object} payload
		 * @param {boolean} payload.isValid - The validation status.
		 * @param {string|undefined} payload.errorMessage - The error message to set, if any.
		 */
		handleValidation: function ( index, payload ) {
			const field = this.inputFields[ index ];
			if ( field ) {
				field.isValid = payload.isValid;
				field.errorMessage = payload.errorMessage;
			}
		},
		/**
		 * Fetches the ZIDs for all argument types.
		 * Show a loading state in VisualEditor while fetching.
		 *
		 * @param {Array} args - The list of function arguments.
		 */
		fetchArgumentTypes: function ( args ) {
			if ( args.length > 0 ) {
				this.$emit( 'loading-start' );

				const argumentTypes = args.map( ( arg ) => arg[ Constants.Z_ARGUMENT_TYPE ] );
				this.fetchZids( { zids: argumentTypes } )
					.then( () => {
						this.allArgumentsFetched = true;
					} )
					.finally( () => {
						this.$emit( 'loading-end' );
					} );
			}
		}
	} ),
	watch: {
		/**
		 * Watches the form validity and updates the VisualEditor validity state
		 * so the submit button can be enabled/disabled.
		 *
		 * @param {boolean} isValid - The form validity status.
		 */
		areInputFieldsValid: function ( isValid ) {
			this.setVEFunctionParamsValid( isValid );
			this.$emit( 'update' );
		},
		/**
		 * Watches the function arguments and fetches the ZIDs for the argument types.
		 * Do this immediately and when the arguments change.
		 */
		functionArguments: {
			immediate: true,
			handler: 'fetchArgumentTypes'
		}
	},
	mounted: function () {
		this.initializeInputFields();
	}
} );
</script>

<style lang="less">
@import '../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-function-input-setup {
	.ext-wikilambda-app-function-input-setup__body {
		background-color: @background-color-neutral-subtle;
		padding: @spacing-75 @spacing-100 @spacing-100;
	}

	.ext-wikilambda-app-function-input-setup__description {
		margin-top: @spacing-75;
		margin-bottom: @spacing-75;

		.ext-wikilambda-app-expandable-description__toggle-button {
			background-color: @background-color-neutral-subtle;

			&::before {
				background: linear-gradient( to right, transparent, @background-color-neutral-subtle );
			}
		}
	}

	.ext-wikilambda-app-function-input-setup__description--empty {
		margin-top: @spacing-75;
		margin-bottom: @spacing-75;
		color: @color-placeholder;
	}

	.ext-wikilambda-app-function-input-setup__footer {
		display: flex;
		background-color: @background-color-base;
		padding: @spacing-75 @spacing-100;
	}

	.ext-wikilambda-app-function-input-setup__link {
		margin-left: @spacing-25;

		& > a {
			font-weight: @font-weight-bold;
		}
	}
}
</style>
