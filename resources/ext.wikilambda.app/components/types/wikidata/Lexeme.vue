<!--
	WikiLambda Vue component for Z6005/Wikidata Lexemes.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div
		class="ext-wikilambda-app-wikidata-lexeme"
		data-testid="wikidata-lexeme">
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
			:type="lexemeType"
			@select-wikidata-entity="onSelect"
		></wl-wikidata-entity-selector>
	</div>
</template>

<script>
const { defineComponent } = require( 'vue' );
const { mapActions, mapState } = require( 'pinia' );

const wikidataIconSvg = require( './wikidataIconSvg.js' );
const Constants = require( '../../../Constants.js' );
const zobjectMixin = require( '../../../mixins/zobjectMixin.js' );
const useMainStore = require( '../../../store/index.js' );
const LabelData = require( '../../../store/classes/LabelData.js' );

// Wikidata components
const WikidataEntitySelector = require( './EntitySelector.vue' );
// Codex components
const { CdxIcon } = require( '../../../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'wl-wikidata-lexeme',
	components: {
		'wl-wikidata-entity-selector': WikidataEntitySelector,
		'cdx-icon': CdxIcon
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
		'getLexemeLabelData',
		'getLexemeUrl'
	] ), {
		/**
		 * Returns the Lexeme Id string value, if any Lexeme is selected.
		 *
		 * @return {string|undefined}
		 */
		lexemeId: function () {
			return this.getWikidataEntityId( this.objectValue, this.lexemeType );
		},
		/**
		 * Returns the Wikidata URL for the selected Lexeme.
		 *
		 * @return {string|undefined}
		 */
		lexemeUrl: function () {
			return this.getLexemeUrl( this.lexemeId );
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
		}
	},
	mounted: function () {
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

	.ext-wikilambda-app-wikidata-lexeme__link {
		line-height: var( --line-height-current );
	}

	.ext-wikilambda-app-wikidata-lexeme__wd-icon {
		margin: 0 @spacing-25;
		height: var( --line-height-current );
	}
}
</style>
