<template>
	<!--
		WikiLambda Vue component for the definition tab in the ZFunction Editor.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<main class="ext-wikilambda-function-definition">
		<div id="fnDefinitionContainer" class="ext-wikilambda-function-definition__container">
			<div
				v-for="( labelLanguage, index ) in labelLanguages"
				:key="index"
				class="ext-wikilambda-function-definition__container__input"
			>
				<fn-editor-zlanguage-selector
					v-if="isNewZObject === true || labelLanguage.readonly === false"
					class="ext-wikilambda-function-definition__container__input__language-selector"
					:z-language="labelLanguage.zLang"
					@change="function ( value ) {
						return setInputLangByIndex( value, index )
					}"
				>
				</fn-editor-zlanguage-selector>
				<span v-else class="ext-wikilambda-function-definition__container__input__language-title">
					{{ labelLanguage.label ? labelLanguage.label : labelLanguage.zLang }}:
				</span>
				<!-- component that displays names for a language -->
				<function-definition-name
					:z-lang="labelLanguage.zLang"
					:is-main-z-object="index === 0"
				></function-definition-name>
				<!-- component that displays aliases for a language -->
				<function-definition-aliases :z-lang="labelLanguage.zLang"></function-definition-aliases>
				<function-definition-inputs
					:z-lang="labelLanguage.zLang"
					:is-main-z-object="index === 0"
					:is-editing="isEditingExistingFunction"
					:tooltip-icon="adminTooltipIcon"
					:tooltip-message="adminTooltipMessage"
				></function-definition-inputs>
				<template v-if="index === 0">
					<function-definition-output
						:is-editing="isEditingExistingFunction"
						:tooltip-icon="adminTooltipIcon"
						:tooltip-message="adminTooltipMessage"
					></function-definition-output>
				</template>
			</div>
		</div>
		<div class="ext-wikilambda-function-definition__action-add-input">
			<cdx-button
				type="quiet"
				@click="addLabelInOtherLanguages"
			>
				{{ $i18n( 'wikilambda-function-definition-add-other-label-languages-title' ).text() }}
			</cdx-button>
		</div>
		<toast
			v-if="showToast"
			:icon="toastIcon"
			:intent="toastIntent"
			:timeout="toastTimeout"
			:message="currentToast"
			@toast-close="closeToast"
		></toast>
		<function-definition-footer
			:is-editing="isEditingExistingFunction"
			@publish="handlePublish"
		></function-definition-footer>
	</main>
</template>

<script>
var FunctionDefinitionName = require( '../../components/function/definition/function-definition-name.vue' );
var FunctionDefinitionAliases = require( '../../components/function/definition/function-definition-aliases.vue' );
var FunctionDefinitionInputs = require( '../../components/function/definition/function-definition-inputs.vue' );
var FunctionDefinitionOutput = require( '../../components/function/definition/function-definition-output.vue' );
var FunctionDefinitionFooter = require( '../../components/function/definition/function-definition-footer.vue' );
var FnEditorZLanguageSelector = require( '../../components/editor/FnEditorZLanguageSelector.vue' );
var Toast = require( '../../components/base/Toast.vue' );
var icons = require( '../../../lib/icons.json' );
var mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions;
var Constants = require( '../../Constants.js' );
var typeUtils = require( '../../mixins/typeUtils.js' );
var CdxButton = require( '@wikimedia/codex' ).CdxButton;

// @vue/component
module.exports = exports = {
	name: 'function-definition',
	components: {
		'function-definition-name': FunctionDefinitionName,
		'function-definition-aliases': FunctionDefinitionAliases,
		'function-definition-inputs': FunctionDefinitionInputs,
		'function-definition-output': FunctionDefinitionOutput,
		'function-definition-footer': FunctionDefinitionFooter,
		'fn-editor-zlanguage-selector': FnEditorZLanguageSelector,
		toast: Toast,
		'cdx-button': CdxButton
	},
	mixins: [ typeUtils ],
	data: function () {
		return {
			currentToast: null,
			toastIntent: 'SUCCESS',
			labelLanguages: []
		};
	},
	computed: $.extend( mapGetters( [
		'getZkeyLabels',
		'getCurrentZLanguage',
		'currentZFunctionHasInputs',
		'currentZFunctionHasOutput',
		'isNewZObject',
		'getViewMode',
		'getZObjectChildrenById',
		'getZObjectAsJsonById',
		'getCurrentLanguageZkeyLabels',
		'getAllZKeyLanguageLabels'
	] ),
	{
		/**
		 * A function can be published if it has at least one input and an output
		 *
		 * @return {boolean} if a function is able to be published
		 */
		ableToPublish: function () {
			if ( this.currentZFunctionHasInputs && this.currentZFunctionHasOutput ) {
				return true;
			}
			return false;
		},
		/**
		 * icon for toast
		 *
		 * @return {Object}
		 */
		toastIcon: function () {
			return icons.cdxIconCheck;
		},
		/**
		 * timeout for toast
		 *
		 * @return {number}
		 */
		toastTimeout: function () {
			return 2000;
		},
		/**
		 * if toast should be shown
		 *
		 * @return {boolean}
		 */
		showToast: function () {
			return this.currentToast !== null;
		},
		/**
		 * if currently editing the loaded function
		 *
		 * @return {boolean}
		 */
		isEditingExistingFunction: function () {
			return !this.isNewZObject && !this.getViewMode;
		},
		/**
		 * icon for admin tooltip
		 *
		 * @return {Object}
		 */
		adminTooltipIcon: function () {
			return icons.cdxIconInfoFilled;
		},
		/**
		 * message for admin tooltip
		 *
		 * @return {string}
		 */
		adminTooltipMessage: function () {
			return this.$i18n( 'wikilambda-editor-fn-edit-definition-tooltip-content' ).text();
		},
		/**
		 * zobject ID
		 *
		 * @return {number}
		 */
		zobjectId: function () {
			return this.getZkeyLabels[ 0 ];
		},
		/**
		 * zobjectId
		 *
		 * @return {number}
		 */
		zobject: function () {
			return this.getZObjectChildrenById( this.zobjectId );
		},
		/**
		 * id for zObjectLabel
		 *
		 * @return {number}
		 */
		zObjectLabelId: function () {
			return this.findKeyInArray( Constants.Z_PERSISTENTOBJECT_LABEL, this.zobject ).id;
		},
		/**
		 * id for zObjectAlias
		 *
		 * @return {number}
		 */
		zObjectAliasId: function () {
			return this.findKeyInArray( Constants.Z_PERSISTENTOBJECT_ALIASES, this.zobject ).id;
		},
		/**
		 * list of labels for a given zObject
		 *
		 * @return {Array}
		 */
		zObjectLabels: function () {
			return this.getZObjectAsJsonById( this.zObjectLabelId );
		},
		/**
		 * list of aliases for a given zObject
		 *
		 * @return {Array}
		 */
		zObjectAliases: function () {
			return this.getZObjectAsJsonById( this.zObjectAliasId );
		},
		/**
		 * get all the existing languages for the current function
		 * these languages could be used for labels and/or aliases
		 *
		 * @return {Array} list of formatted languages
		 */
		selectedLanguages: function () {
			var languageList = [];

			// Don't break if the labels are set to {}
			// find all languages used for labels
			if ( this.zObjectLabels && this.zObjectLabels[
				Constants.Z_PERSISTENTOBJECT_LABEL
			][
				Constants.Z_MULTILINGUALSTRING_VALUE
			] ) {
				this.zObjectLabels[
					Constants.Z_PERSISTENTOBJECT_LABEL
				][
					Constants.Z_MULTILINGUALSTRING_VALUE
				].forEach( function ( label ) {
					languageList.push( label[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ][ Constants.Z_REFERENCE_ID ] );
				} );
			}

			// Don't break if the aliases are set to {}
			// find all languages used for aliases
			if ( this.zObjectAliases && this.zObjectAliases[
				Constants.Z_PERSISTENTOBJECT_ALIASES
			][
				Constants.Z_MULTILINGUALSTRINGSET_VALUE
			] ) {
				this.zObjectAliases[
					Constants.Z_PERSISTENTOBJECT_ALIASES
				][
					Constants.Z_MULTILINGUALSTRINGSET_VALUE
				].forEach( function ( alias ) {
					var lang = alias[ Constants.Z_MONOLINGUALSTRINGSET_LANGUAGE ][ Constants.Z_REFERENCE_ID ];

					if ( languageList.indexOf( lang ) === -1 ) {
						languageList.push( lang );
					}
				} );
			}

			var formattedLanguages = [];

			for ( var item in languageList ) {
				formattedLanguages.push( {
					zLang: languageList[ item ],
					label: this.getZkeyLabels[ languageList[ item ] ], // get the label for the language zId
					readOnly: true
				} );
			}
			return formattedLanguages;
		}
	} ),
	methods: $.extend( mapActions( [
		'setCurrentZLanguage',
		'submitZObject'
	] ), {
		publishSuccessful: function ( toastMessage ) {
			this.toastIntent = 'SUCCESS';
			this.currentToast = toastMessage;
		},
		closeToast: function () {
			this.currentToast = null;
		},
		/**
		 * Gets called when user clicks on the button
		 * adds another language label section
		 */
		addLabelInOtherLanguages: function () {
			const hasSingleLanguage = this.labelLanguages.length === 1;
			const hasMultipleLanguage = this.labelLanguages.length > 1;
			const lastLanguageHasLabel = hasMultipleLanguage &&
				!!this.labelLanguages[ this.labelLanguages.length - 1 ].label;

			if ( hasSingleLanguage || lastLanguageHasLabel ) {
				this.labelLanguages.push(
					{
						label: '',
						zLang: '',
						readonly: false
					} );

				// Scroll to new labelLanguage container after it has been added
				setTimeout( function () {
					const fnDefinitionContainer = document.getElementById( 'fnDefinitionContainer' );
					fnDefinitionContainer.scrollTop = fnDefinitionContainer.scrollHeight;
				}, 0 );
			}
		},
		setInputLangByIndex: function ( lang, index ) {
			// If index is zero, set currentZLanguage as lang.zLang
			if ( index === 0 ) {
				this.setCurrentZLanguage( lang.zLang );
			}

			this.labelLanguages[ index ] = lang;
		},
		/**
		 * publish function changes and redirect to the view page
		 *
		 * @param {Object} summary
		 */
		handlePublish: function ( summary ) {
			const context = this;
			this.submitZObject( summary ).then( function ( pageTitle ) {
				if ( pageTitle ) {
					window.location.href = new mw.Title( pageTitle ).getUrl();
				}
			} ).catch( function ( error ) {
				context.toastIntent = 'FAILURE';
				context.currentToast = error.error.message;
			} );
		}
	} ),
	watch: {
		/**
		 * show a toast once the user has filled out the requirements and a function can be published
		 */
		ableToPublish: {
			immediate: true,
			handler: function ( status ) {
				if ( status ) {
					this.toastIntent = 'SUCCESS';
					this.currentToast = this.$i18n( 'wikilambda-function-definition-can-publish-message' ).text();
				}
			}
		},
		selectedLanguages: {
			handler: function () {
				if ( this.labelLanguages.length === 0 &&
					this.selectedLanguages[ this.selectedLanguages.length - 1 ].label !== undefined ) {
					this.labelLanguages = this.selectedLanguages;
				}
			}
		}
	},
	mounted: function () {
		if ( !this.zObjectLabels ) {
			this.labelLanguages.push( {
				label: this.getZkeyLabels[ this.getCurrentZLanguage ],
				zLang: this.getCurrentZLanguage,
				readonly: false
			} );
		}
	}
};
</script>

<style lang="less">
@import './../../../lib/wikimedia-ui-base.less';

.ext-wikilambda-function-definition {
	&__container {
		padding-top: 20px;
		padding-left: 27px;
		border: 1px solid @wmui-color-base80;
		max-height: 450px;
		overflow-y: scroll;

		&__input {
			margin-bottom: 40px;

			&__language-selector {
				margin-bottom: 40px;
			}

			&__language-title {
				font-size: 2em;
			}
		}
	}

	&__action-add-input {
		height: 40px;
		background: @wmui-color-base80;

		button {
			height: 100%;
			padding: 10px 27px;
			font-weight: bold;
			background: transparent;
			border: 0;
			color: @wmui-color-base0;
		}
	}
}
</style>
