<!--
	WikiLambda Vue component for Z6006/Wikidata Lexeme Sense objects.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div
		class="ext-wikilambda-app-wikidata-lexeme-sense"
		data-testid="wikidata-lexeme-sense">
		<template v-if="hasTerminalId">
			<div v-if="!edit" class="ext-wikilambda-app-wikidata-lexeme-sense__read">
				<cdx-icon
					class="ext-wikilambda-app-wikidata-lexeme-sense__wd-icon"
					:icon="wikidataIcon"
				></cdx-icon>
				<a
					v-if="lexemeSenseLabelData && lexemeSenseUrl"
					class="ext-wikilambda-app-wikidata-lexeme-sense__link"
					:href="lexemeSenseUrl"
					:lang="lexemeSenseLabelData.langCode"
					:dir="lexemeSenseLabelData.langDir"
					target="_blank"
				>{{ lexemeSenseLabelData.label }}</a>
				<!-- No link: value is not a valid Qid (unknown) -->
				<span
					v-else-if="lexemeSenseLabelData"
					class="ext-wikilambda-app-wikidata-lexeme-sense__unknown"
					:lang="lexemeSenseLabelData.langCode"
					:dir="lexemeSenseLabelData.langDir"
				>{{ lexemeSenseLabelData.label }}</span>
				<!-- No label: value is empty -->
				<span v-else class="ext-wikilambda-app-wikidata-lexeme-sense__empty">
					{{ i18n( 'wikilambda-wikidata-entity-empty-value-placeholder' ).text() }}
				</span>
			</div>

			<div v-else>
				<wl-wikidata-entity-selector
					v-if="isInitialized"
					class="ext-wikilambda-app-wikidata-lexeme-sense__lexeme-selector"
					:entity-id="lexemeId"
					:entity-label="lexemeLabel"
					:type="lexemeType"
					data-testid="wikidata-lexeme-select"
					@select-wikidata-entity="onSelectLexeme"
				></wl-wikidata-entity-selector>
				<cdx-select
					class="ext-wikilambda-app-wikidata-lexeme-sense__sense-selector"
					:disabled="!lexemeId || !lexemeSenseSelectMenuItems.length"
					:selected="lexemeSenseId"
					:default-label="i18n( 'wikilambda-wikidata-lexeme-sense-selector-placeholder' ).text()"
					:menu-items="lexemeSenseSelectMenuItems"
					:menu-config="lexemeSenseSelectConfig"
					data-testid="wikidata-lexeme-sense-select"
					@update:selected="onSelectLexemeSense"
				></cdx-select>
				<cdx-message
					v-if="shouldShowNoSensesMessage"
					inline
				>
					<!-- eslint-disable-next-line vue/no-v-html -->
					<div v-html="noSensesMessage"></div>
				</cdx-message>
			</div>
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
const { computed, defineComponent, inject, onMounted, ref, watch } = require( 'vue' );

const wikidataIconSvg = require( './wikidataIconSvg.js' );
const Constants = require( '../../../Constants.js' );
const useZObject = require( '../../../composables/useZObject.js' );
const useMainStore = require( '../../../store/index.js' );

// Wikidata components
const WikidataEntitySelector = require( './EntitySelector.vue' );
// Type components
const ZObjectToString = require( '../ZObjectToString.vue' );
// Codex components
const { CdxIcon, CdxSelect, CdxMessage } = require( '../../../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'wl-wikidata-lexeme-sense',
	components: {
		'wl-wikidata-entity-selector': WikidataEntitySelector,
		'wl-z-object-to-string': ZObjectToString,
		'cdx-icon': CdxIcon,
		'cdx-message': CdxMessage,
		'cdx-select': CdxSelect
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
		type: {
			type: String,
			required: true
		},
		edit: {
			type: Boolean,
			default: false
		}
	},
	emits: [ 'set-value' ],
	setup( props, { emit } ) {
		const i18n = inject( 'i18n' );
		const { getWikidataEntityId } = useZObject( { keyPath: props.keyPath } );
		const store = useMainStore();

		// Constants
		const wikidataIcon = wikidataIconSvg;
		const lexemeType = Constants.Z_WIKIDATA_LEXEME;
		const lexemeSenseType = Constants.Z_WIKIDATA_LEXEME_SENSE;
		const lexemeSenseSelectConfig = { visibleItemLimit: 5 };

		// State
		const lexemeId = ref( null );
		const isInitialized = ref( false );
		const isLexemeLoading = ref( false );

		// Lexeme Sense ID data
		/**
		 * Returns the Lexeme Sense Id string terminal value if set, or empty string if unset.
		 * If the Id is not determined by a terminal string, returns undefined.
		 *
		 * @return {string|undefined}
		 */
		const lexemeSenseId = computed( () => getWikidataEntityId( props.objectValue, lexemeSenseType ) );

		/**
		 * Returns whether the Wikidata Entity Id is a terminal string.
		 * If it doesn't, the component will fallback to z-object-to-string so
		 * that it informs of the object content but doesn't show blank values or
		 * fields, and doesn't allow direct edit (e.g. requires previous expnsion)
		 *
		 * @return {boolean}
		 */
		const hasTerminalId = computed( () => typeof lexemeSenseId.value === 'string' );

		/**
		 * Returns the initial Lexeme Id string value, if any Lexeme Sense is selected on load.
		 *
		 * @return {string|null}
		 */
		const initialLexemeId = computed( () => {
			if ( lexemeSenseId.value ) {
				const [ id ] = lexemeSenseId.value.split( '-' );
				return id;
			}
			return null;
		} );

		// Lexeme data
		/**
		 * Returns the LabelData object for the selected Lexeme.
		 *
		 * @return {LabelData|undefined}
		 */
		const lexemeLabelData = computed( () => store.getLexemeLabelData( lexemeId.value ) );

		/**
		 * Returns the string label of the selected Lexeme or an empty string if none is selected.
		 *
		 * @return {string}
		 */
		const lexemeLabel = computed( () => lexemeLabelData.value ? lexemeLabelData.value.label : '' );

		/**
		 * Returns the Wikidata URL for the selected lexeme.
		 *
		 * @return {string|undefined}
		 */
		const lexemeUrl = computed( () => store.getLexemeUrl( lexemeId.value ) );

		// Lexeme Sense data
		/**
		 * Returns the Wikidata URL for the selected Lexeme Sense.
		 *
		 * @return {string|undefined}
		 */
		const lexemeSenseUrl = computed( () => store.getLexemeSenseUrl( lexemeSenseId.value ) );

		/**
		 * Returns the LabelData object for the selected Lexeme Sense.
		 *
		 * @return {LabelData|undefined}
		 */
		const lexemeSenseLabelData = computed( () => store.getLexemeSenseLabelData( lexemeSenseId.value ) );

		// Sense selector display
		/**
		 * Returns the menu items for the senses of the selected lexeme.
		 * Each item has a label (from store.getLexemeSenseLabelData) and value (the sense id).
		 *
		 * @return {Array<{label: string, value: string}>}
		 */
		const lexemeSenseSelectMenuItems = computed( () => {
			if ( !lexemeId.value ) {
				return [];
			}
			const sensesData = store.getLexemeSensesData( lexemeId.value );
			if ( !sensesData || !Array.isArray( sensesData ) ) {
				return [];
			}
			return sensesData.map( ( sense ) => {
				const labelData = store.getLexemeSenseLabelData( sense.id );
				const ids = sense.id.split( '-' );
				return {
					label: labelData ? labelData.label : sense.id,
					value: sense.id,
					description: ids[ 1 ]
				};
			} );
		} );

		/**
		 * Returns true if we should show the "no senses" message.
		 * Only shows when lexeme is selected, not loading, and has no senses.
		 *
		 * @return {boolean}
		 */
		const shouldShowNoSensesMessage = computed( () => lexemeId.value &&
			!isLexemeLoading.value &&
			!lexemeSenseSelectMenuItems.value.length
		);

		/**
		 * Returns the localized "no senses" message with the Wikidata link.
		 *
		 * @return {string}
		 */
		const noSensesMessage = computed( () => i18n(
			'wikilambda-wikidata-lexeme-sense-no-senses-message',
			[ lexemeUrl.value ]
		)
			.parse()
			// TODO (T406155): how to open the link in a new tab using MediaWiki translations?
			.replace( '<a ', '<a target="_blank" rel="noopener" ' )
		);

		// Data fetching
		/**
		 * Fetch lexeme data and senses data and set loading state.
		 *
		 * @param {string} id - Lexeme ID to fetch
		 */
		function loadLexemeWithSenses( id ) {
			isLexemeLoading.value = true;
			store.fetchLexemes( { ids: [ id ] } );
			store.fetchLexemeSenses( { lexemeIds: [ id ] } )
				.finally( () => {
					isLexemeLoading.value = false;
				} );
		}

		// Actions
		/**
		 * Handles selection of a lexeme from the entity selector.
		 * Updates lexemeId, fetches the lexeme, and clears the sense selection.
		 *
		 * @param {string} value
		 */
		function onSelectLexeme( value ) {
			if ( value === lexemeId.value ) {
				return;
			}
			lexemeId.value = value;
			loadLexemeWithSenses( value );

			emit( 'set-value', {
				value: '',
				keyPath: ( props.type === Constants.Z_WIKIDATA_REFERENCE_LEXEME_SENSE ) ? [
					Constants.Z_WIKIDATA_REFERENCE_LEXEME_SENSE_ID,
					Constants.Z_STRING_VALUE
				] : [
					Constants.Z_WIKIDATA_FETCH_LEXEME_SENSE_ID,
					Constants.Z_WIKIDATA_REFERENCE_LEXEME_SENSE_ID,
					Constants.Z_STRING_VALUE
				]
			} );
		}

		/**
		 * Handles selection of a lexeme sense from the senses dropdown.
		 * Emits a set-value event to persist the change.
		 *
		 * @param {string|null} value
		 */
		function onSelectLexemeSense( value ) {
			const keyPath = ( props.type === Constants.Z_WIKIDATA_REFERENCE_LEXEME_SENSE ) ? [
				Constants.Z_WIKIDATA_REFERENCE_LEXEME_SENSE_ID,
				Constants.Z_STRING_VALUE
			] : [
				Constants.Z_WIKIDATA_FETCH_LEXEME_SENSE_ID,
				Constants.Z_WIKIDATA_REFERENCE_LEXEME_SENSE_ID,
				Constants.Z_STRING_VALUE
			];
			emit( 'set-value', { value: value || '', keyPath } );
		}

		// Watch
		watch( lexemeSenseId, ( id ) => {
			if ( id ) {
				const [ newLexemeId ] = id.split( '-' );
				lexemeId.value = newLexemeId;
				loadLexemeWithSenses( newLexemeId );
			}
		} );

		watch( () => lexemeSenseSelectMenuItems.value.length, ( hasItems ) => {
			if ( hasItems && !isInitialized.value ) {
				isInitialized.value = true;
			}
		} );

		// Lifecycle
		onMounted( () => {
			if ( initialLexemeId.value ) {
				lexemeId.value = initialLexemeId.value;
				loadLexemeWithSenses( initialLexemeId.value );
			}
			// We need to set isInitialized to true after the lexemeId is set
			// because the entity selector will otherwise be rendered with an empty value.
			isInitialized.value = true;
		} );

		return {
			hasTerminalId,
			isInitialized,
			lexemeId,
			lexemeLabel,
			lexemeSenseId,
			lexemeSenseLabelData,
			lexemeSenseSelectConfig,
			lexemeSenseSelectMenuItems,
			i18n,
			lexemeSenseUrl,
			lexemeType,
			noSensesMessage,
			onSelectLexeme,
			onSelectLexemeSense,
			shouldShowNoSensesMessage,
			wikidataIcon
		};
	}
} );
</script>

<style lang="less">
@import '../../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-wikidata-lexeme-sense {
	--line-height-current: calc( var( --line-height-content ) * 1em );

	.ext-wikilambda-app-wikidata-lexeme-sense__read {
		display: flex;
		align-items: normal;
		min-height: @min-size-interactive-pointer;
		box-sizing: border-box;
		/* We calculate dynamically a different padding for each font size setting */
		padding-top: calc( calc( @min-size-interactive-pointer - var( --line-height-current ) ) / 2 );
	}

	.ext-wikilambda-app-wikidata-lexeme-sense__link {
		line-height: var( --line-height-current );
	}

	.ext-wikilambda-app-wikidata-lexeme-sense__unknown {
		color: @color-subtle;
	}

	.ext-wikilambda-app-wikidata-lexeme-sense__empty {
		color: @color-placeholder;
		font-style: italic;
	}

	.ext-wikilambda-app-wikidata-lexeme-sense__wd-icon {
		margin: 0 @spacing-25;
		height: var( --line-height-current );
		flex-shrink: 0;
	}

	.ext-wikilambda-app-wikidata-lexeme-sense__lexeme-selector {
		margin-bottom: @spacing-50;
	}

	.ext-wikilambda-app-wikidata-lexeme-sense__sense-selector {
		.cdx-select-vue__handle {
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}
	}
}
</style>
