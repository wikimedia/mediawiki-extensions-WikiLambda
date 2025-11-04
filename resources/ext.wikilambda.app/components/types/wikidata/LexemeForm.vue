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
const { computed, watch, onMounted } = require( 'vue' );

const wikidataIconSvg = require( './wikidataIconSvg.js' );
const Constants = require( '../../../Constants.js' );
const useZObject = require( '../../../composables/useZObject.js' );
const useMainStore = require( '../../../store/index.js' );

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
	setup( props, { emit } ) {
		const { getWikidataEntityId } = useZObject( { keyPath: props.keyPath } );
		const store = useMainStore();

		const wikidataIcon = wikidataIconSvg;
		const lexemeFormType = Constants.Z_WIKIDATA_LEXEME_FORM;

		/**
		 * Returns the Lexeme Form Id string value, if any Lexeme Form is selected.
		 * Else returns null (required as empty value for CdxLookup).
		 *
		 * @return {string|null}
		 */
		const lexemeFormId = computed( () => getWikidataEntityId( props.objectValue, lexemeFormType ) );

		/**
		 * Returns the Wikidata URL for the selected Lexeme Form.
		 *
		 * @return {string|undefined}
		 */
		const lexemeFormUrl = computed( () => store.getLexemeFormUrl( lexemeFormId.value ) );

		/**
		 * Returns the LabelData object for the selected Lexeme Form
		 *
		 * @return {LabelData|undefined}
		 */
		const lexemeFormLabelData = computed( () => store.getLexemeFormLabelData( lexemeFormId.value ) );

		/**
		 * Returns the string label of the selected Lexeme Form or
		 * an empty string if none is selected. This is needed
		 * for the CdxLookup component initial value.
		 *
		 * @return {string}
		 */
		const lexemeFormLabel = computed( () => lexemeFormLabelData.value ? lexemeFormLabelData.value.label : '' );

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
			const keyPath = ( props.type === Constants.Z_WIKIDATA_REFERENCE_LEXEME_FORM ) ? [
				Constants.Z_WIKIDATA_REFERENCE_LEXEME_FORM_ID,
				Constants.Z_STRING_VALUE
			] : [
				Constants.Z_WIKIDATA_FETCH_LEXEME_FORM_ID,
				Constants.Z_WIKIDATA_REFERENCE_LEXEME_FORM_ID,
				Constants.Z_STRING_VALUE
			];

			emit( 'set-value', { value: value || '', keyPath } );
		}

		watch( lexemeFormId, ( id ) => {
			if ( id ) {
				const [ lexemeId ] = id.split( '-' );
				store.fetchLexemes( { ids: [ lexemeId ] } );
			}
		} );

		onMounted( () => {
			if ( lexemeFormId.value ) {
				const [ lexemeId ] = lexemeFormId.value.split( '-' );
				store.fetchLexemes( { ids: [ lexemeId ] } );
			}
		} );

		return {
			lexemeFormId,
			lexemeFormLabel,
			lexemeFormLabelData,
			lexemeFormType,
			lexemeFormUrl,
			onSelect,
			wikidataIcon
		};
	}
} );
</script>

<style lang="less">
@import '../../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-wikidata-lexeme-form {
	--line-height-current: calc( var( --line-height-content ) * 1em );

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
		flex-shrink: 0;
	}
}
</style>
