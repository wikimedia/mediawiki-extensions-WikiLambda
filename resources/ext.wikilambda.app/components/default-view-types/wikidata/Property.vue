<!--
	WikiLambda Vue component for Z6002/Wikidata Properties.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div
		class="ext-wikilambda-app-wikidata-property"
		data-testid="wikidata-property">
		<div v-if="!edit" class="ext-wikilambda-app-wikidata-property__read">
			<cdx-icon
				:icon="wikidataIcon"
				class="ext-wikilambda-app-wikidata-property__wd-icon"
			></cdx-icon>
			<a
				v-if="propertyLabelData"
				class="ext-wikilambda-app-wikidata-property__link"
				:href="propertyUrl"
				:lang="propertyLabelData.langCode"
				:dir="propertyLabelData.langDir"
				target="_blank"
			>{{ propertyLabelData.label }}</a>
		</div>
		<wl-wikidata-entity-selector
			v-else
			:entity-id="propertyId"
			:entity-label="propertyLabel"
			:type="propertyType"
			@select-wikidata-entity="onSelect"
		></wl-wikidata-entity-selector>
	</div>
</template>

<script>
const { defineComponent } = require( 'vue' );
const { mapActions, mapState } = require( 'pinia' );
const Constants = require( '../../../Constants.js' );
const useMainStore = require( '../../../store/index.js' );
const LabelData = require( '../../../store/classes/LabelData.js' );
const WikidataEntitySelector = require( './EntitySelector.vue' );
const { CdxIcon } = require( '../../../../codex.js' );
const wikidataIconSvg = require( './wikidataIconSvg.js' );

module.exports = exports = defineComponent( {
	name: 'wl-wikidata-property',
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
			propertyType: Constants.Z_WIKIDATA_PROPERTY
		};
	},
	computed: Object.assign( {}, mapState( useMainStore, [
		'getPropertyData',
		'getPropertyId',
		'getUserLangCode',
		'getPropertyUrl'
	] ), {
		/**
		 * Returns the Wikidata Property Id string value, if any Property is selected.
		 * Else returns null.
		 *
		 * @return {string|null}
		 */
		propertyId: function () {
			return this.getPropertyId( this.rowId );
		},
		/**
		 * Returns the Wikidata Property data object, if any Property is selected.
		 * Else returns undefined.
		 *
		 * @return {Object|undefined}
		 */
		propertyData: function () {
			return this.getPropertyData( this.propertyId );
		},
		/**
		 * Returns the Wikidata URL for the selected Property.
		 *
		 * @return {string|undefined}
		 */
		propertyUrl: function () {
			return this.getPropertyUrl( this.propertyId );
		},
		/**
		 * Returns the LabelData object built from the available
		 * labels in the data object of the selected Wikidata Property.
		 * If an Property is selected but it has no labels, returns
		 * LabelData object with the Wikidata Property id as its label.
		 * If no Wikidata Property is selected, returns undefined.
		 *
		 * @return {LabelData|undefined}
		 */
		propertyLabelData: function () {
			// If no selected property, return undefined
			if ( !this.propertyId ) {
				return undefined;
			}
			// If no propertyData yet, return property Id
			// Get best label from labels (if any)
			const langs = this.propertyData ? Object.keys( this.propertyData.labels || {} ) : {};
			if ( langs.length > 0 ) {
				const label = langs.includes( this.getUserLangCode ) ?
					this.propertyData.labels[ this.getUserLangCode ] :
					this.propertyData.labels[ langs[ 0 ] ];
				return new LabelData( this.propertyId, label.value, null, label.language );
			}
			// Else, return property Id as label
			return new LabelData( this.propertyId, this.propertyId, null );
		},
		/**
		 * Returns the string label of the selected Wikidata Property or
		 * an empty string if none is selected.
		 *
		 * @return {string}
		 */
		propertyLabel: function () {
			return this.propertyLabelData ? this.propertyLabelData.label : '';
		}
	} ),
	methods: Object.assign( {}, mapActions( useMainStore, [
		'fetchProperties'
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
			// If type is Wikidata Reference:
			// * Set Reference Id
			// Else (type is Function Call):
			// * Set Reference Id of the Fetch Function Id argument
			const keyPath = ( this.type === Constants.Z_WIKIDATA_REFERENCE_PROPERTY ) ? [
				Constants.Z_WIKIDATA_REFERENCE_PROPERTY_ID,
				Constants.Z_STRING_VALUE
			] : [
				Constants.Z_WIKIDATA_FETCH_PROPERTY_ID,
				Constants.Z_WIKIDATA_REFERENCE_PROPERTY_ID,
				Constants.Z_STRING_VALUE
			];

			this.$emit( 'set-value', {
				value: value || '',
				keyPath
			} );
		}
	} ),
	watch: {
		propertyId: function ( id ) {
			this.fetchProperties( { ids: [ id ] } );
		},
		propertyLabel: function ( label ) {
			this.inputValue = label;
		}
	},
	mounted: function () {
		this.inputValue = this.propertyLabel;
		if ( this.propertyId ) {
			this.fetchProperties( { ids: [ this.propertyId ] } );
		}
	}
} );
</script>

<style lang="less">
@import '../../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-wikidata-property {
	--line-height-current: calc( var( --line-height-medium ) * 1em );

	.ext-wikilambda-app-wikidata-property__read {
		display: flex;
		align-items: normal;
		min-height: @min-size-interactive-pointer;
		box-sizing: border-box;
		/* We calculate dynamically a different padding for each font size setting */
		padding-top: calc( calc( @min-size-interactive-pointer - var( --line-height-current ) ) / 2 );
	}

	.ext-wikilambda-app-wikidata-property__link {
		line-height: var( --line-height-current );
	}

	.ext-wikilambda-app-wikidata-property__wd-icon {
		margin: 0 @spacing-25;
		height: var( --line-height-current );
	}
}
</style>
