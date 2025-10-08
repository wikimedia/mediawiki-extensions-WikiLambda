<!--
	WikiLambda Vue component for Visual Editor Wikifunctions function call
	insertion and edit plugin.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-app-function-call-setup">
		<wl-function-select
			v-if="!hasValidFunction"
			ref="functionSelectComponent"
			@select="selectFunction"
		></wl-function-select>
		<wl-function-input-setup
			v-else
			@update="updateFunctionInputs"
			@loading-start="startLoading"
			@loading-end="endLoading"
		></wl-function-input-setup>
	</div>
</template>

<script>
const { computed, defineComponent, inject, ref, watch } = require( 'vue' );

const useMainStore = require( '../../store/index.js' );
const FunctionSelect = require( './FunctionSelect.vue' );
const FunctionInputSetup = require( './FunctionInputSetup.vue' );

module.exports = exports = defineComponent( {
	name: 'wl-function-call-setup',
	components: {
		'wl-function-select': FunctionSelect,
		'wl-function-input-setup': FunctionInputSetup
	},
	emits: [ 'function-inputs-updated', 'function-name-updated', 'loading-start', 'loading-end' ],
	setup( _, { emit } ) {
		const i18n = inject( 'i18n' );
		const store = useMainStore();

		const functionSelectComponent = ref( null );

		/**
		 * Returns the function id as stored in wikitext,
		 * or null if function is not yet selected.
		 *
		 * @return {string|null}
		 */
		const functionZid = computed( () => store.getVEFunctionId );

		/**
		 * Returns if function in wikitext is selected and properly
		 * configured (valid)
		 *
		 * @return {boolean}
		 */
		const hasValidFunction = computed( () => store.validateVEFunctionId );

		/**
		 * Returns the LabelData object of the selected valid Function Id,
		 * or undefined if no valid Function is yet selected.
		 *
		 * @return {LabelData|undefined}
		 */
		const functionLabelData = computed( () => hasValidFunction.value ?
			store.getLabelData( functionZid.value ) :
			undefined );

		/**
		 * Set the wikitext function value with the new selected Function ID
		 * Set function params to blank state
		 *
		 * @param {string} value
		 */
		const selectFunction = ( value ) => {
			store.setVEFunctionId( value );
			store.setVEFunctionParams();
		};

		/**
		 * When the function input values are updated,
		 * emit a 'function-inputs-updated' event to VisualEditor
		 */
		const updateFunctionInputs = () => {
			emit( 'function-inputs-updated' );
		};

		/**
		 * When we start loading, emit a 'loading-start' event to VisualEditor
		 */
		const startLoading = () => {
			emit( 'loading-start' );
		};

		/**
		 * When we want to end loading, emit a 'loading-end' event to VisualEditor
		 */
		const endLoading = () => {
			emit( 'loading-end' );
		};

		/**
		 * When function updates and we have the new name,
		 * emit a 'function-name-updated' event to VisualEditor
		 */
		watch( functionLabelData, ( labelData ) => {
			const newTitle = ( labelData && !labelData.isUntitled ) ? labelData.label :
				i18n( 'brackets', i18n( 'wikilambda-visualeditor-wikifunctionscall-no-name' ).text() ).text();
			if ( functionZid.value ) {
				emit( 'function-name-updated', newTitle );
			}
		} );

		return {
			endLoading,
			functionSelectComponent,
			hasValidFunction,
			selectFunction,
			startLoading,
			updateFunctionInputs
		};
	}
} );
</script>
