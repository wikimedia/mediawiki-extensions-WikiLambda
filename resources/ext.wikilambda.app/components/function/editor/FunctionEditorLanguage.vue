<!--
	WikiLambda Vue component for the selection of a ZNaturalLanguage object inside the Function editor.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<wl-function-editor-field class="ext-wikilambda-app-function-editor-language">
		<template #label>
			<label :id="languageFieldId">
				{{ languageLabel }}
			</label>
		</template>
		<template #body>
			<wl-z-object-selector
				class="ext-wikilambda-app-function-editor-language__add-language"
				:aria-labelledby="languageFieldId"
				:disabled="hasLanguage"
				:exclude-zids="functionLanguages"
				:selected-zid="zLanguage"
				:type="naturalLanguageType"
				@select-item="addNewLanguage"
			></wl-z-object-selector>
		</template>
	</wl-function-editor-field>
</template>

<script>
const { computed, defineComponent, inject } = require( 'vue' );

const Constants = require( '../../../Constants.js' );
const useMainStore = require( '../../../store/index.js' );

// Function editor components
const FunctionEditorField = require( './FunctionEditorField.vue' );
// Base components
const ZObjectSelector = require( '../../base/ZObjectSelector.vue' );

module.exports = exports = defineComponent( {
	name: 'wl-function-editor-language',
	components: {
		'wl-function-editor-field': FunctionEditorField,
		'wl-z-object-selector': ZObjectSelector
	},
	props: {
		zLanguage: {
			type: String,
			default: ''
		}
	},
	emits: [ 'language-changed' ],
	setup( props, { emit } ) {
		const i18n = inject( 'i18n' );
		const store = useMainStore();

		const naturalLanguageType = Constants.Z_NATURAL_LANGUAGE;

		/**
		 * Returns the available languages for the function definition,
		 * which includes Name, Description, Aliases and Input labels.
		 *
		 * @return {Array}
		 */
		const functionLanguages = computed( () => store.getMultilingualDataLanguages.all );

		/**
		 * Returns the id for the language field
		 *
		 * @return {string}
		 */
		const languageFieldId = computed( () => 'ext-wikilambda-app-function-editor-language__label-id' );

		/**
		 * Returns the label for the language field
		 *
		 * TODO (T335583): Replace i18n message with key label
		 * return getLabelData( Constants.Z_MONOLINGUALSTRING_LANGUAGE );
		 *
		 * @return {string}
		 */
		const languageLabel = computed( () => i18n( 'wikilambda-languagelabel' ).text() );

		/**
		 * Whether the language selector has a value or is empty
		 *
		 * @return {boolean}
		 */
		const hasLanguage = computed( () => !!props.zLanguage );

		/**
		 * Emits a change event when the selector is set to a new language.
		 *
		 * @param {string} lang
		 */
		const addNewLanguage = ( lang ) => {
			emit( 'language-changed', lang );
		};

		return {
			addNewLanguage,
			functionLanguages,
			hasLanguage,
			languageFieldId,
			languageLabel,
			naturalLanguageType
		};
	}
} );
</script>
