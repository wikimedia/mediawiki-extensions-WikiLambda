<!--
	WikiLambda Vue component for selection of Wikidata Reference types.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div
		class="ext-wikilambda-app-wikidata-reference-selector"
		data-testid="z-wikidata-reference-selector">
		<cdx-select
			:default-label="placeholder"
			:selected="selectedValue"
			:disabled="disabled || !enumsFetched"
			:menu-items="enumValues"
			:menu-config="selectConfig"
			data-testid="z-wikidata-enum-type-select"
			@update:selected="onSelect"
		></cdx-select>
	</div>
</template>

<script>
const { defineComponent } = require( 'vue' );
const { mapState, mapActions } = require( 'pinia' );

const Constants = require( '../../../Constants.js' );
const useMainStore = require( '../../../store/index.js' );

// Codex components
const { CdxSelect } = require( '../../../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'wl-wikidata-reference-selector',
	components: {
		'cdx-select': CdxSelect
	},
	props: {
		selectedZid: {
			type: String,
			default: ''
		},
		disabled: {
			type: Boolean,
			default: false
		}
	},
	data: function () {
		return {
			selectConfig: {
				visibleItemLimit: 5
			}
		};
	},
	computed: Object.assign( {}, mapState( useMainStore, [
		'getLabelData',
		'getStoredObject'
	] ), {
		/**
		 * Returns a placeholder text for the select input.
		 *
		 * @return {string} The placeholder text.
		 */
		placeholder: function () {
			return this.$i18n( 'wikilambda-typeselector-label' ).text();
		},
		/**
		 * Retrieves the value of the selected reference.
		 *
		 * @return {string|null} The selected reference value, or null if none is selected.
		 */
		selectedValue: function () {
			return this.selectedZid || null;
		},

		/**
		 * Determines whether all Wikidata enum reference types have been fetched.
		 *
		 * @return {boolean} True if all enum reference types are fetched, false otherwise.
		 */
		enumsFetched: function () {
			return Object.keys( Constants.WIKIDATA_REFERENCE_TYPES )
				.map( ( k ) => Constants.WIKIDATA_REFERENCE_TYPES[ k ] )
				.every( ( zid ) => this.getStoredObject( zid ) );
		},

		/**
		 * Retrieves an array of Wikidata enum reference values with their labels and IDs.
		 *
		 * @return {Array} An array of objects containing labels and values.
		 */
		enumValues: function () {
			return Object.keys( Constants.WIKIDATA_REFERENCE_TYPES )
				.map( ( k ) => Constants.WIKIDATA_REFERENCE_TYPES[ k ] )
				.map( ( zid ) => ( {
					label: this.getLabelData( zid ).label,
					value: zid
				} ) );
		}
	} ),
	methods: Object.assign( {}, mapActions( useMainStore, [
		'fetchZids'
	] ), {
		/**
		 * Handles the selection of a value from the dropdown.
		 * Emits an event to update the parent component with the selected value.
		 *
		 * @param {string|null} value - The selected value from the dropdown.
		 */
		onSelect: function ( value ) {
			// If the already selected value is selected again, exit early
			if ( this.selectedValue === value ) {
				this.inputValue = this.selectedLabel;
				return;
			}

			// If a new value is selected, emit the select event.
			// The parent component will respond to the event and update the selected value.
			this.$emit( 'select-item', value || '' );
		}
	} ),
	/**
	 * Fetches the Zids for the Wikidata enum reference types when the component is mounted.
	 */
	mounted: function () {
		const references = Object.keys( Constants.WIKIDATA_REFERENCE_TYPES )
			.map( ( k ) => Constants.WIKIDATA_REFERENCE_TYPES[ k ] );
		this.fetchZids( { zids: references } );
	}
} );

</script>
