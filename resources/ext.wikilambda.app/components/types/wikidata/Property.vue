<!--
	WikiLambda Vue component for Z6002/Wikidata Properties.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div
		class="ext-wikilambda-app-wikidata-property"
		data-testid="wikidata-property">
		<template v-if="hasTerminalId">
			<div v-if="!edit" class="ext-wikilambda-app-wikidata-property__read">
				<cdx-icon
					class="ext-wikilambda-app-wikidata-property__wd-icon"
					:icon="wikidataIcon"
				></cdx-icon>
				<a
					v-if="propertyLabelData && propertyUrl"
					class="ext-wikilambda-app-wikidata-property__link"
					:href="propertyUrl"
					:lang="propertyLabelData.langCode"
					:dir="propertyLabelData.langDir"
					target="_blank"
				>{{ propertyLabelData.label }}</a>
				<!-- No link: value is not a valid Qid (unknown) -->
				<span
					v-else-if="propertyLabelData"
					class="ext-wikilambda-app-wikidata-property__unknown"
					:lang="propertyLabelData.langCode"
					:dir="propertyLabelData.langDir"
				>{{ propertyLabelData.label }}</span>
				<!-- No label: value is empty -->
				<span v-else class="ext-wikilambda-app-wikidata-property__empty">
					{{ i18n( 'wikilambda-wikidata-entity-empty-value-placeholder' ).text() }}
				</span>
			</div>
			<wl-wikidata-entity-selector
				v-else
				:entity-id="propertyId"
				:entity-label="propertyLabel"
				:type="propertyType"
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
	name: 'wl-wikidata-property',
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
		const { getWikidataEntityId } = useZObject( { keyPath: props.keyPath } );
		const store = useMainStore();

		const wikidataIcon = wikidataIconSvg;
		const propertyType = Constants.Z_WIKIDATA_PROPERTY;

		/**
		 * Returns the Wikidata Property Id string value if set, or empty string if unset.
		 * If the Id is not determined by a terminal string, returns undefined.
		 *
		 * @return {string|undefined}
		 */
		const propertyId = computed( () => getWikidataEntityId( props.objectValue, propertyType ) );

		/**
		 * Returns whether the Wikidata Entity Id is a terminal string.
		 * If it doesn't, the component will fallback to z-object-to-string so
		 * that it informs of the object content but doesn't show blank values or
		 * fields, and doesn't allow direct edit (e.g. requires previous expnsion)
		 *
		 * @return {boolean}
		 */
		const hasTerminalId = computed( () => typeof propertyId.value === 'string' );

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

		return {
			hasTerminalId,
			wikidataIcon,
			propertyType,
			propertyId,
			propertyUrl,
			propertyLabelData,
			propertyLabel,
			onSelect,
			i18n
		};
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

	.ext-wikilambda-app-wikidata-property__unknown {
		color: @color-subtle;
	}

	.ext-wikilambda-app-wikidata-property__empty {
		color: @color-placeholder;
		font-style: italic;
	}

	.ext-wikilambda-app-wikidata-property__wd-icon {
		margin: 0 @spacing-25;
		height: var( --line-height-current );
		flex-shrink: 0;
	}
}
</style>
