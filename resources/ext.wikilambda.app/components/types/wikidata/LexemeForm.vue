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
	name: 'wl-wikidata-lexeme-form',
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
			lexemeFormType: Constants.Z_WIKIDATA_LEXEME_FORM
		};
	},
	computed: Object.assign( {}, mapState( useMainStore, [
		'getLexemeFormLabelData',
		'getLexemeFormUrl'
	] ), {
		/**
		 * Returns the Lexeme Form Id string value, if any Lexeme Form is selected.
		 * Else returns null (required as empty value for CdxLookup).
		 *
		 * @return {string|null}
		 */
		lexemeFormId: function () {
			return this.getWikidataEntityId( this.objectValue, this.lexemeFormType );
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
		 * Returns the string label of the selected Lexeme Form or
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
		}
	},
	mounted: function () {
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
		word-break: break-word;
	}

	.ext-wikilambda-app-wikidata-lexeme-form__wd-icon {
		margin: 0 @spacing-25;
		height: var( --line-height-current );
	}
}
</style>
