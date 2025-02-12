<!--
	WikiLambda Vue component for Z6005/Wikidata Lexeme objects.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-app-wikidata-lexeme" data-testid="wikidata-lexeme">
		<div v-if="!edit" class="ext-wikilambda-app-wikidata-lexeme__read">
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
			>{{ lexemeLabelData.label }}</a>
		</div>
		<wl-wikidata-entity-selector
			v-else
			:entity-id="lexemeId"
			:entity-label="lexemeLabel"
			:icon="wikidataIcon"
			:type="lexemeType"
			@select-wikidata-entity="onSelect"
		></wl-wikidata-entity-selector>
	</div>
</template>

<script>
const { defineComponent } = require( 'vue' );
const { CdxIcon } = require( '@wikimedia/codex' );
const { mapActions, mapState } = require( 'pinia' );

const Constants = require( '../../../Constants.js' );
const LabelData = require( '../../../store/classes/LabelData.js' );
const useMainStore = require( '../../../store/index.js' );
const WikidataEntitySelector = require( './EntitySelector.vue' );
const wikidataIconSvg = require( './wikidataIconSvg.js' );

module.exports = exports = defineComponent( {
	name: 'wl-wikidata-lexeme',
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
			lexemeType: Constants.Z_WIKIDATA_LEXEME
		};
	},
	computed: Object.assign( {}, mapState( useMainStore, [
		'getLexemeData',
		'getLexemeIdRow',
		'getUserLangCode',
		'getZStringTerminalValue'
	] ), {
		/**
		 * Returns the row where the Wikidata Item string Id value is.
		 * If the value is unset or unfound, returns undefined.
		 *
		 * @return {Object|undefined}
		 */
		lexemeIdRow: function () {
			return this.getLexemeIdRow( this.rowId );
		},
		/**
		 * Returns the Lexeme Id string value, if any Lexeme is selected.
		 * Else returns null.
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
		 * Returns a Promise if the data is being fetched.
		 * Else returns undefined.
		 *
		 * @return {Object|Promise|undefined}
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
		 * an empty string if none is selected.
		 *
		 * @return {string}
		 */
		lexemeLabel: function () {
			return this.lexemeLabelData ? this.lexemeLabelData.label : '';
		}
	} ),
	methods: Object.assign( {}, mapActions( useMainStore, [
		'fetchLexemes'
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
		}
	} ),
	watch: {
		lexemeId: function ( id ) {
			if ( id ) {
				this.fetchLexemes( { ids: [ id ] } );
			}
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
	--line-height-current: calc( var( --line-height-medium ) * 1em );

	.ext-wikilambda-app-wikidata-lexeme__read {
		display: flex;
		align-items: normal;
		min-height: @min-size-interactive-pointer;
		box-sizing: border-box;
		/* We calculate dynamically a different padding for each font size setting */
		padding-top: calc( calc( @min-size-interactive-pointer - var( --line-height-current ) ) / 2 );
	}

	.ext-wikilambda-app-wikidata-lexeme__notation {
		margin-left: @spacing-25;
		color: @color-subtle;
	}

	.ext-wikilambda-app-wikidata-lexeme__link {
		line-height: var( --line-height-current );
	}

	.ext-wikilambda-app-wikidata-lexeme__wd-icon {
		margin: 0 @spacing-25;
		height: var( --line-height-current );
	}
}
</style>
