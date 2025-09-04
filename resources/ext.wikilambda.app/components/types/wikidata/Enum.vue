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
			:key-path="`${ keyPath }.${ selectedEntityKey }`"
			:object-value="objectValue[ selectedEntityKey ]"
			:edit="edit"
			:skip-key="true"
		></wl-z-object-key-value>
		<div v-else class="ext-wikilambda-app-wikidata-enum__select">
			<cdx-select
				:selected="selectedEntityId"
				:default-label="enumSelectPlaceholder"
				:menu-items="enumSelectMenuItems"
				:menu-config="enumSelectConfig"
				data-testid="wikidata-enum-select"
				@update:selected="onSelect"
			></cdx-select>
			<cdx-progress-indicator
				v-if="isLoading"
				class="ext-wikilambda-app-wikidata-enum__loader"
			>
				{{ $i18n( 'wikilambda-loading' ).text() }}
			</cdx-progress-indicator>
		</div>
	</div>
</template>

<script>
const { defineComponent } = require( 'vue' );
const { mapActions, mapState } = require( 'pinia' );

const Constants = require( '../../../Constants.js' );
const zobjectMixin = require( '../../../mixins/zobjectMixin.js' );
const useMainStore = require( '../../../store/index.js' );

// Codex components
const { CdxSelect, CdxProgressIndicator } = require( '../../../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'wl-wikidata-enum',
	components: {
		'cdx-select': CdxSelect,
		'cdx-progress-indicator': CdxProgressIndicator
	},
	mixins: [ zobjectMixin ],
	props: {
		keyPath: {
			type: String,
			required: true
		},
		objectValue: {
			type: Object,
			required: true
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
			},
			loadingCount: 0
		};
	},
	computed: Object.assign( {}, mapState( useMainStore, [
		'getTypeOfWikidataEnum',
		'getReferencesIdsOfWikidataEnum',
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
		 * Returns the key for the selected entity
		 * (key K1 of the wikidata enum type)
		 *
		 * @return {string}
		 */
		selectedEntityKey: function () {
			return `${ this.type }K1`;
		},
		/**
		 * Returns the terminal Wikidata Id of the selected entity, or undefined
		 * if nothing is selected yet.
		 * E.g. 'L313289'
		 *
		 * @return {string|null}
		 */
		selectedEntityId: function () {
			const selectedEntity = this.objectValue[ this.selectedEntityKey ];
			const simplifiedType = Constants.WIKIDATA_SIMPLIFIED_TYPES[ this.entityType ];
			return selectedEntity ?
				this.getWikidataEntityId( selectedEntity, simplifiedType ) || null :
				null;
		},
		/**
		 * Returns the placeholder text for the Wikidata enum selector.
		 * Falls back to a generic message if no type-specific placeholder is found.
		 *
		 * @return {string}
		 */
		enumSelectPlaceholder: function () {
			const type = Constants.WIKIDATA_SIMPLIFIED_TYPES[ this.entityType ];
			const msg = Constants.WIKIDATA_SELECTOR_PLACEHOLDER_MSG[ type ];
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
		},
		isLoading: function () {
			return this.loadingCount > 0;
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
			if ( !this.edit ) {
				return;
			}
			const promise = this.fetchWikidataEntitiesByType( { type: this.entityType, ids: this.wikidataIds } );
			if ( promise && typeof promise.then === 'function' ) {
				this.loadingCount++;
				promise.finally( () => {
					this.loadingCount = Math.max( 0, this.loadingCount - 1 );
				} );
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

<style lang="less">
@import '../../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-wikidata-enum {
	.ext-wikilambda-app-wikidata-enum__select {
		position: relative;
		display: flex;
		gap: @spacing-100;
		align-items: center;
	}
}
</style>
