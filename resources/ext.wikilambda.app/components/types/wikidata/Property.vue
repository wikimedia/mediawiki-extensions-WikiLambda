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
const { computed, watch, onMounted } = require( 'vue' );

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
	name: 'wl-wikidata-property',
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
	emits: [ 'set-value' ],
	setup( props, { emit } ) {
		const { getWikidataEntityId } = useZObject( { keyPath: props.keyPath } );
		const store = useMainStore();

		const wikidataIcon = wikidataIconSvg;
		const propertyType = Constants.Z_WIKIDATA_PROPERTY;
		/**
		 * Returns the Wikidata Property Id string value, if any Property is selected.
		 * Else returns null.
		 *
		 * @return {string|null}
		 */
		const propertyId = computed( () => getWikidataEntityId( props.objectValue, propertyType ) );

		/**
		 * Returns the Wikidata URL for the selected Property.
		 *
		 * @return {string|undefined}
		 */
		const propertyUrl = computed( () => store.getPropertyUrl( propertyId.value ) );

		/**
		 * Returns the LabelData object for the selected Property.
		 *
		 * @return {LabelData|undefined}
		 */
		const propertyLabelData = computed( () => store.getPropertyLabelData( propertyId.value ) );

		/**
		 * Returns the string label of the selected Wikidata Property or
		 * an empty string if none is selected.
		 *
		 * @return {string}
		 */
		const propertyLabel = computed( () => propertyLabelData.value ? propertyLabelData.value.label : '' );

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
			const keyPath = ( props.type === Constants.Z_WIKIDATA_REFERENCE_PROPERTY ) ? [
				Constants.Z_WIKIDATA_REFERENCE_PROPERTY_ID,
				Constants.Z_STRING_VALUE
			] : [
				Constants.Z_WIKIDATA_FETCH_PROPERTY_ID,
				Constants.Z_WIKIDATA_REFERENCE_PROPERTY_ID,
				Constants.Z_STRING_VALUE
			];

			emit( 'set-value', { value: value || '', keyPath } );
		}

		watch( propertyId, ( id ) => {
			store.fetchProperties( { ids: [ id ] } );
		} );
		onMounted( () => {
			if ( propertyId.value ) {
				store.fetchProperties( { ids: [ propertyId.value ] } );
			}
		} );

		return { wikidataIcon, propertyType, propertyId, propertyUrl, propertyLabelData, propertyLabel, onSelect };
	}
} );
</script>

<style lang="less">
@import '../../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-wikidata-property {
	--line-height-current: calc( var( --line-height-content ) * 1em );

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
		word-break: break-word;
	}

	.ext-wikilambda-app-wikidata-property__wd-icon {
		margin: 0 @spacing-25;
		height: var( --line-height-current );
		flex-shrink: 0;
	}
}
</style>
