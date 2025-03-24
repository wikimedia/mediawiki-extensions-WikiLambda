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
			:argument-type="argumentType"
			:is-editing="isEditing"
			@input="handleInput"
			@update="handleUpdate"
			@validate="handleValidation"
		></component>
		<template #label>
			<span
				:lang="labelData.langCode"
				:dir="labelData.langDir"
			>{{ labelData.label }}</span>
		</template>
		<template v-if="!!errorMessage" #error>
			<!-- eslint-disable vue/no-v-html -->
			<span v-html="errorMessage"></span>
		</template>
	</cdx-field>
</template>

<script>
const { CdxField } = require( '../../../codex.js' );
const { defineComponent } = require( 'vue' );
const { mapState } = require( 'pinia' );
const useMainStore = require( '../../store/index.js' );
const FunctionInputEnum = require( './FunctionInputEnum.vue' );
const FunctionInputString = require( './FunctionInputString.vue' );

module.exports = exports = defineComponent( {
	name: 'wl-function-input-field',
	components: {
		'cdx-field': CdxField,
		'wl-function-input-enum': FunctionInputEnum,
		'wl-function-input-string': FunctionInputString
	},
	props: {
		argumentKey: {
			type: String,
			required: true
		},
		argumentType: {
			type: String,
			required: true
		},
		modelValue: {
			type: String,
			required: false,
			default: ''
		},
		isEditing: {
			type: Boolean,
			required: true
		},
		errorMessage: {
			type: String,
			required: false,
			default: ''
		}
	},
	emits: [ 'update', 'input', 'update:modelValue', 'validate' ],
	computed: Object.assign( {}, mapState( useMainStore, [
		'getLabelData',
		'isEnumType'
	] ), {
		/**
		 * Get the label data for the argument key.
		 *
		 * @return {Object}
		 */
		labelData: function () {
			return this.getLabelData( this.argumentKey );
		},
		/**
		 * Determine the component type based on the argumentType.
		 *
		 * @return {string}
		 */
		componentType: function () {
			if ( this.isEnumType( this.argumentType ) ) {
				return 'wl-function-input-enum';
			}
			// TODO (T387371) Implement types with parsers
			return 'wl-function-input-string';
		},
		/**
		 * Return the status of the field.
		 *
		 * @return {string}
		 */
		status: function () {
			return this.errorMessage ? 'error' : 'default';
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
		 * Handle the validate event and emit the error message
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
