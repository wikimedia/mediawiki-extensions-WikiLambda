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
				{{ i18n( 'wikilambda-loading' ).text() }}
			</cdx-progress-indicator>
		</div>
	</div>
</template>

<script>
const { computed, defineComponent, inject, onMounted, ref, watch } = require( 'vue' );

const Constants = require( '../../../Constants.js' );
const useZObject = require( '../../../composables/useZObject.js' );
const useMainStore = require( '../../../store/index.js' );

// Codex components
const { CdxSelect, CdxProgressIndicator } = require( '../../../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'wl-wikidata-enum',
	components: {
		'cdx-select': CdxSelect,
		'cdx-progress-indicator': CdxProgressIndicator
	},

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
	setup( props, { emit } ) {
		const i18n = inject( 'i18n' );

		const { getWikidataEntityId } = useZObject( { keyPath: props.keyPath } );
		const store = useMainStore();

		// Reactive data
		const enumSelectConfig = { visibleItemLimit: 5 };
		const loadingCount = ref( 0 );

		// Computed properties
		/**
		 * Returns the type of Wikidata entities of this enum type. It does that by
		 * getting the type object from the library store and returning its Z6884K1.
		 * Example: returns 'Z6095' for a Wikidata reference item enum.
		 *
		 * @return {string|undefined}
		 */
		const entityType = computed( () => store.getTypeOfWikidataEnum( props.type ) );

		/**
		 * Returns the array of Wikidata entity Ids of this in enum type.
		 * It does that by getting the type object from the library store and
		 * returning the terminal values of its Z6884K2 key.
		 * E.g. [ 'L123', 'L345', 'L567' ]
		 *
		 * @return {Array<string>}
		 */
		const wikidataIds = computed( () => store.getReferencesIdsOfWikidataEnum( props.type ) );

		/**
		 * Returns the key for the selected entity
		 * (key K1 of the wikidata enum type)
		 *
		 * @return {string}
		 */
		const selectedEntityKey = computed( () => `${ props.type }K1` );

		/**
		 * Returns the terminal Wikidata Id of the selected entity, or undefined
		 * if nothing is selected yet.
		 * E.g. 'L313289'
		 *
		 * @return {string|null}
		 */
		const selectedEntityId = computed( () => {
			const selectedEntity = props.objectValue[ selectedEntityKey.value ];
			const simplifiedType = Constants.WIKIDATA_SIMPLIFIED_TYPES[ entityType.value ];
			return selectedEntity ?
				getWikidataEntityId( selectedEntity, simplifiedType ) || null :
				null;
		} );

		/**
		 * Returns the placeholder text for the Wikidata enum selector.
		 * Falls back to a generic message if no type-specific placeholder is found.
		 *
		 * @return {string}
		 */
		const enumSelectPlaceholder = computed( () => {
			const type = Constants.WIKIDATA_SIMPLIFIED_TYPES[ entityType.value ];
			const msg = Constants.WIKIDATA_SELECTOR_PLACEHOLDER_MSG[ type ];

			return i18n( msg || 'wikilambda-wikidata-entity-selector-placeholder' ).text();
		} );

		/**
		 * Builds the menu items representing the available enum values.
		 * Each item contains a label (from Wikidata or the ID) and the Wikidata ID as value.
		 *
		 * @return {Array<{label: string, value: string}>}
		 */
		const enumSelectMenuItems = computed( () => wikidataIds.value.map( ( id ) => {
			const labelData = store.getWikidataEntityLabelData( entityType.value, id );
			return {
				label: labelData ? labelData.label : id,
				value: id
			};
		} ) );

		/**
		 * Returns true if currently loading Wikidata entities.
		 *
		 * @return {boolean}
		 */
		const isLoading = computed( () => loadingCount.value > 0 );

		/**
		 * Emit a set-value event to persist in the store
		 * the changes made by a new Wikidata enum selection.
		 *
		 * @param {string} value
		 */
		function onSelect( value ) {
			const keyPath = [
				`${ props.type }K1`,
				`${ entityType.value }K1`,
				Constants.Z_STRING_VALUE
			];
			emit( 'set-value', { value, keyPath } );
		}

		/**
		 * Fetches all the Wikidata entities in the selector component (only for edit)
		 */
		function fetchEntities() {
			if ( !props.edit ) {
				return;
			}
			const promise = store.fetchWikidataEntitiesByType( {
				type: entityType.value,
				ids: wikidataIds.value
			} );
			if ( promise && typeof promise.then === 'function' ) {
				loadingCount.value++;
				promise.finally( () => {
					loadingCount.value = Math.max( 0, loadingCount.value - 1 );
				} );
			}
		}

		// Watchers
		watch( wikidataIds, () => {
			fetchEntities();
		} );

		// Lifecycle
		onMounted( () => {
			fetchEntities();
		} );

		return {
			enumSelectConfig,
			enumSelectMenuItems,
			enumSelectPlaceholder,
			isLoading,
			onSelect,
			selectedEntityId,
			selectedEntityKey,
			i18n
		};
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
