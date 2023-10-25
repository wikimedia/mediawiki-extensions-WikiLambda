<!--
	WikiLambda Vue component for the selection of a ZNaturalLanguage object inside the Function editor.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-function-language-selector">
		<div class="ext-wikilambda-function-language-selector__label">
			<label
				id="ext-wikilambda-function-language-selector__add-language-label"
				class="ext-wikilambda-app__text-regular"
			>
				{{ languageLabel }}
			</label>
		</div>
		<wl-z-object-selector
			class="ext-wikilambda-function-language-selector__add-language"
			aria-labelledby="ext-wikilambda-function-language-selector__add-language-label"
			:disabled="hasLanguage"
			:exclude-zids="functionLanguages"
			:selected-zid="zLanguage"
			:type="naturalLanguageType"
			@input="addNewLanguage"
		></wl-z-object-selector>
	</div>
</template>

<script>
const Constants = require( '../../../Constants.js' ),
	ZObjectSelector = require( '../../ZObjectSelector.vue' ),
	mapGetters = require( 'vuex' ).mapGetters;

// @vue/component
module.exports = exports = {
	name: 'wl-function-editor-language',
	components: {
		'wl-z-object-selector': ZObjectSelector
	},
	props: {
		zLanguage: {
			type: String,
			default: ''
		}
	},
	emits: [ 'change' ],
	data: function () {
		return {
			naturalLanguageType: Constants.Z_NATURAL_LANGUAGE
		};
	},
	computed: $.extend( mapGetters( [
		'getZFunctionLanguages'
	] ), {
		/**
		 * Returns the available languages for the function definition,
		 * which includes Name, Description, Aliases and Input labels.
		 *
		 * @return {Array}
		 */
		functionLanguages: function () {
			return this.getZFunctionLanguages( this.rowId );
		},
		/**
		 * Returns the label for the language field
		 *
		 * @return {string}
		 */
		languageLabel: function () {
			// TODO (T335583): Replace i18n message with key label
			// return this.getLabel( Constants.Z_MONOLINGUALSTRING_LANGUAGE );
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
			this.$emit( 'change', lang );
		}
	}
};
</script>

<style lang="less">
@import '../../../ext.wikilambda.edit.less';

.ext-wikilambda-function-language-selector {
	display: flex;
	margin-bottom: @spacing-150;

	&__label {
		display: flex;
		flex-direction: column;
		width: @wl-field-label-width;
		margin-right: @spacing-150;

		& > label {
			line-height: @size-200;
			font-weight: @font-weight-bold;

			& > span {
				font-weight: @font-weight-normal;
			}
		}
	}

	@media screen and ( max-width: @max-width-breakpoint-mobile ) {
		& {
			flex-direction: column;
		}

		&__label {
			& > label {
				line-height: inherit;
				margin-bottom: @spacing-25;
			}
		}
	}
}
</style>
