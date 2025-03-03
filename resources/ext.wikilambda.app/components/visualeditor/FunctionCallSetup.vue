<!--
	WikiLambda Vue component for Visual Editor Wikifunctions function call
	insertion and edit plugin.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-app-function-call-setup">
		<wl-function-select
			v-if="!hasSelectedFunction"
			@select="selectFunction"
		></wl-function-select>
		<wl-function-input-setup
			v-else
			@update="updateFunctionInputs"
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
	computed: Object.assign( {}, mapState( useMainStore, [
		'getVEFunctionId',
		'getLabelData'
	] ), {
		/**
		 * FIXME doc
		 *
		 * @return {string}
		 */
		functionZid: function () {
			return this.getVEFunctionId;
		},
		/**
		 * FIXME doc
		 *
		 * @return {LabelData}
		 */
		functionLabelData: function () {
			return this.getLabelData( this.functionZid );
		},
		/**
		 * FIXME doc
		 *
		 * @return {boolean}
		 */
		hasSelectedFunction: function () {
			return !!this.functionZid;
		}
	} ),
	methods: Object.assign( {}, mapActions( useMainStore, [
		'setVEFunctionId'
	] ), {
		/**
		 * FIXME doc
		 *
		 * @param {string} value
		 */
		selectFunction: function ( value ) {
			this.setVEFunctionId( value );
		},
		/**
		 * FIXME doc
		 */
		updateFunctionInputs: function () {
			this.$emit( 'function-inputs-updated' );
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
