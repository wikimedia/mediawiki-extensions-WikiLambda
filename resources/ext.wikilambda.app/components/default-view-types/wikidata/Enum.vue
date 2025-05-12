<!--
	WikiLambda Vue component for selecting a Z6095/Wikidata reference item.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div
		class="ext-wikilambda-app-wikidata-enum"
		data-testid="wikidata-enum"
	>
		<wl-z-object-key-value
			v-if="!edit"
			:row-id="selectedEntityRowId"
			:skip-key="true"
			:edit="false"
		></wl-z-object-key-value>
		<cdx-select
			v-else
			:selected="selectedEntityId"
			:default-label="enumSelectPlaceholder"
			:menu-items="enumSelectMenuItems"
			:menu-config="enumSelectConfig"
			data-testid="wikidata-enum-select"
			@update:selected="onSelect"
		></cdx-select>
	</div>
</template>

<script>
const { defineComponent } = require( 'vue' );
const { mapActions, mapState } = require( 'pinia' );
const Constants = require( '../../../Constants.js' );
const useMainStore = require( '../../../store/index.js' );
const { CdxSelect } = require( '../../../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'wl-wikidata-enum',
	components: {
		'cdx-select': CdxSelect
	},
	props: {
		rowId: {
			type: Number,
			required: false,
			default: 0
		},
		edit: {
			type: Boolean,
			required: true
		},
		type: {
			type: String,
			required: true
		}
	},
	data: function () {
		return {
			enumSelectConfig: {
				visibleItemLimit: 5
			}
		};
	},
	computed: Object.assign( {}, mapState( useMainStore, [
		'getTypeOfWikidataEnum',
		'getReferencesIdsOfWikidataEnum',
		'getRowByKeyPath',
		'getZStringTerminalValue',
		'getWikidataEntityLabelData'
	] ), {
		/**
		 * Returns the type of Wikidata entities of this enum type. It does that by
		 * getting the type object from the library store and returning its Z6884K1.
		 * Example: returns 'Z6095' for a Wikidata reference item enum.
		 *
		 * @return {string|undefined}
		 */
		entityType: function () {
			return this.getTypeOfWikidataEnum( this.type );
		},
		/**
		 * Returns the array of Wikidata entity Ids of this in enum type.
		 * It does that by getting the type object from the library store and
		 * returning the terminal values of its Z6884K2 key.
		 * E.g. [ 'L123', 'L345', 'L567' ]
		 *
		 * @return {Array<string>}
		 */
		wikidataIds: function () {
			return this.getReferencesIdsOfWikidataEnum( this.type );
		},
		/**
		 * Returns the rowId of the selected entity in the Wikidata enum
		 * (key K1 of the wikidata enum type)
		 *
		 * @return {number|undefined}
		 */
		selectedEntityRowId: function () {
			const selectedEntityKey = `${ this.type }K1`;
			const selectedEntityRow = this.getRowByKeyPath( [ selectedEntityKey ], this.rowId );
			return selectedEntityRow ? selectedEntityRow.id : undefined;
		},
		/**
		 * Returns the terminal Wikidata Id of the selected entity, or undefined
		 * if nothing is selected yet.
		 * E.g. 'L313289'
		 *
		 * @return {string|undefined}
		 */
		selectedEntityId: function () {
			const wikidataEntityKey = `${ this.entityType }K1`;
			const wikidataEntityRow = this.getRowByKeyPath( [ wikidataEntityKey ], this.selectedEntityRowId );
			return wikidataEntityRow ? this.getZStringTerminalValue( wikidataEntityRow.id ) : undefined;
		},
		/**
		 * Returns the placeholder text for the Wikidata enum selector.
		 * Falls back to a generic message if no type-specific placeholder is found.
		 *
		 * @return {string}
		 */
		enumSelectPlaceholder: function () {
			const msg = Constants.WIKIDATA_ENUM_PLACEHOLDER_MSG[ this.entityType ];
			// eslint-disable-next-line mediawiki/msg-doc
			return this.$i18n( msg || 'wikilambda-wikidata-entity-selector-placeholder' ).text();
		},
		/**
		 * Builds the menu items representing the available enum values.
		 * Each item contains a label (from Wikidata or the ID) and the Wikidata ID as value.
		 *
		 * @return {Array<{label: string, value: string}>}
		 */
		enumSelectMenuItems: function () {
			return this.wikidataIds.map( ( id ) => {
				const labelData = this.getWikidataEntityLabelData( this.entityType, id );
				return {
					label: labelData ? labelData.label : id,
					value: id
				};
			} );
		}
	} ),
	methods: Object.assign( mapActions( useMainStore, [
		'fetchWikidataEntitiesByType'
	] ), {
		/**
		 * Emit a set-value event to persist in the store
		 * the changes made by a new Wikidata enum selection.
		 *
		 * @param {string} value
		 */
		onSelect: function ( value ) {
			const keyPath = [
				`${ this.type }K1`,
				`${ this.entityType }K1`,
				Constants.Z_STRING_VALUE
			];
			this.$emit( 'set-value', {
				value,
				keyPath
			} );
		},
		/**
		 * Fetches all the Wikidata entities in the selector component (only for edit)
		 */
		fetchEntities: function () {
			if ( this.edit ) {
				this.fetchWikidataEntitiesByType( { type: this.entityType, ids: this.wikidataIds } );
			}
		}
	} ),
	watch: {
		wikidataIds: function () {
			this.fetchEntities();
		}
	},
	mounted: function () {
		this.fetchEntities();
	},
	beforeCreate: function () {
		this.$options.components[ 'wl-z-object-key-value' ] = require( './../ZObjectKeyValue.vue' );
	}
} );
</script>
