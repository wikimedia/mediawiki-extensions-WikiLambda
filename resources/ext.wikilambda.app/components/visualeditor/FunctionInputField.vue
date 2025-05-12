<!--
	WikiLambda Vue component for Visual Editor Wikifunctions function call
	insertion and edit plugin: input field.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<cdx-field
		:status="status"
		class="ext-wikilambda-app-function-input-field">
		<component
			:is="componentType"
			:value="modelValue"
			:input-type="inputType"
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
				{{ $i18n( 'brackets',
					$i18n( 'wikilambda-visualeditor-wikifunctionscall-no-input-label' ).text()
				).text() }}
			</span>
		</template>
		<template v-if="showValidation && !!errorMessage" #error>
			<!-- eslint-disable-next-line vue/no-v-html -->
			<span v-html="errorMessage"></span>
		</template>
	</cdx-field>
</template>

<script>
const { CdxField } = require( '../../../codex.js' );
const { defineComponent } = require( 'vue' );
const { mapState } = require( 'pinia' );
const useMainStore = require( '../../store/index.js' );
const LabelData = require( '../../store/classes/LabelData.js' );
const FunctionInputEnum = require( './FunctionInputEnum.vue' );
const FunctionInputParser = require( './FunctionInputParser.vue' );
const FunctionInputString = require( './FunctionInputString.vue' );

module.exports = exports = defineComponent( {
	name: 'wl-function-input-field',
	components: {
		'cdx-field': CdxField,
		'wl-function-input-enum': FunctionInputEnum,
		'wl-function-input-parser': FunctionInputParser,
		'wl-function-input-string': FunctionInputString
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
		errorMessage: {
			type: String,
			required: false,
			default: ''
		},
		showValidation: {
			type: Boolean,
			required: true
		}
	},
	emits: [ 'update', 'input', 'validate', 'update:modelValue', 'loading-start', 'loading-end' ],
	computed: Object.assign( {}, mapState( useMainStore, [
		'isEnumType',
		'hasParser'
	] ), {
		/**
		 * Determine the component type based on the inputType.
		 *
		 * @return {string}
		 */
		componentType: function () {
			if ( this.isEnum ) {
				return 'wl-function-input-enum';
			}
			if ( this.hasParserFunction ) {
				return 'wl-function-input-parser';
			}
			return 'wl-function-input-string';
		},
		/**
		 * Return the status of the field.
		 *
		 * @return {string}
		 */
		status: function () {
			return this.showValidation && this.errorMessage ? 'error' : 'default';
		},
		/**
		 * Checks if the input type is an enumeration.
		 *
		 * @return {boolean}
		 */
		isEnum: function () {
			return this.isEnumType( this.inputType );
		},
		/**
		 * Check if the input has a parser and renderer
		 *
		 * @return {boolean}
		 */
		hasParserFunction: function () {
			return this.hasParser( this.inputType );
		}
	} ),
	methods: {
		/**
		 * Handle the update event and emit the updated value.
		 *
		 * @param {string} value - The new value.
		 */
		handleUpdate: function ( value ) {
			this.$emit( 'update', value );
		},
		/**
		 * Handle the input event and emit the updated value.
		 *
		 * @param {string} value - The new value.
		 */
		handleInput: function ( value ) {
			this.$emit( 'update:modelValue', value );
		},
		/**
		 * Handle the validate event and emit the error message.
		 *
		 * @param {Object} payload
		 * @param {boolean} payload.isValid - The validation status.
		 * @param {string|undefined} payload.errorMessage - The error message.
		 */
		handleValidation: function ( payload ) {
			this.$emit( 'validate', payload );
		}
	}
} );
</script>

<style lang="less">
@import '../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-function-input-field {
	position: relative;

	.ext-wikilambda-app-function-input-field__label--empty {
		color: @color-placeholder;
	}
}
</style>
