<!--
	WikiLambda Vue componen for function editor language block. Contains all
	the function fields for a given input language.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div
		class="ext-wikilambda-app-function-editor-language-block"
		data-testid="function-editor-language-block"
	>
		<!-- component that displays the language selector -->
		<wl-function-editor-language
			class="ext-wikilambda-app-function-editor-language-block__row"
			data-testid="function-editor-language-selector"
			:z-language="zLanguage"
			@change="changeLanguage"
		></wl-function-editor-language>
		<!-- component that displays name for a language -->
		<wl-function-editor-name
			class="ext-wikilambda-app-function-editor-language-block__row"
			data-testid="function-editor-name-input"
			:z-language="zLanguage"
			:lang-label-data="langLabelData"
			@updated-name="updatedLabels"
		></wl-function-editor-name>
		<!-- component that displays the description for a language -->
		<wl-function-editor-description
			class="ext-wikilambda-app-function-editor-language-block__row"
			data-testid="function-editor-description-input"
			:z-language="zLanguage"
			:lang-label-data="langLabelData"
			@updated-description="updatedLabels"
		></wl-function-editor-description>
		<!-- component that displays aliases for a language -->
		<wl-function-editor-aliases
			class="ext-wikilambda-app-function-editor-language-block__row"
			data-testid="function-editor-alias-input"
			:z-language="zLanguage"
			@updated-alias="updatedLabels"
		></wl-function-editor-aliases>
		<!-- component that displays list of inputs for a language -->
		<wl-function-editor-inputs
			class="ext-wikilambda-app-function-editor-language-block__row"
			data-testid="function-editor-inputs"
			:z-language="zLanguage"
			:is-main-language-block="isMainLanguageBlock"
			:can-edit="canEditFunction"
			:lang-label-data="langLabelData"
			:tooltip-icon="icons.cdxIconLock"
			:tooltip-message="adminTooltipMessage"
			@updated-argument-label="updatedLabels"
		></wl-function-editor-inputs>
		<!-- component that displays output for a language -->
		<wl-function-editor-output
			v-if="isMainLanguageBlock"
			class="ext-wikilambda-app-function-editor-language-block__row"
			data-testid="function-editor-output"
			:can-edit="canEditFunction"
			:tooltip-icon="icons.cdxIconLock"
			:tooltip-message="adminTooltipMessage"
		></wl-function-editor-output>
	</div>
</template>

<script>
const { defineComponent } = require( 'vue' );
const FunctionEditorLanguage = require( './FunctionEditorLanguage.vue' ),
	FunctionEditorName = require( './FunctionEditorName.vue' ),
	FunctionEditorDescription = require( './FunctionEditorDescription.vue' ),
	FunctionEditorAliases = require( './FunctionEditorAliases.vue' ),
	FunctionEditorInputs = require( './FunctionEditorInputs.vue' ),
	FunctionEditorOutput = require( './FunctionEditorOutput.vue' ),
	icons = require( '../../../../lib/icons.json' ),
	{ mapGetters } = require( 'vuex' );

module.exports = exports = defineComponent( {
	name: 'wl-function-editor-language-block',
	components: {
		'wl-function-editor-language': FunctionEditorLanguage,
		'wl-function-editor-name': FunctionEditorName,
		'wl-function-editor-description': FunctionEditorDescription,
		'wl-function-editor-aliases': FunctionEditorAliases,
		'wl-function-editor-inputs': FunctionEditorInputs,
		'wl-function-editor-output': FunctionEditorOutput
	},
	props: {
		zLanguage: {
			type: String,
			required: true
		},
		index: {
			type: Number,
			default: 0
		}
	},
	data: function () {
		return {
			icons: icons
		};
	},
	computed: Object.assign( mapGetters( [
		'isCreateNewPage',
		'isUserLoggedIn',
		'getLabelDataForLangCode'
	] ), {
		/**
		 * Returns whether the current language block is the first (main) one
		 *
		 * @return {boolean}
		 */
		isMainLanguageBlock: function () {
			return this.index === 0;
		},
		/**
		 * Returns whether the user can edit the function
		 *
		 * @return {boolean}
		 */
		canEditFunction: function () {
			// TODO (T301667): restrict to only certain user roles
			return this.isCreateNewPage ? true : this.isUserLoggedIn;
		},
		/**
		 * Message for admin tooltip to show in both Input and Output components
		 *
		 * @return {string}
		 */
		adminTooltipMessage: function () {
			// TODO (T299604): Instead of just "users with special permissions", once the right exists we should
			// actually check which group has the right, fetch its display name, and display it in this text.
			return this.$i18n( 'wikilambda-editor-fn-edit-definition-tooltip-content' ).text();
		},
		/**
		 * Returns the label data of the blocks language
		 *
		 * @return {LabelData}
		 */
		langLabelData: function () {
			return this.getLabelDataForLangCode( this.zLanguage );
		}
	} ),
	methods: {
		/**
		 * Emits a setLanguage event to set the language block
		 * to the given language.
		 *
		 * @param {string} value
		 */
		changeLanguage: function ( value ) {
			this.$emit( 'set-language', {
				language: value,
				index: this.index
			} );
		},
		/**
		 * Emits a updatedLabels event for the root function
		 * definition to track label changes.
		 */
		updatedLabels: function () {
			this.$emit( 'updated-labels' );
		}
	}
} );
</script>

<style lang="less">
@import '../../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-function-editor-language-block {
	padding-top: @spacing-150;
	border-bottom: 1px solid @border-color-subtle;

	&:first-child {
		border-top: 1px solid @border-color-subtle;
	}

	.ext-wikilambda-app-function-editor-language-block__row {
		display: flex;
		margin-bottom: @spacing-150;
		gap: @spacing-100;

		@media screen and ( max-width: @max-width-breakpoint-mobile ) {
			flex-direction: column;
		}
	}
}
</style>
