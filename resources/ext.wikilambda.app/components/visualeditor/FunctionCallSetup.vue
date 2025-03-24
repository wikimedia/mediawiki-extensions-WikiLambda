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
const { defineComponent } = require( 'vue' );
const { mapActions, mapState } = require( 'pinia' );

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
	computed: Object.assign( {}, mapState( useMainStore, [
		'validateVEFunctionId',
		'getVEFunctionId',
		'getLabelData'
	] ), {
		/**
		 * Returns the function id as stored in wikitext,
		 * or null if function is not yet selected.
		 *
		 * @return {string|null}
		 */
		functionZid: function () {
			return this.getVEFunctionId;
		},
		/**
		 * Returns if function in wikitext is selected and properly
		 * configured (valid)
		 *
		 * @return {boolean}
		 */
		hasValidFunction: function () {
			return this.validateVEFunctionId;
		},
		/**
		 * Returns the LabelData object of the selected valid Function Id,
		 * or undefined if no valid Function is yet selected.
		 *
		 * @return {LabelData|undefined}
		 */
		functionLabelData: function () {
			return this.hasValidFunction ? this.getLabelData( this.functionZid ) : undefined;
		}
	} ),
	methods: Object.assign( {}, mapActions( useMainStore, [
		'setVEFunctionId'
	] ), {
		/**
		 * Set the wikitext function value with the new selected Function ID
		 *
		 * @param {string} value
		 */
		selectFunction: function ( value ) {
			this.setVEFunctionId( value );
		},
		/**
		 * When the function input values are updated,
		 * emit a 'function-inputs-updated' event to VisualEditor
		 * for the dialog "done" action button state to be updated.
		 */
		updateFunctionInputs: function () {
			this.$emit( 'function-inputs-updated' );
		},
		/**
		 * When we start loading, emit a 'loading-start' event to VisualEditor
		 * for the dialog to show a loading bar.
		 */
		startLoading: function () {
			this.$emit( 'loading-start' );
		},
		/**
		 * When we want to end loading, emit a 'loading-end' event to VisualEditor
		 * for the dialog to show a loading bar.
		 */
		endLoading: function () {
			this.$emit( 'loading-end' );
		}
	} ),
	watch: {
		/**
		 * When function updates and we have the new name,
		 * emit a 'function-updated' event to VisualEditor
		 * for the dialog title to be changed
		 *
		 * @param {LabelData} labelData
		 */
		functionLabelData: function ( labelData ) {
			this.$emit( 'function-name-updated', labelData ? labelData.label : undefined );
		}
	}
} );
</script>
