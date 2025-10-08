<!--
	WikiLambda Vue component for Visual Editor Wikifunctions function call
	insertion and edit plugin.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-app-function-input-setup">
		<wl-function-input-preview
			v-if="allTypesFetched"
			:payload="areInputFieldsValid ? functionCallPayload : undefined">
		</wl-function-input-preview>
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
				{{ i18n( 'brackets',
					i18n( 'wikilambda-visualeditor-wikifunctionscall-no-description' ).text()
				).text() }}
			</p>
			<div v-if="allTypesFetched" class="ext-wikilambda-app-function-input-setup__fields">
				<wl-function-input-field
					v-for="( field, index ) in inputFields"
					:key="field.inputKey"
					v-model="field.value"
					:input-type="field.inputType"
					:label-data="field.labelData"
					:error="field.error"
					:show-validation="showValidation( field.hasChanged )"
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
const { computed, defineComponent, inject, onMounted, ref, watch } = require( 'vue' );
const useMainStore = require( '../../store/index.js' );
const Constants = require( '../../Constants.js' );
const FunctionInputField = require( './FunctionInputField.vue' );
const ExpandableDescription = require( './ExpandableDescription.vue' );
const FunctionInputPreview = require( './FunctionInputPreview.vue' );
const wikifunctionsIconSvg = require( './wikifunctionsIconSvg.js' );

module.exports = exports = defineComponent( {
	name: 'wl-function-input-setup',
	components: {
		'wl-function-input-field': FunctionInputField,
		'wl-expandable-description': ExpandableDescription,
		'wl-function-input-preview': FunctionInputPreview,
		'cdx-icon': CdxIcon,
		'cdx-message': CdxMessage
	},
	emits: [ 'update', 'loading-start', 'loading-end' ],
	setup( _, { emit } ) {
		const i18n = inject( 'i18n' );
		const store = useMainStore();

		// Reactive data
		const icon = wikifunctionsIconSvg;
		const inputFields = ref( [] );
		const allTypesFetched = ref( false );

		/**
		 * Returns the VisualEditor function ID.
		 *
		 * @return {string}
		 */
		const functionZid = computed( () => store.getVEFunctionId );

		/**
		 * Returns the text for the link to the function in Wikifunctions.
		 *
		 * @return {string}
		 */
		const functionLink = computed( () => i18n(
			'wikilambda-visualeditor-wikifunctionscall-dialog-function-link-footer',
			functionZid.value
		).parse() );

		/**
		 * Returns the message notifying about missing content in the user language
		 * with a link to the Wikifunctions page for the function.
		 *
		 * @return {string}
		 */
		const missingContentMsg = computed( () => i18n(
			'wikilambda-visualeditor-wikifunctionscall-info-missing-content',
			functionZid.value
		).parse() );

		/**
		 * Returns the LabelData object for the function name
		 *
		 * @return {LabelData}
		 */
		const functionName = computed( () => store.getLabelData( functionZid.value ) );

		/**
		 * Returns the description of the function.
		 *
		 * @return {LabelData}
		 */
		const functionDescription = computed( () => store.getDescription( functionZid.value ) );

		/**
		 * Returns the inputs of the function.
		 *
		 * @return {Array}
		 */
		const functionInputs = computed( () => store.getInputsOfFunctionZid( functionZid.value ) );

		/**
		 * Returns the output type of the function.
		 *
		 * @return {string}
		 */
		const functionOutputType = computed( () => store.getOutputTypeOfFunctionZid( functionZid.value ) );

		/**
		 * Prepares the payload for the function call.
		 *
		 * @return {Object} - The payload object.
		 */
		const functionCallPayload = computed( () => ( {
			functionZid: store.getVEFunctionId,
			params: functionInputs.value.map( ( arg, index ) => ( {
				type: arg[ Constants.Z_ARGUMENT_TYPE ],
				value: store.getVEFunctionParams[ index ]
			} ) )
		} ) );

		/**
		 * Checks if all input fields are valid.
		 *
		 * @return {boolean} - True if all fields are valid, otherwise false.
		 */
		const areInputFieldsValid = computed( () => inputFields.value.every( ( field ) => field.isValid ) );

		/**
		 * Returns whether any of the shown multilingual labels
		 * are missing in the user language. Will determine whether
		 * to display an info box with a call to action to translate.
		 *
		 * @return {boolean}
		 */
		const hasMissingContent = computed( () => (
			!functionName.value || !functionName.value.isUserLang ||
			!functionDescription.value || !functionDescription.value.isUserLang ||
			!inputFields.value.every( ( item ) => item.labelData.isUserLang )
		) );

		/**
		 * Initializes the function input fields with the current Visual Editor function params.
		 */
		function initializeInputFields() {
			// Ensure veFunctionParams is at least as long as functionInputs
			if ( functionInputs.value.length > store.getVEFunctionParams.length ) {
				for ( let i = store.getVEFunctionParams.length; i < functionInputs.value.length; i++ ) {
					store.setVEFunctionParam( i, '' );
				}
			}

			// Set local inputFields array
			inputFields.value = functionInputs.value.map( ( arg, index ) => ( {
				inputKey: arg[ Constants.Z_ARGUMENT_KEY ],
				inputType: arg[ Constants.Z_ARGUMENT_TYPE ],
				labelData: store.getLabelData( arg[ Constants.Z_ARGUMENT_KEY ] ),
				value: store.getVEFunctionParams[ index ],
				hasChanged: false
			} ) );
		}

		/**
		 * Updates the value of a specific input field in the Visual Editor.
		 *
		 * @param {number} index - The index of the field to update.
		 * @param {string} value - The new value for the field.
		 */
		function handleUpdate( index, value ) {
			inputFields.value[ index ].hasChanged = true;
			store.setVEFunctionParam( index, value );
			store.setVEFunctionParamsDirty();
			emit( 'update' );
		}

		/**
		 * Handles the validation event for a specific input field.
		 *
		 * Fields are validated even when the validation result doesn't
		 * need to be shown, so the isValid field is always present
		 * in every field object, and the veFunctionParamsValid store
		 * flag is always updated with the validity of the form.
		 *
		 * @param {number} index - The index of the field to validate.
		 * @param {Object} payload
		 * @param {boolean} payload.isValid - The validation status.
		 * @param {string|undefined} payload.error - The error message to set, if any.
		 */
		function handleValidation( index, payload ) {
			inputFields.value[ index ].isValid = payload.isValid;
			inputFields.value[ index ].error = payload.error;
		}

		/**
		 * Fetches the ZIDs for all input types and the output type.
		 * Show a loading state in VisualEditor while fetching.
		 *
		 * @param {Array} inputs - The list of function inputs.
		 * @param {string} outputType - The output type of the function.
		 */
		function fetchInputAndOutputTypes( inputs, outputType ) {
			const zidsToFetch = [
				...inputs.map( ( arg ) => arg[ Constants.Z_ARGUMENT_TYPE ] ),
				outputType
			];

			if ( zidsToFetch.length > 0 ) {
				emit( 'loading-start' );

				store.fetchZids( { zids: zidsToFetch } )
					.then( () => {
						allTypesFetched.value = true;
					} )
					.finally( () => {
						emit( 'loading-end' );
					} );
			}
		}

		/**
		 * Show validation message if:
		 * * is not a new parameter setup screen (initialized with values)
		 * * is blank param screen and the field has changed
		 *
		 * @param {boolean} hasChanged
		 * @return {boolean}
		 */
		function showValidation( hasChanged ) {
			return !store.isNewParameterSetup || hasChanged;
		}

		// Watchers
		/**
		 * Watches the form validity and updates the VisualEditor validity state
		 * so the submit button can be enabled/disabled depending on the state.
		 *
		 * @param {boolean} isValid - The form validity status.
		 */
		watch( areInputFieldsValid, ( isValid ) => {
			store.setVEFunctionParamsValid( isValid );
			emit( 'update' );
		} );

		/**
		 * Watches the function inputs and output type, and fetches the ZIDs for both.
		 * Do this immediately and when the inputs or output type change.
		 */
		watch( functionInputs, ( newInputs ) => {
			fetchInputAndOutputTypes( newInputs, functionOutputType.value );
		}, { immediate: true } );

		watch( functionOutputType, ( newOutputType ) => {
			fetchInputAndOutputTypes( functionInputs.value, newOutputType );
		}, { immediate: true } );

		// Lifecycle
		onMounted( () => {
			initializeInputFields();
			// Fetch language zid for content page
			const langCode = mw.config.get( 'wgContentLanguage' );
			store.fetchLanguageCode( langCode );
		} );

		return {
			allTypesFetched,
			areInputFieldsValid,
			functionCallPayload,
			functionDescription,
			functionLink,
			handleUpdate,
			handleValidation,
			hasMissingContent,
			icon,
			inputFields,
			missingContentMsg,
			showValidation,
			i18n
		};
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
