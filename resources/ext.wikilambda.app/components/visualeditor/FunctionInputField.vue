<!--
	WikiLambda Vue component for Visual Editor Wikifunctions function call
	insertion and edit plugin: input field.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-app-function-input-field">
		<cdx-field
			:status="status"
			class="ext-wikilambda-app-function-input-field__field">
			<component
				:is="componentType"
				:value="modelValue"
				:input-type="inputType"
				:should-use-default-value="shouldUseDefaultValue"
				:has-default-value="hasDefaultValue"
				:default-value="getDefaultValue"
				@input="handleInput"
				@update="handleUpdate"
				@validate="handleValidation"
				@loading-start="$emit( 'loading-start' )"
				@loading-end="$emit( 'loading-end' )"
			></component>
			<template #label>
				<span
					v-if="!labelData.isUntitled"
					:lang="labelData.langCode"
					:dir="labelData.langDir"
				>{{ labelData.label }}</span>
				<span v-else class="ext-wikilambda-app-function-input-field__label--empty">
					{{ i18n( 'brackets',
						i18n( 'wikilambda-visualeditor-wikifunctionscall-no-input-label' ).text()
					).text() }}
				</span>
			</template>
			<template v-if="showValidation && !!error" #error>
				<wl-safe-message :error="error"></wl-safe-message>
			</template>
		</cdx-field>
		<wl-function-input-default-value-checkbox
			v-if="hasDefaultValue"
			class="ext-wikilambda-app-function-input-field__default-value-checkbox"
			:input-type="inputType"
			:is-checked="shouldUseDefaultValue"
			@update:is-checked="checkDefaultValue"
		></wl-function-input-default-value-checkbox>
	</div>
</template>

<script>
const { computed, defineComponent, inject, ref, onMounted } = require( 'vue' );

const Constants = require( '../../Constants.js' );
const useMainStore = require( '../../store/index.js' );
const LabelData = require( '../../store/classes/LabelData.js' );
const ErrorData = require( '../../store/classes/ErrorData.js' );

// Codex components
const { CdxField } = require( '../../../codex.js' );

// Fields components
const FunctionInputEnum = require( './fields/FunctionInputEnum.vue' );
const FunctionInputLanguage = require( './fields/FunctionInputLanguage.vue' );
const FunctionInputParser = require( './fields/FunctionInputParser.vue' );
const FunctionInputString = require( './fields/FunctionInputString.vue' );
const FunctionInputWikidata = require( './fields/FunctionInputWikidata.vue' );
const FunctionInputDefaultValueCheckbox = require( './FunctionInputDefaultValueCheckbox.vue' );

// Base components
const SafeMessage = require( '../base/SafeMessage.vue' );

module.exports = exports = defineComponent( {
	name: 'wl-function-input-field',
	components: {
		'cdx-field': CdxField,
		'wl-function-input-enum': FunctionInputEnum,
		'wl-function-input-language': FunctionInputLanguage,
		'wl-function-input-parser': FunctionInputParser,
		'wl-function-input-string': FunctionInputString,
		'wl-function-input-wikidata': FunctionInputWikidata,
		'wl-function-input-default-value-checkbox': FunctionInputDefaultValueCheckbox,
		'wl-safe-message': SafeMessage
	},
	props: {
		inputType: {
			type: String,
			required: true
		},
		labelData: {
			type: LabelData,
			default: undefined
		},
		modelValue: {
			type: String,
			required: false,
			default: ''
		},
		error: {
			type: ErrorData,
			required: false,
			default: undefined
		},
		showValidation: {
			type: Boolean,
			required: true
		}
	},
	emits: [ 'update', 'input', 'validate', 'update:modelValue', 'loading-start', 'loading-end' ],
	setup( props, { emit } ) {
		const i18n = inject( 'i18n' );
		const store = useMainStore();

		// Input type data
		/**
		 * Checks if the input type is an enumeration
		 *
		 * @return {boolean}
		 */
		const isEnum = computed( () => store.isEnumType( props.inputType ) );

		/**
		 * Check if the input has a parser and renderer
		 *
		 * @return {boolean}
		 */
		const hasParserFunction = computed( () => store.hasParser( props.inputType ) );

		// Component rendering
		/**
		 * Determine the component type based on the inputType
		 *
		 * @return {string}
		 */
		const componentType = computed( () => {
			// Check if there's a specific component configured for this input type
			const inputConfig = Constants.FUNCTION_INPUT_TYPE_CONFIG[ props.inputType ];
			if ( inputConfig && inputConfig.component ) {
				return inputConfig.component;
			}
			if ( isEnum.value ) {
				return 'wl-function-input-enum';
			}

			if ( hasParserFunction.value ) {
				return 'wl-function-input-parser';
			}

			// Default fallback
			return 'wl-function-input-string';
		} );

		// Field status
		/**
		 * Return the status of the field
		 *
		 * @return {string}
		 */
		const status = computed( () => props.showValidation && props.error ? 'error' : 'default' );

		// Event handlers
		/**
		 * Handle the update event
		 *
		 * @param {string} value
		 */
		function handleUpdate( value ) {
			emit( 'update', value );
		}

		/**
		 * Handle the input event
		 *
		 * @param {string} value
		 */
		function handleInput( value ) {
			emit( 'update:modelValue', value );
		}

		/**
		 * Handle the validate event
		 *
		 * @param {Object} payload
		 */
		function handleValidation( payload ) {
			emit( 'validate', payload );
		}

		// Default value feature
		// State
		const shouldUseDefaultValue = ref( false );

		// Data
		/**
		 * Whether this input type has a default value
		 *
		 * @return {boolean}
		 */
		const hasDefaultValue = computed( () => store.hasDefaultValueForType( props.inputType ) );

		/**
		 * Returns the default value for the input type.
		 *
		 * @return {string}
		 */
		const getDefaultValue = computed( () => store.getDefaultValueForType( props.inputType ) );

		// Actions
		/**
		 * Check the default value checkbox.
		 *
		 * @param {boolean} isChecked - Whether the checkbox is checked.
		 */
		function checkDefaultValue( isChecked ) {
			shouldUseDefaultValue.value = !!isChecked;

			// When checkbox is checked:
			// * we just assume the value is valid for simplicity
			// * set the field value to empty and emit it
			emit( 'validate', { isValid: !!isChecked } );
			emit( 'update:modelValue', '' );
			emit( 'update', '' );
		}

		/**
		 * Initialize shouldUseDefaultValue if field is empty and has a default value.
		 * Only auto-check the default value when editing an existing function, not when creating a new one.
		 * This only sets the internal state without emitting events - validation happens naturally through mounted.
		 */
		function initializeDefaultValue() {
			if ( !props.modelValue && store.hasDefaultValueForType( props.inputType ) && !store.isNewParameterSetup ) {
				shouldUseDefaultValue.value = true;
			}
		}

		// Lifecycle
		onMounted( () => {
			initializeDefaultValue();
		} );

		return {
			checkDefaultValue,
			componentType,
			getDefaultValue,
			hasDefaultValue,
			handleInput,
			handleUpdate,
			handleValidation,
			i18n,
			shouldUseDefaultValue,
			status
		};
	}
} );
</script>

<style lang="less">
@import '../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-function-input-field {
	margin-bottom: @spacing-50;

	.ext-wikilambda-app-function-input-field__label--empty {
		color: @color-placeholder;
	}

	.ext-wikilambda-app-function-input-field__default-value-checkbox {
		margin-top: @spacing-25;
	}
}
</style>
