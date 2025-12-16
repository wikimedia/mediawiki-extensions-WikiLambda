<!--
	WikiLambda Vue component for Z6004/Wikidata Lexeme Form objects.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div
		class="ext-wikilambda-app-wikidata-lexeme-form"
		data-testid="wikidata-lexeme-form">
		<template v-if="hasTerminalId">
			<div v-if="!edit" class="ext-wikilambda-app-wikidata-lexeme-form__read">
				<cdx-icon
					class="ext-wikilambda-app-wikidata-lexeme-form__wd-icon"
					:icon="wikidataIcon"
				></cdx-icon>
				<a
					v-if="lexemeFormLabelData && lexemeFormUrl"
					class="ext-wikilambda-app-wikidata-lexeme-form__link"
					:href="lexemeFormUrl"
					:lang="lexemeFormLabelData.langCode"
					:dir="lexemeFormLabelData.langDir"
					target="_blank"
				>{{ lexemeFormLabelData.label }}</a>
				<!-- No link: value is not a valid Qid (unknown) -->
				<span
					v-else-if="lexemeFormLabelData"
					class="ext-wikilambda-app-wikidata-lexeme-form__unknown"
					:lang="lexemeFormLabelData.langCode"
					:dir="lexemeFormLabelData.langDir"
				>{{ lexemeFormLabelData.label }}</span>
				<!-- No label: value is empty -->
				<span v-else class="ext-wikilambda-app-wikidata-lexeme-form__empty">
					{{ i18n( 'wikilambda-wikidata-entity-empty-value-placeholder' ).text() }}
				</span>
			</div>
			<wl-wikidata-entity-selector
				v-else
				:entity-id="lexemeFormId"
				:entity-label="lexemeFormLabel"
				:type="lexemeFormType"
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

// Wikidata components
const WikidataEntitySelector = require( './EntitySelector.vue' );
// Type components
const ZObjectToString = require( '../ZObjectToString.vue' );
// Codex components
const { CdxIcon } = require( '../../../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'wl-wikidata-lexeme-form',
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

		// Constants
		const wikidataIcon = wikidataIconSvg;
		const lexemeFormType = Constants.Z_WIKIDATA_LEXEME_FORM;

		// Entity ID data
		/**
		 * Returns the Wikidata Lexeme Form Id string terminal value if set, or empty string if unset.
		 * If the Id is not determined by a terminal string, returns undefined.
		 *
		 * @return {string|undefined}
		 */
		const lexemeFormId = computed( () => getWikidataEntityId( props.objectValue, lexemeFormType ) );

		/**
		 * Returns whether the Wikidata Entity Id is a terminal string.
		 * If it doesn't, the component will fallback to z-object-to-string so
		 * that it informs of the object content but doesn't show blank values or
		 * fields, and doesn't allow direct edit (e.g. requires previous expnsion)
		 *
		 * @return {boolean}
		 */
		const hasTerminalId = computed( () => typeof lexemeFormId.value === 'string' );

		// Entity display data
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

		// Actions
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

		// Watchers
		watch( lexemeFormId, ( id ) => {
			if ( id ) {
				const [ lexemeId ] = id.split( '-' );
				store.fetchLexemes( { ids: [ lexemeId ] } );
			}
		} );

		// Lifecycle hooks
		onMounted( () => {
			if ( lexemeFormId.value ) {
				const [ lexemeId ] = lexemeFormId.value.split( '-' );
				store.fetchLexemes( { ids: [ lexemeId ] } );
			}
		} );

		return {
			hasTerminalId,
			lexemeFormId,
			lexemeFormLabel,
			lexemeFormLabelData,
			lexemeFormType,
			lexemeFormUrl,
			onSelect,
			wikidataIcon,
			i18n
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

	.ext-wikilambda-app-wikidata-lexeme-form__unknown {
		color: @color-subtle;
	}

	.ext-wikilambda-app-wikidata-lexeme-form__empty {
		color: @color-placeholder;
		font-style: italic;
	}

	.ext-wikilambda-app-wikidata-lexeme-form__wd-icon {
		margin: 0 @spacing-25;
		height: var( --line-height-current );
		flex-shrink: 0;
	}
}
</style>
