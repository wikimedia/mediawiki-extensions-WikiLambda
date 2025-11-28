<!--
	WikiLambda Vue component for Z6001/Wikidata Items.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div
		class="ext-wikilambda-app-wikidata-item"
		data-testid="wikidata-item">
		<template v-if="hasTerminalId">
			<div v-if="!edit" class="ext-wikilambda-app-wikidata-item__read">
				<cdx-icon
					class="ext-wikilambda-app-wikidata-item__wd-icon"
					:icon="wikidataIcon"
				></cdx-icon>
				<a
					v-if="itemLabelData && itemUrl"
					class="ext-wikilambda-app-wikidata-item__link"
					:href="itemUrl"
					:lang="itemLabelData.langCode"
					:dir="itemLabelData.langDir"
					target="_blank"
				>{{ itemLabelData.label }}</a>
				<!-- No link: value is not a valid Qid (unknown) -->
				<span
					v-else-if="itemLabelData"
					class="ext-wikilambda-app-wikidata-item__unknown"
					:lang="itemLabelData.langCode"
					:dir="itemLabelData.langDir"
				>{{ itemLabelData.label }}</span>
				<!-- No label: value is empty -->
				<span v-else class="ext-wikilambda-app-wikidata-item__empty">
					{{ i18n( 'wikilambda-wikidata-entity-empty-value-placeholder' ).text() }}
				</span>
			</div>
			<wl-wikidata-entity-selector
				v-else
				:entity-id="itemId"
				:entity-label="itemLabel"
				:type="itemType"
				@select-wikidata-entity="onSelect"
			></wl-wikidata-entity-selector>
		</template>
		<wl-z-object-to-string
			v-else
			:key-path="keyPath"
			:object-value="objectValue"
			:edit="edit"
		></wl-z-object-to-string>
	</div>
</template>

<script>
const { defineComponent, computed, inject, watch, onMounted } = require( 'vue' );

const wikidataIconSvg = require( './wikidataIconSvg.js' );
const Constants = require( '../../../Constants.js' );
const useZObject = require( '../../../composables/useZObject.js' );
const useMainStore = require( '../../../store/index.js' );
const LabelData = require( '../../../store/classes/LabelData.js' );

// Wikidata components
const WikidataEntitySelector = require( './EntitySelector.vue' );
// Type components
const ZObjectToString = require( '../ZObjectToString.vue' );
// Codex components
const { CdxIcon } = require( '../../../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'wl-wikidata-item',
	components: {
		'wl-wikidata-entity-selector': WikidataEntitySelector,
		'wl-z-object-to-string': ZObjectToString,
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
	emits: [ 'set-value' ],
	setup( props, { emit } ) {
		const i18n = inject( 'i18n' );

		// Use ZObject utilities composable
		const { getWikidataEntityId } = useZObject( { keyPath: props.keyPath } );

		// Use main store
		const store = useMainStore();

		// Data
		const wikidataIcon = wikidataIconSvg;
		const itemType = Constants.Z_WIKIDATA_ITEM;

		/**
		 * Returns the Wikidata Item Id string terminal value if set, or empty string if unset.
		 * If the Id is not determined by a terminal string, returns undefined.
		 *
		 * @return {string|undefined}
		 */
		const itemId = computed( () => getWikidataEntityId( props.objectValue, itemType ) );

		/**
		 * Returns whether the Wikidata Entity Id is a terminal string.
		 * If it doesn't, the component will fallback to z-object-to-string so
		 * that it informs of the object content but doesn't show blank values or
		 * fields, and doesn't allow direct edit (e.g. requires previous expnsion)
		 *
		 * @return {boolean}
		 */
		const hasTerminalId = computed( () => typeof itemId.value === 'string' );

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
			hasTerminalId,
			itemId,
			itemLabel,
			itemLabelData,
			itemType,
			itemUrl,
			onSelect,
			wikidataIcon,
			i18n
		};
	}
} );
</script>

<style lang="less">
@import '../../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-wikidata-item {
	--line-height-current: calc( var( --line-height-content ) * 1em );

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

	.ext-wikilambda-app-wikidata-item__unknown {
		color: @color-subtle;
	}

	.ext-wikilambda-app-wikidata-item__empty {
		color: @color-placeholder;
		font-style: italic;
	}

	.ext-wikilambda-app-wikidata-item__wd-icon {
		margin: 0 @spacing-25;
		height: var( --line-height-current );
	}
}
</style>
