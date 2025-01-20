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

const { defineComponent } = require( 'vue' );
const Constants = require( '../../../Constants.js' ),
	useMainStore = require( '../../../store/index.js' ),
	FunctionEditorField = require( './FunctionEditorField.vue' ),
	ZObjectSelector = require( '../../base/ZObjectSelector.vue' ),
	{ mapState } = require( 'pinia' );

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
	data: function () {
		return {
			naturalLanguageType: Constants.Z_NATURAL_LANGUAGE
		};
	},
	computed: Object.assign( {}, mapState( useMainStore, [
		'getMultilingualDataLanguages'
	] ), {
		/**
		 * Returns the available languages for the function definition,
		 * which includes Name, Description, Aliases and Input labels.
		 *
		 * @return {Array}
		 */
		functionLanguages: function () {
			return this.getMultilingualDataLanguages();
		},
		/**
		 * Returns the id for the language field
		 *
		 * @return {string}
		 */
		languageFieldId: function () {
			return 'ext-wikilambda-app-function-editor-language__label-id';
		},
		/**
		 * Returns the label for the language field
		 *
		 * @return {string}
		 */
		languageLabel: function () {
			// TODO (T335583): Replace i18n message with key label
			// return this.getLabelData( Constants.Z_MONOLINGUALSTRING_LANGUAGE );
			return this.$i18n( 'wikilambda-languagelabel' ).text();
		},
		/**
		 * Whether the language selector has a value or is empty
		 *
		 * @return {boolean}
		 */
		hasLanguage: function () {
			return !!this.zLanguage;
		}
	} ),
	methods: {
		/**
		 * Emits a change event when the selector is set to a new language.
		 *
		 * @param {string} lang
		 */
		addNewLanguage: function ( lang ) {
			this.$emit( 'language-changed', lang );
		}
	}
} );
</script>
