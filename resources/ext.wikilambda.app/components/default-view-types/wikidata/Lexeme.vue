<!--
	WikiLambda Vue component for Z6005/Wikidata Lexeme objects.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-app-wikidata-lexeme" data-testid="wikidata-lexeme">
		<template v-if="!edit">
			<cdx-icon
				:icon="wikidataIcon"
				class="ext-wikilambda-app-wikidata-lexeme__wd-icon"
			></cdx-icon>
			<a
				v-if="lexemeLabelData"
				class="ext-wikilambda-app-wikidata-lexeme__link"
				:href="lexemeUrl"
				:lang="lexemeLabelData.langCode"
				:dir="lexemeLabelData.langDir"
				target="_blank"
			>
				{{ lexemeLabelData.label }}<cdx-icon
					v-if="lexemeUrl"
					:icon="icons.cdxIconLinkExternal"
					class="ext-wikilambda-app-wikidata-lexeme__link-icon"
				></cdx-icon>
			</a>
		</template>
		<cdx-lookup
			v-else
			v-model:input-value="inputValue"
			:selected="lexemeId"
			:placeholder="$i18n( 'wikilambda-wikidata-lexeme-selector-placeholder' ).text()"
			:menu-items="lookupResults"
			:menu-config="lookupConfig"
			:start-icon="wikidataIcon"
			@update:selected="onSelect"
			@update:input-value="onInput"
			@blur="onBlur"
		>
			<template #no-results>
				{{ $i18n( 'wikilambda-zobjectselector-no-results' ).text() }}
			</template>
		</cdx-lookup>
	</div>
</template>

<script>
const { defineComponent } = require( 'vue' );
const { CdxIcon, CdxLookup } = require( '@wikimedia/codex' );
const Constants = require( '../../../Constants.js' ),
	LabelData = require( '../../../store/classes/LabelData.js' ),
	{ mapActions, mapGetters } = require( 'vuex' ),
	icons = require( '../../../../lib/icons.json' );

const wikidataIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
  <path fill="#900" d="M0 16h.721V4H0v12Zm1.49 0H3.7V4H1.49v12ZM4.422 4v11.999h2.21V4h-2.21Z"/>
  <path fill="#396" d="M17.789 16h.72V4h-.72v12Zm1.49-12v12H20V4h-.721ZM7.378 16h.72V4h-.72v12Zm1.49-12v12h.721V4h-.721Z"/>
  <path fill="#069" d="M10.334 16h2.21V4h-2.21v12Zm2.932 0h.769V4h-.77v12Zm1.49-12v12h2.21V4h-2.21Z"/>
</svg>`;

module.exports = exports = defineComponent( {
	name: 'wl-wikidata-lexeme',
	components: {
		'cdx-icon': CdxIcon,
		'cdx-lookup': CdxLookup
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
			icons: icons,
			wikidataIcon: wikidataIconSvg,
			inputValue: '',
			lookupResults: [],
			lookupConfig: {
				boldLabel: true,
				searchQuery: ''
			},
			lookupDelayTimer: null,
			lookupDelayMs: 300
		};
	},
	computed: Object.assign( mapGetters( [
		'getLexemeData',
		'getLexemeIdRow',
		'getUserLangCode',
		'getZStringTerminalValue'
	] ), {
		/**
		 * Returns the row for the Fetch Wikidata Lexeme Identity argument is,
		 * which will contain the string with the Wikidata Lexeme Id, if set,
		 *
		 * @return {Object|undefined}
		 */
		lexemeIdRow: function () {
			return this.getLexemeIdRow( this.rowId );
		},
		/**
		 * Returns the Lexeme Id string value, if any Lexeme is selected.
		 * Else returns null (required as empty value for CdxLookup).
		 *
		 * @return {string|null}
		 */
		lexemeId: function () {
			return this.lexemeIdRow ?
				this.getZStringTerminalValue( this.lexemeIdRow.id ) || null :
				null;
		},
		/**
		 * Returns the Lexeme data object, if any Lexeme is selected.
		 * Else returns undefined.
		 *
		 * @return {Object|undefined}
		 */
		lexemeData: function () {
			return this.getLexemeData( this.lexemeId );
		},
		/**
		 * Returns the Wikidata URL for the selected Lexeme.
		 *
		 * @return {string|undefined}
		 */
		lexemeUrl: function () {
			return this.lexemeId ?
				`${ Constants.WIKIDATA_BASE_URL }/wiki/Lexeme:${ this.lexemeId }` :
				undefined;
		},
		/**
		 * Returns the LabelData object built from the available
		 * lemmas in the data object of the selected Lexeme.
		 * If a Lexeme is selected but it has no lemmas, returns
		 * LabelData object with the Lexeme id as its display label.
		 * If no Lexeme is selected, returns undefined.
		 *
		 * @return {LabelData|undefined}
		 */
		lexemeLabelData: function () {
			// If no selected lexeme, return undefined
			if ( !this.lexemeId ) {
				return undefined;
			}
			// If no lexemeData yet, return Lexeme Id
			// Get best label from lemmas (if any)
			const langs = this.lexemeData ? Object.keys( this.lexemeData.lemmas || {} ) : {};
			if ( langs.length > 0 ) {
				const lemma = langs.includes( this.getUserLangCode ) ?
					this.lexemeData.lemmas[ this.getUserLangCode ] :
					this.lexemeData.lemmas[ langs[ 0 ] ];
				return new LabelData( this.lexemeId, lemma.value, null, lemma.language );
			}
			// Else, return Lexeme Id as label
			return new LabelData( this.lexemeId, this.lexemeId, null );
		},
		/**
		 * Returns the string label of the selected Lexeme or
		 * an empty string if none is selected. This is needed
		 * for the CdxLookup component initial value.
		 *
		 * @return {string}
		 */
		lexemeLabel: function () {
			return this.lexemeLabelData ? this.lexemeLabelData.label : '';
		}
	} ),
	methods: Object.assign( mapActions( [
		'fetchLexemes',
		'lookupLexemes'
	] ), {
		/**
		 * Clears the ZObjectSelector lookup results.
		 * This doesn't clear the component TextInput.
		 */
		clearResults: function () {
			this.lookupResults = [];
		},
		/**
		 * On field input, perform a backend lookup and
		 * save the returned objects in lookupResults array.
		 *
		 * @param {string} input
		 */
		onInput: function ( input ) {
			// If empty input, clear and exit
			if ( !input ) {
				this.clearResults();
				return;
			}
			// Just search if more than one characters
			if ( input.length < 2 ) {
				return;
			}
			// Search after 300 ms
			clearTimeout( this.lookupDelayTimer );
			this.lookupDelayTimer = setTimeout( () => {
				this.getLookupResults( input );
			}, this.lookupDelayMs );
		},
		/**
		 * When lookup selected value updates, emit a set-value
		 * event so that parent ZObjectKeyValue sets the value
		 * of the Fetch Wikidata Lexeme function call.
		 * If the field is cleared, set value as empty string.
		 *
		 * @param {string} value
		 */
		onSelect: function ( value ) {
			// T374246: Disable clear strategy
			if ( value === null ) {
				return;
			}

			// If the already selected value is selected again, exit early
			if ( this.lexemeId === value ) {
				return;
			}

			// If type is Wikidata Lexeme Reference:
			// * Set Lexeme Reference Id
			// Else (type is Function Call):
			// * Set Lexeme Reference Id of the Fetch Function Id argument
			const keyPath = ( this.type === Constants.Z_WIKIDATA_REFERENCE_LEXEME ) ? [
				Constants.Z_WIKIDATA_REFERENCE_LEXEME_ID,
				Constants.Z_STRING_VALUE
			] : [
				Constants.Z_WIKIDATA_FETCH_LEXEME_ID,
				Constants.Z_WIKIDATA_REFERENCE_LEXEME_ID,
				Constants.Z_STRING_VALUE
			];

			this.$emit( 'set-value', {
				value: value || '',
				keyPath
			} );
		},
		/**
		 * On blur, select the value that matches the inputValue if valid;
		 * else, restore the previous selected value.
		 */
		onBlur: function () {
			// Match current inputValue with available menu options:
			const match = this.lookupResults.find( ( option ) => option.label === this.inputValue );
			if ( match ) {
				// Select new value
				this.onSelect( match.value );
			} else {
				// Reset to old value
				this.inputValue = this.lexemeLabel;
				this.lookupConfig.searchQuery = this.lexemeLabel;
			}
		},
		/**
		 * Perform Wikidata Lexeme lookup given a search term.
		 *
		 * @param {string} searchTerm
		 */
		getLookupResults: function ( searchTerm ) {
			this.lookupLexemes( searchTerm ).then( ( data ) => {
				const { search } = data;
				const ids = [];
				this.lookupConfig.searchQuery = searchTerm;
				this.lookupResults = [];
				for ( const lexeme of search ) {
					ids.push( lexeme.id );
					this.lookupResults.push( {
						value: lexeme.id,
						label: lexeme.label,
						description: lexeme.description
					} );
				}
			} );
		}
	} ),
	watch: {
		lexemeId: function ( id ) {
			this.fetchLexemes( { ids: [ id ] } );
		},
		lexemeLabel: function ( label ) {
			this.inputValue = label;
		}
	},
	mounted: function () {
		this.inputValue = this.lexemeLabel;
		if ( this.lexemeId ) {
			this.fetchLexemes( { ids: [ this.lexemeId ] } );
		}
	}
} );
</script>

<style lang="less">
@import '../../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-wikidata-lexeme {
	display: flex;
	align-items: center;

	.ext-wikilambda-app-wikidata-lexeme__wd-icon {
		margin: 0 @spacing-25;
	}

	.ext-wikilambda-app-wikidata-lexeme__link {
		display: flex;
		align-items: center;
	}

	a > .ext-wikilambda-app-wikidata-lexeme__link-icon {
		color: inherit;

		&.cdx-icon {
			width: @size-75;
			height: @size-75;
			padding-left: @spacing-12;
		}
	}
}
</style>
