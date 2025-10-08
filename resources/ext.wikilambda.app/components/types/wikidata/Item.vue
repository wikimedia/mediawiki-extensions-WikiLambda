<!--
	WikiLambda Vue component for Z6001/Wikidata Items.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div
		class="ext-wikilambda-app-wikidata-item"
		data-testid="wikidata-item">
		<div v-if="!edit" class="ext-wikilambda-app-wikidata-item__read">
			<cdx-icon
				:icon="wikidataIcon"
				class="ext-wikilambda-app-wikidata-item__wd-icon"
			></cdx-icon>
			<a
				v-if="itemLabelData"
				class="ext-wikilambda-app-wikidata-item__link"
				:href="itemUrl"
				:lang="itemLabelData.langCode"
				:dir="itemLabelData.langDir"
				target="_blank"
			>{{ itemLabelData.label }}</a>
		</div>
		<wl-wikidata-entity-selector
			v-else
			:entity-id="itemId"
			:entity-label="itemLabel"
			:type="itemType"
			@select-wikidata-entity="onSelect"
		></wl-wikidata-entity-selector>
	</div>
</template>

<script>
const { defineComponent, computed, watch, onMounted } = require( 'vue' );

const wikidataIconSvg = require( './wikidataIconSvg.js' );
const Constants = require( '../../../Constants.js' );
const useZObject = require( '../../../composables/useZObject.js' );
const useMainStore = require( '../../../store/index.js' );
const LabelData = require( '../../../store/classes/LabelData.js' );

// Wikidata components
const WikidataEntitySelector = require( './EntitySelector.vue' );
// Codex components
const { CdxIcon } = require( '../../../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'wl-wikidata-item',
	components: {
		'wl-wikidata-entity-selector': WikidataEntitySelector,
		'cdx-icon': CdxIcon
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
		// Use ZObject utilities composable
		const { getWikidataEntityId } = useZObject( { keyPath: props.keyPath } );

		// Use main store
		const store = useMainStore();

		// Data
		const wikidataIcon = wikidataIconSvg;
		const itemType = Constants.Z_WIKIDATA_ITEM;

		/**
		 * Returns the Wikidata Item Id string value, if any Item is selected.
		 *
		 * @return {string|undefined}
		 */
		const itemId = computed( () => getWikidataEntityId( props.objectValue, itemType ) );

		/**
		 * Returns the Wikidata URL for the selected Item.
		 *
		 * @return {string|undefined}
		 */
		const itemUrl = computed( () => store.getItemUrl( itemId.value ) );

		/**
		 * Returns the LabelData object for the selected Item.
		 *
		 * @return {LabelData|undefined}
		 */
		const itemLabelData = computed( () => store.getItemLabelData( itemId.value ) );

		/**
		 * Returns the string label of the selected Wikidata Item or
		 * an empty string if none is selected.
		 *
		 * @return {string}
		 */
		const itemLabel = computed( () => itemLabelData.value ? itemLabelData.value.label : '' );

		/**
		 * Emit a set-value event to persist in the store
		 * the changes made by a new wikidata entity selection,
		 * depending on whether the existing representation is
		 * a Wikidata reference or a Function call to a Wikidata
		 * fetch function.
		 *
		 * @param {string|null} value
		 */
		function onSelect( value ) {
			// If type is Wikidata Entity Reference:
			// * Set Reference Id
			// Else (type is Function Call):
			// * Set Reference Id of the Fetch Function Id argument
			const keyPath = ( props.type === Constants.Z_WIKIDATA_REFERENCE_ITEM ) ? [
				Constants.Z_WIKIDATA_REFERENCE_ITEM_ID,
				Constants.Z_STRING_VALUE
			] : [
				Constants.Z_WIKIDATA_FETCH_ITEM_ID,
				Constants.Z_WIKIDATA_REFERENCE_ITEM_ID,
				Constants.Z_STRING_VALUE
			];

			emit( 'set-value', {
				value: value || '',
				keyPath
			} );
		}

		// Watch itemId
		watch( itemId, ( id ) => {
			store.fetchItems( { ids: [ id ] } );
		} );

		// On mounted
		onMounted( () => {
			if ( itemId.value ) {
				store.fetchItems( { ids: [ itemId.value ] } );
			}
		} );

		return {
			itemId,
			itemLabel,
			itemLabelData,
			itemType,
			itemUrl,
			onSelect,
			wikidataIcon
		};
	}
} );
</script>

<style lang="less">
@import '../../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-wikidata-item {
	--line-height-current: calc( var( --line-height-medium ) * 1em );

	.ext-wikilambda-app-wikidata-item__read {
		display: flex;
		align-items: normal;
		min-height: @min-size-interactive-pointer;
		box-sizing: border-box;
		/* We calculate dynamically a different padding for each font size setting */
		padding-top: calc( calc( @min-size-interactive-pointer - var( --line-height-current ) ) / 2 );
	}

	.ext-wikilambda-app-wikidata-item__link {
		line-height: var( --line-height-current );
		word-break: break-word;
	}

	.ext-wikilambda-app-wikidata-item__wd-icon {
		margin: 0 @spacing-25;
		height: var( --line-height-current );
	}
}
</style>
