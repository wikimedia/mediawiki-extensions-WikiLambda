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
const { computed, defineComponent, inject, onMounted } = require( 'vue' );

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
	emits: [ 'select-item' ],
	setup( props, { emit } ) {
		const i18n = inject( 'i18n' );
		const store = useMainStore();

		const selectConfig = {
			visibleItemLimit: 5
		};

		/**
		 * Returns a placeholder text for the select input.
		 *
		 * @return {string} The placeholder text.
		 */
		const placeholder = computed( () => i18n( 'wikilambda-typeselector-label' ).text() );

		/**
		 * Retrieves the value of the selected reference.
		 *
		 * @return {string|null} The selected reference value, or null if none is selected.
		 */
		const selectedValue = computed( () => props.selectedZid || null );

		/**
		 * Determines whether all Wikidata enum reference types have been fetched.
		 *
		 * @return {boolean} True if all enum reference types are fetched, false otherwise.
		 */
		const enumsFetched = computed( () => Object.keys( Constants.WIKIDATA_REFERENCE_TYPES )
			.map( ( k ) => Constants.WIKIDATA_REFERENCE_TYPES[ k ] )
			.every( ( zid ) => store.getStoredObject( zid ) ) );

		/**
		 * Retrieves an array of Wikidata enum reference values with their labels and IDs.
		 *
		 * @return {Array} An array of objects containing labels and values.
		 */
		const enumValues = computed( () => Object.keys( Constants.WIKIDATA_REFERENCE_TYPES )
			.map( ( k ) => Constants.WIKIDATA_REFERENCE_TYPES[ k ] )
			.map( ( zid ) => ( {
				label: store.getLabelData( zid ).label,
				value: zid
			} ) ) );

		/**
		 * Handles the selection of a value from the dropdown.
		 * Emits an event to update the parent component with the selected value.
		 *
		 * @param {string|null} value - The selected value from the dropdown.
		 */
		const onSelect = ( value ) => {
			// If the already selected value is selected again, exit early
			if ( selectedValue.value === value ) {
				return;
			}

			// If a new value is selected, emit the select event.
			emit( 'select-item', value || '' );
		};

		/**
		 * Fetches the Zids for the Wikidata enum reference types when the component is mounted.
		 */
		onMounted( () => {
			const references = Object.keys( Constants.WIKIDATA_REFERENCE_TYPES )
				.map( ( k ) => Constants.WIKIDATA_REFERENCE_TYPES[ k ] );
			store.fetchZids( { zids: references } );
		} );

		return {
			enumValues,
			enumsFetched,
			onSelect,
			placeholder,
			selectConfig,
			selectedValue
		};
	}
} );

</script>
