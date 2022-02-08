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
				class="ext-wikilambda-function-definition__container__input">
				<fn-editor-zlanguage-selector
					class="ext-wikilambda-function-definition__container__input__language-selector"
					:z-language="labelLanguage.zLang"
					@change="function ( value ) {
						return setInputLangByIndex( value, index )
					}"
				></fn-editor-zlanguage-selector>
				<function-definition-name
					:z-lang="labelLanguage.zLang"
					:is-main-z-object="index === 0"
				></function-definition-name>
				<function-definition-aliases :z-lang="labelLanguage.zLang"></function-definition-aliases>
				<function-definition-inputs
					:z-lang="labelLanguage.zLang"
					:is-main-z-object="index === 0"
				></function-definition-inputs>
				<template v-if="index === 0">
					<function-definition-output></function-definition-output>
				</template>
			</div>
		</div>
		<div class="ext-wikilambda-function-definition__action-add-input">
			<button
				@click="addLabelInOtherLanguages"
			>
				+ Add labels in another language
			</button>
		</div>
		<toast
			v-if="showToast"
			:icon="toastIcon"
			:intent="toastIntent"
			:timeout="toastTimeout"
			:message="currentToast"
			@toast-close="closeToast"
		></toast>
		<function-definition-footer></function-definition-footer>
	</main>
</template>

<script>
var FunctionDefinitionName = require( '../components/function/definition/function-definition-name.vue' );
var FunctionDefinitionAliases = require( '../components/function/definition/function-definition-aliases.vue' );
var FunctionDefinitionInputs = require( '../components/function/definition/function-definition-inputs.vue' );
var FunctionDefinitionOutput = require( '../components/function/definition/function-definition-output.vue' );
var FunctionDefinitionFooter = require( '../components/function/definition/function-definition-footer.vue' );
var FnEditorZLanguageSelector = require( '../components/editor/FnEditorZLanguageSelector.vue' );
var Toast = require( '../components/base/Toast.vue' );
var icons = require( './../../../lib/icons.js' );
var mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions;

// @vue/component
module.exports = {
	name: 'function-definition',
	components: {
		'function-definition-name': FunctionDefinitionName,
		'function-definition-aliases': FunctionDefinitionAliases,
		'function-definition-inputs': FunctionDefinitionInputs,
		'function-definition-output': FunctionDefinitionOutput,
		'function-definition-footer': FunctionDefinitionFooter,
		'fn-editor-zlanguage-selector': FnEditorZLanguageSelector,
		toast: Toast
	},
	data: function () {
		return {
			labelLanguages: [
				{
					label: '',
					zLang: ''
				}
			],
			currentToast: null
		};
	},
	computed: $.extend( mapGetters( [
		'getZkeyLabels',
		'getCurrentZLanguage',
		'currentZFunctionHasInputs',
		'currentZFunctionHasOutput'
	] ),
	{
		ableToPublish: function () {
			if ( this.currentZFunctionHasInputs && this.currentZFunctionHasOutput ) {
				return true;
			}
			return false;
		},
		toastIcon: function () {
			return icons.sdIconCheck;
		},
		toastIntent: function () {
			return 'SUCCESS';
		},
		toastTimeout: function () {
			return 2000;
		},
		showToast: function () {
			return this.currentToast !== null;
		}
	} ),
	methods: $.extend( mapActions( [
		'setCurrentZLanguage'
	] ), {
		publishSuccessful: function ( toastMessage ) {
			this.currentToast = toastMessage;
		},
		closeToast: function () {
			this.currentToast = null;
		},
		addLabelInOtherLanguages: function () {
			const hasSingleLanguage = this.labelLanguages.length === 1;
			const hasMultipleLanguage = this.labelLanguages.length > 1;
			const lastLanguageHasLabel = hasMultipleLanguage &&
				!!this.labelLanguages[ this.labelLanguages.length - 1 ].label;
			if ( hasSingleLanguage || lastLanguageHasLabel ) {
				this.labelLanguages.push(
					{
						label: '',
						zLang: ''
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
		}
	} ),
	watch: {
		ableToPublish: {
			immediate: true,
			handler: function ( status ) {
				if ( status ) {
					this.currentToast = this.$i18n( 'wikilambda-function-definition-can-publish-message' ).text();
				}
			}
		}
	},
	mounted: function () {
		// set first input to currentlanguage
		this.labelLanguages[ 0 ] = {
			label: this.getZkeyLabels[ this.getCurrentZLanguage ],
			zLang: this.getCurrentZLanguage
		};
	}
};
</script>

<style lang="less">
@import './../../lib/wikimedia-ui-base.less';

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
