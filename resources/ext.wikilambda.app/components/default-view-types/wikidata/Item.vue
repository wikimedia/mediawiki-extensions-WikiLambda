<!--
	WikiLambda Vue component for Z6001/Wikidata Items.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-app-wikidata-item" data-testid="wikidata-item">
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
			:icon="wikidataIcon"
			:type="itemType"
			@select-wikidata-entity="onSelect"
		></wl-wikidata-entity-selector>
	</div>
</template>

<script>
const { defineComponent } = require( 'vue' );
const { CdxIcon } = require( '@wikimedia/codex' );
const Constants = require( '../../../Constants.js' ),
	LabelData = require( '../../../store/classes/LabelData.js' ),
	WikidataEntitySelector = require( './EntitySelector.vue' ),
	{ mapActions, mapGetters } = require( 'vuex' );

// TODO (T375206): Replace the hardcoded logo svg with the icon version in the Codex library
// After discussion with the Design Systems team, it's been agreed to use the Wikidata color icon
// contrary to the monocolor icons available in Codex. The reason for this is that Wikidata
// monocrome icon resembles a barcode instead of a Wikidata reference. Discussion on including color
// versions for project logos in the Codex icon library can be read in T374731.
const wikidataIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
  <path fill="#900" d="M0 16h.721V4H0v12Zm1.49 0H3.7V4H1.49v12ZM4.422 4v11.999h2.21V4h-2.21Z"/>
  <path fill="#396" d="M17.789 16h.72V4h-.72v12Zm1.49-12v12H20V4h-.721ZM7.378 16h.72V4h-.72v12Zm1.49-12v12h.721V4h-.721Z"/>
  <path fill="#069" d="M10.334 16h2.21V4h-2.21v12Zm2.932 0h.769V4h-.77v12Zm1.49-12v12h2.21V4h-2.21Z"/>
</svg>`;

module.exports = exports = defineComponent( {
	name: 'wl-wikidata-item',
	components: {
		'cdx-icon': CdxIcon,
		'wl-wikidata-entity-selector': WikidataEntitySelector
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
			wikidataIcon: wikidataIconSvg,
			itemType: Constants.Z_WIKIDATA_ITEM
		};
	},
	computed: Object.assign( mapGetters( [
		'getItemData',
		'getItemIdRow',
		'getUserLangCode',
		'getZStringTerminalValue'
	] ), {
		/**
		 * Returns the row where the Wikidata Item string Id value is.
		 * If the value is unset or unfound, returns undefined.
		 *
		 * @return {Object|undefined}
		 */
		itemIdRow: function () {
			return this.getItemIdRow( this.rowId );
		},
		/**
		 * Returns the Wikidata Item Id string value, if any Item is selected.
		 * Else returns null.
		 *
		 * @return {string|null}
		 */
		itemId: function () {
			return this.itemIdRow ?
				this.getZStringTerminalValue( this.itemIdRow.id ) || null :
				null;
		},
		/**
		 * Returns the Wikidata Item data object, if any Item is selected.
		 * Else returns undefined.
		 *
		 * @return {Object|undefined}
		 */
		itemData: function () {
			return this.getItemData( this.itemId );
		},
		/**
		 * Returns the Wikidata URL for the selected Item.
		 *
		 * @return {string|undefined}
		 */
		itemUrl: function () {
			return this.itemId ?
				`${ Constants.WIKIDATA_BASE_URL }/wiki/${ this.itemId }` :
				undefined;
		},
		/**
		 * Returns the LabelData object built from the available
		 * labels in the data object of the selected Wikidata Item.
		 * If an Item is selected but it has no labels, returns
		 * LabelData object with the Wikidata Item id as its label.
		 * If no Wikidata Item is selected, returns undefined.
		 *
		 * @return {LabelData|undefined}
		 */
		itemLabelData: function () {
			// If no selected item, return undefined
			if ( !this.itemId ) {
				return undefined;
			}
			// If no itemData yet, return item Id
			// Get best label from labels (if any)
			const langs = this.itemData ? Object.keys( this.itemData.labels || {} ) : {};
			if ( langs.length > 0 ) {
				const label = langs.includes( this.getUserLangCode ) ?
					this.itemData.labels[ this.getUserLangCode ] :
					this.itemData.labels[ langs[ 0 ] ];
				return new LabelData( this.itemId, label.value, null, label.language );
			}
			// Else, return item Id as label
			return new LabelData( this.itemId, this.itemId, null );
		},
		/**
		 * Returns the string label of the selected Wikidata Item or
		 * an empty string if none is selected.
		 *
		 * @return {string}
		 */
		itemLabel: function () {
			return this.itemLabelData ? this.itemLabelData.label : '';
		}
	} ),
	methods: Object.assign( mapActions( [
		'fetchItems'
	] ), {
		/**
		 * Emit a set-value event to persist in the store
		 * the changes made by a new wikidata entity selection,
		 * depending on whether the existing representation is
		 * a Wikidata reference or a Function call to a Wikidata
		 * fetch function.
		 *
		 * @param {string|null} value
		 */
		onSelect: function ( value ) {
			// If type is Wikidata Entity Reference:
			// * Set Reference Id
			// Else (type is Function Call):
			// * Set Reference Id of the Fetch Function Id argument
			const keyPath = ( this.type === Constants.Z_WIKIDATA_REFERENCE_ITEM ) ? [
				Constants.Z_WIKIDATA_REFERENCE_ITEM_ID,
				Constants.Z_STRING_VALUE
			] : [
				Constants.Z_WIKIDATA_FETCH_ITEM_ID,
				Constants.Z_WIKIDATA_REFERENCE_ITEM_ID,
				Constants.Z_STRING_VALUE
			];

			this.$emit( 'set-value', {
				value: value || '',
				keyPath
			} );
		}
	} ),
	watch: {
		itemId: function ( id ) {
			this.fetchItems( { ids: [ id ] } );
		},
		itemLabel: function ( label ) {
			this.inputValue = label;
		}
	},
	mounted: function () {
		this.inputValue = this.itemLabel;
		if ( this.itemId ) {
			this.fetchItems( { ids: [ this.itemId ] } );
		}
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

	.ext-wikilambda-app-wikidata-item__notation {
		margin-left: @spacing-25;
		color: @color-subtle;
	}

	.ext-wikilambda-app-wikidata-item__link {
		line-height: var( --line-height-current );
	}

	.ext-wikilambda-app-wikidata-item__wd-icon {
		margin: 0 @spacing-25;
		height: var( --line-height-current );
	}
}
</style>
