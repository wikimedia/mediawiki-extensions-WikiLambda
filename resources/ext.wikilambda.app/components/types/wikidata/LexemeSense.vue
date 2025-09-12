<!--
	WikiLambda Vue component for Z6006/Wikidata Lexeme Sense objects.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div
		class="ext-wikilambda-app-wikidata-lexeme-sense"
		data-testid="wikidata-lexeme-sense"
	>
		<div v-if="!edit" class="ext-wikilambda-app-wikidata-lexeme-sense__read">
			<cdx-icon
				class="ext-wikilambda-app-wikidata-lexeme-sense__wd-icon"
				:icon="wikidataIcon"
				size="small"
			></cdx-icon>
			<a
				v-if="lexemeSenseLabelData"
				class="ext-wikilambda-app-wikidata-lexeme-sense__link"
				:href="lexemeSenseUrl"
				:lang="lexemeSenseLabelData.langCode"
				:dir="lexemeSenseLabelData.langDir"
				target="_blank"
			>{{ lexemeSenseLabelData.label }}</a>
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
				:default-label="lexemeSenseSelectPlaceholder"
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
	</div>
</template>

<script>
const { defineComponent } = require( 'vue' );
const { mapActions, mapState } = require( 'pinia' );

const wikidataIconSvg = require( './wikidataIconSvg.js' );
const Constants = require( '../../../Constants.js' );
const zobjectMixin = require( '../../../mixins/zobjectMixin.js' );
const useMainStore = require( '../../../store/index.js' );

// Wikidata components
const WikidataEntitySelector = require( './EntitySelector.vue' );
// Codex components
const { CdxIcon, CdxSelect, CdxMessage } = require( '../../../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'wl-wikidata-lexeme-sense',
	components: {
		'cdx-icon': CdxIcon,
		'wl-wikidata-entity-selector': WikidataEntitySelector,
		'cdx-select': CdxSelect,
		'cdx-message': CdxMessage
	},
	mixins: [ zobjectMixin ],
	props: {
		keyPath: { // eslint-disable-line vue/no-unused-properties
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
	data: function () {
		return {
			wikidataIcon: wikidataIconSvg,
			lexemeType: Constants.Z_WIKIDATA_LEXEME,
			lexemeSenseType: Constants.Z_WIKIDATA_LEXEME_SENSE,
			lexemeSenseSelectConfig: {
				visibleItemLimit: 5
			},
			lexemeId: null,
			isInitialized: false,
			isLexemeLoading: false
		};
	},
	computed: Object.assign( {}, mapState( useMainStore, [
		'getLexemeSenseLabelData',
		'getLexemeSenseUrl',
		'getLexemeSensesData',
		'getLexemeLabelData'
	] ), {
		/**
		 * Returns the initial Lexeme Id string value, if any Lexeme Sense is selected on load.
		 *
		 * @return {string|null}
		 */
		initialLexemeId: function () {
			/**
			 * Returns the Lexeme Id string value, if any Lexeme Sense is selected.
			 *
			 * @return {string|null}
			 */
			if ( this.lexemeSenseId ) {
				const [ lexemeId ] = this.lexemeSenseId.split( '-' );
				return lexemeId;
			}
			return null;
		},
		/**
		 * Returns the LabelData object for the selected Lexeme.
		 *
		 * @return {LabelData|undefined}
		 */
		lexemeLabelData: function () {
			return this.getLexemeLabelData( this.lexemeId );
		},
		/**
		 * Returns the string label of the selected Lexeme or an empty string if none is selected.
		 *
		 * @return {string}
		 */
		lexemeLabel: function () {
			return this.lexemeLabelData ? this.lexemeLabelData.label : '';
		},
		/**
		 * Returns the Lexeme Sense Id string value, if any Lexeme Sense is selected.
		 * Else returns null (required as empty value for CdxLookup).
		 *
		 * @return {string|null}
		 */
		lexemeSenseId: function () {
			return this.getWikidataEntityId( this.objectValue, this.lexemeSenseType );
		},
		/**
		 * Returns the Wikidata URL for the selected Lexeme Sense.
		 *
		 * @return {string|undefined}
		 */
		lexemeSenseUrl: function () {
			return this.getLexemeSenseUrl( this.lexemeSenseId );
		},
		/**
		 * Returns the LabelData object for the selected Lexeme Sense.
		 *
		 * @return {LabelData|undefined}
		 */
		lexemeSenseLabelData: function () {
			return this.getLexemeSenseLabelData( this.lexemeSenseId );
		},
		/**
		 * Returns the string label of the selected Lexeme Sense or an empty string if none is selected.
		 * This is needed for the CdxLookup component initial value.
		 *
		 * @return {string}
		 */
		lexemeSenseLabel: function () {
			return this.lexemeSenseLabelData ? this.lexemeSenseLabelData.label : '';
		},
		/**
		 * Returns the menu items for the senses of the selected lexeme.
		 * Each item has a label (from getLexemeSenseLabelData) and value (the sense id).
		 *
		 * @return {Array<{label: string, value: string}>}
		 */
		lexemeSenseSelectMenuItems: function () {
			if ( !this.lexemeId ) {
				return [];
			}
			const sensesData = this.getLexemeSensesData( this.lexemeId );

			if ( !sensesData || !Array.isArray( sensesData ) ) {
				return [];
			}
			return sensesData.map( ( sense ) => {
				const labelData = this.getLexemeSenseLabelData( sense.id );
				const ids = sense.id.split( '-' );
				return {
					label: labelData ? labelData.label : sense.id,
					value: sense.id,
					description: ids[ 1 ]
				};
			} );
		},
		/**
		 * Returns the placeholder for the senses select dropdown.
		 *
		 * @return {string}
		 */
		lexemeSenseSelectPlaceholder: function () {
			return this.$i18n( 'wikilambda-wikidata-lexeme-sense-selector-placeholder' ).text();
		},
		/**
		 * Returns the Wikidata URL for the selected lexeme.
		 *
		 * @return {string|undefined}
		 */
		lexemeUrl: function () {
			return this.lexemeId ? `${ Constants.WIKIDATA_BASE_URL }/wiki/Lexeme:${ this.lexemeId }` : undefined;
		},
		/**
		 * Returns true if we should show the "no senses" message.
		 * Only shows when lexeme is selected, not loading, and has no senses.
		 *
		 * @return {boolean}
		 */
		shouldShowNoSensesMessage: function () {
			return this.lexemeId && !this.isLexemeLoading && !this.lexemeSenseSelectMenuItems.length;
		},
		/**
		 * Returns the localized "no senses" message with the Wikidata link.
		 *
		 * @return {string}
		 */
		noSensesMessage: function () {
			return this.$i18n( 'wikilambda-wikidata-lexeme-sense-no-senses-message', [ this.lexemeUrl ] )
				.parse()
				// FIXME: how to open the link in a new tab using MediaWiki translations?
				.replace( '<a ', '<a target="_blank" rel="noopener" ' );
		}
	} ),
	methods: Object.assign( {}, mapActions( useMainStore, [
		'fetchLexemes',
		'fetchLexemeSenses'
	] ), {
		/**
		 * Fetch lexeme data and senses data and set loading state.
		 *
		 * @param {string} id - Lexeme ID to fetch
		 */
		loadLexemeWithSenses: function ( id ) {
			this.isLexemeLoading = true;
			this.fetchLexemes( { ids: [ id ] } );
			this.fetchLexemeSenses( { lexemeIds: [ id ] } )
				.finally( () => {
					this.isLexemeLoading = false;
				} );
		},
		/**
		 * Handles selection of a lexeme from the entity selector.
		 * Updates lexemeId, fetches the lexeme, and clears the sense selection.
		 *
		 * @param {string} value
		 */
		onSelectLexeme: function ( value ) {
			// If the same lexeme is selected, do nothing
			if ( value === this.lexemeId ) {
				return;
			}
			this.lexemeId = value;

			// Load the lexeme and senses data
			this.loadLexemeWithSenses( value );

			// When lexeme changes, clear the sense selection
			this.$emit( 'set-value', {
				value: '',
				keyPath: ( this.type === Constants.Z_WIKIDATA_REFERENCE_LEXEME_SENSE ) ? [
					Constants.Z_WIKIDATA_REFERENCE_LEXEME_SENSE_ID,
					Constants.Z_STRING_VALUE
				] : [
					Constants.Z_WIKIDATA_FETCH_LEXEME_SENSE_ID,
					Constants.Z_WIKIDATA_REFERENCE_LEXEME_SENSE_ID,
					Constants.Z_STRING_VALUE
				]
			} );
		},
		/**
		 * Handles selection of a lexeme sense from the senses dropdown.
		 * Emits a set-value event to persist the change.
		 *
		 * @param {string|null} value
		 */
		onSelectLexemeSense: function ( value ) {
			const keyPath = ( this.type === Constants.Z_WIKIDATA_REFERENCE_LEXEME_SENSE ) ? [
				Constants.Z_WIKIDATA_REFERENCE_LEXEME_SENSE_ID,
				Constants.Z_STRING_VALUE
			] : [
				Constants.Z_WIKIDATA_FETCH_LEXEME_SENSE_ID,
				Constants.Z_WIKIDATA_REFERENCE_LEXEME_SENSE_ID,
				Constants.Z_STRING_VALUE
			];
			this.$emit( 'set-value', {
				value: value || '',
				keyPath
			} );
		}
	} ),
	watch: {
		/**
		 * When the Lexeme Sense ID changes, update lexemeId and fetch the corresponding lexeme data.
		 *
		 * @param {string|null} id
		 */
		lexemeSenseId: function ( id ) {
			if ( id ) {
				const [ lexemeId ] = id.split( '-' );
				this.lexemeId = lexemeId;
				this.loadLexemeWithSenses( lexemeId );
			}
		},
		/**
		 * When lexemeId changes, fetch the lexeme data.
		 *
		 * @param {string|null} id
		 */
		lexemeId: function ( id ) {
			if ( id ) {
				this.loadLexemeWithSenses( id );
			}
		}
	},
	mounted: function () {
		/**
		 * On mount, set lexemeId from initialLexemeId if available and fetch the lexeme data.
		 */
		if ( this.initialLexemeId ) {
			this.lexemeId = this.initialLexemeId;
			this.loadLexemeWithSenses( this.initialLexemeId );
		}
		// We need to set isInitialized to true after the lexemeId is set
		// because the entity selector will otherwise be rendered with an empty value.
		this.isInitialized = true;
	}
} );
</script>

<style lang="less">
@import '../../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-wikidata-lexeme-sense {
	--line-height-current: calc( var( --line-height-medium ) * 1em );

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

	.ext-wikilambda-app-wikidata-lexeme-sense__wd-icon {
		margin: 0 @spacing-25;
		height: var( --line-height-current );
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
