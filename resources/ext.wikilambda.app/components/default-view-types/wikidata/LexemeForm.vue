<!--
	WikiLambda Vue component for Z6004/Wikidata Lexeme Form objects.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div
		class="ext-wikilambda-app-wikidata-lexeme-form"
		data-testid="wikidata-lexeme-form">
		<div v-if="!edit" class="ext-wikilambda-app-wikidata-lexeme-form__read">
			<cdx-icon
				:icon="wikidataIcon"
				class="ext-wikilambda-app-wikidata-lexeme-form__wd-icon"
			></cdx-icon>
			<a
				v-if="lexemeFormLabelData"
				class="ext-wikilambda-app-wikidata-lexeme-form__link"
				:href="lexemeFormUrl"
				:lang="lexemeFormLabelData.langCode"
				:dir="lexemeFormLabelData.langDir"
				target="_blank"
			>{{ lexemeFormLabelData.label }}</a>
		</div>
		<wl-wikidata-entity-selector
			v-else
			:entity-id="lexemeFormId"
			:entity-label="lexemeFormLabel"
			:type="lexemeFormType"
			@select-wikidata-entity="onSelect"
		></wl-wikidata-entity-selector>
	</div>
</template>

<script>
const { defineComponent } = require( 'vue' );
const { mapActions, mapState } = require( 'pinia' );
const Constants = require( '../../../Constants.js' );
const LabelData = require( '../../../store/classes/LabelData.js' );
const useMainStore = require( '../../../store/index.js' );
const WikidataEntitySelector = require( './EntitySelector.vue' );
const { CdxIcon } = require( '../../../../codex.js' );
const wikidataIconSvg = require( './wikidataIconSvg.js' );

module.exports = exports = defineComponent( {
	name: 'wl-wikidata-lexeme-form',
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
			lexemeFormType: Constants.Z_WIKIDATA_LEXEME_FORM
		};
	},
	computed: Object.assign( {}, mapState( useMainStore, [
		'getLexemeFormData',
		'getLexemeFormId',
		'getLexemeFormLabelData',
		'getLexemeFormUrl'
	] ), {
		/**
		 * Returns the Lexeme Id string value, if any Lexeme is selected.
		 * Else returns null (required as empty value for CdxLookup).
		 *
		 * @return {string|null}
		 */
		lexemeFormId: function () {
			return this.getLexemeFormId( this.rowId );
		},
		/**
		 * Returns the Lexeme data object, if any Lexeme is selected.
		 * Else returns undefined.
		 *
		 * FIXME: need lexemeFormData
		 *
		 * @return {Object|undefined}
		 */
		lexemeFormData: function () {
			return this.getLexemeFormData( this.lexemeFormId );
		},
		/**
		 * Returns the Wikidata URL for the selected Lexeme Form.
		 *
		 * @return {string|undefined}
		 */
		lexemeFormUrl: function () {
			return this.getLexemeFormUrl( this.lexemeFormId );
		},
		/**
		 * Returns the LabelData object for the selected Lexeme Form
		 *
		 * @return {LabelData|undefined}
		 */
		lexemeFormLabelData: function () {
			return this.getLexemeFormLabelData( this.lexemeFormId );
		},
		/**
		 * Returns the string label of the selected Lexeme or
		 * an empty string if none is selected. This is needed
		 * for the CdxLookup component initial value.
		 *
		 * @return {string}
		 */
		lexemeFormLabel: function () {
			return this.lexemeFormLabelData ? this.lexemeFormLabelData.label : '';
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
			const keyPath = ( this.type === Constants.Z_WIKIDATA_REFERENCE_LEXEME_FORM ) ? [
				Constants.Z_WIKIDATA_REFERENCE_LEXEME_FORM_ID,
				Constants.Z_STRING_VALUE
			] : [
				Constants.Z_WIKIDATA_FETCH_LEXEME_FORM_ID,
				Constants.Z_WIKIDATA_REFERENCE_LEXEME_FORM_ID,
				Constants.Z_STRING_VALUE
			];

			this.$emit( 'set-value', {
				value: value || '',
				keyPath
			} );
		}
	} ),
	watch: {
		lexemeFormId: function ( id ) {
			if ( id ) {
				const [ lexemeId ] = id.split( '-' );
				this.fetchLexemes( { ids: [ lexemeId ] } );
			}
		},
		lexemeFormLabel: function ( label ) {
			this.inputValue = label;
		}
	},
	mounted: function () {
		this.inputValue = this.lexemeFormLabel;
		if ( this.lexemeFormId ) {
			const [ lexemeId ] = this.lexemeFormId.split( '-' );
			this.fetchLexemes( { ids: [ lexemeId ] } );
		}
	}
} );
</script>

<style lang="less">
@import '../../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-wikidata-lexeme-form {
	--line-height-current: calc( var( --line-height-medium ) * 1em );

	.ext-wikilambda-app-wikidata-lexeme-form__read {
		display: flex;
		align-items: normal;
		min-height: @min-size-interactive-pointer;
		box-sizing: border-box;
		/* We calculate dynamically a different padding for each font size setting */
		padding-top: calc( calc( @min-size-interactive-pointer - var( --line-height-current ) ) / 2 );
	}

	.ext-wikilambda-app-wikidata-lexeme-form__link {
		line-height: var( --line-height-current );
	}

	.ext-wikilambda-app-wikidata-lexeme-form__wd-icon {
		margin: 0 @spacing-25;
		height: var( --line-height-current );
	}
}
</style>
