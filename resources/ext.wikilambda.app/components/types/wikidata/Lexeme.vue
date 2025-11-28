<!--
	WikiLambda Vue component for Z6005/Wikidata Lexemes.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div
		class="ext-wikilambda-app-wikidata-lexeme"
		data-testid="wikidata-lexeme">
		<template v-if="hasTerminalId">
			<div v-if="!edit" class="ext-wikilambda-app-wikidata-lexeme__read">
				<cdx-icon
					class="ext-wikilambda-app-wikidata-lexeme__wd-icon"
					:icon="wikidataIcon"
				></cdx-icon>
				<a
					v-if="lexemeLabelData && lexemeUrl"
					class="ext-wikilambda-app-wikidata-lexeme__link"
					:href="lexemeUrl"
					:lang="lexemeLabelData.langCode"
					:dir="lexemeLabelData.langDir"
					target="_blank"
				>{{ lexemeLabelData.label }}</a>
				<!-- No link: value is not a valid Id (unknown) -->
				<span
					v-else-if="lexemeLabelData"
					class="ext-wikilambda-app-wikidata-lexeme__unknown"
					:lang="lexemeLabelData.langCode"
					:dir="lexemeLabelData.langDir"
				>{{ lexemeLabelData.label }}</span>
				<!-- No label: value is empty -->
				<span v-else class="ext-wikilambda-app-wikidata-lexeme__empty">
					{{ i18n( 'wikilambda-wikidata-entity-empty-value-placeholder' ).text() }}
				</span>
			</div>
			<wl-wikidata-entity-selector
				v-else
				:entity-id="lexemeId"
				:entity-label="lexemeLabel"
				:type="lexemeType"
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
const { defineComponent, inject, computed, watch, onMounted } = require( 'vue' );

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
	name: 'wl-wikidata-lexeme',
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
		const lexemeType = Constants.Z_WIKIDATA_LEXEME;

		/**
		 * Returns the Wikidata Lexeme Id string terminal value if set, or empty string if unset.
		 * If the Id is not determined by a terminal string, returns undefined.
		 *
		 * @return {string|undefined}
		 */
		const lexemeId = computed( () => getWikidataEntityId( props.objectValue, lexemeType ) );

		/**
		 * Returns whether the Wikidata Entity Id is a terminal string.
		 * If it doesn't, the component will fallback to z-object-to-string so
		 * that it informs of the object content but doesn't show blank values or
		 * fields, and doesn't allow direct edit (e.g. requires previous expnsion)
		 *
		 * @return {boolean}
		 */
		const hasTerminalId = computed( () => typeof lexemeId.value === 'string' );

		/**
		 * Returns the Wikidata URL for the selected Lexeme.
		 *
		 * @return {string|undefined}
		 */
		const lexemeUrl = computed( () => store.getLexemeUrl( lexemeId.value ) );

		/**
		 * Returns the LabelData object for the selected Lexeme.
		 *
		 * @return {LabelData|undefined}
		 */
		const lexemeLabelData = computed( () => store.getLexemeLabelData( lexemeId.value ) );

		/**
		 * Returns the string label of the selected Lexeme or
		 * an empty string if none is selected.
		 *
		 * @return {string}
		 */
		const lexemeLabel = computed( () => lexemeLabelData.value ? lexemeLabelData.value.label : '' );

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
			const keyPath = ( props.type === Constants.Z_WIKIDATA_REFERENCE_LEXEME ) ? [
				Constants.Z_WIKIDATA_REFERENCE_LEXEME_ID,
				Constants.Z_STRING_VALUE
			] : [
				Constants.Z_WIKIDATA_FETCH_LEXEME_ID,
				Constants.Z_WIKIDATA_REFERENCE_LEXEME_ID,
				Constants.Z_STRING_VALUE
			];

			emit( 'set-value', {
				value: value || '',
				keyPath
			} );
		}

		// Watch lexemeId
		watch( lexemeId, ( id ) => {
			if ( id ) {
				store.fetchLexemes( { ids: [ id ] } );
			}
		} );

		// On mounted
		onMounted( () => {
			if ( lexemeId.value ) {
				store.fetchLexemes( { ids: [ lexemeId.value ] } );
			}
		} );

		return {
			hasTerminalId,
			lexemeId,
			lexemeLabel,
			lexemeLabelData,
			lexemeType,
			lexemeUrl,
			onSelect,
			wikidataIcon,
			i18n
		};
	}
} );
</script>

<style lang="less">
@import '../../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-wikidata-lexeme {
	--line-height-current: calc( var( --line-height-content ) * 1em );

	.ext-wikilambda-app-wikidata-lexeme__read {
		display: flex;
		align-items: normal;
		min-height: @min-size-interactive-pointer;
		box-sizing: border-box;
		/* We calculate dynamically a different padding for each font size setting */
		padding-top: calc( calc( @min-size-interactive-pointer - var( --line-height-current ) ) / 2 );
	}

	.ext-wikilambda-app-wikidata-lexeme__link {
		line-height: var( --line-height-current );
		word-break: break-word;
	}

	.ext-wikilambda-app-wikidata-lexeme__unknown {
		color: @color-subtle;
	}

	.ext-wikilambda-app-wikidata-lexeme__empty {
		color: @color-placeholder;
		font-style: italic;
	}

	.ext-wikilambda-app-wikidata-lexeme__wd-icon {
		margin: 0 @spacing-25;
		height: var( --line-height-current );
		flex-shrink: 0;
	}
}
</style>
