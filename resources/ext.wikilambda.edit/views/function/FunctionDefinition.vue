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
				<div class="ext-wikilambda-function-definition__container__input__language">
					<fn-editor-zlanguage-selector
						v-if="isNewZObject === true || labelLanguage.readonly === false"
						class="ext-wikilambda-function-definition__container__input__language__selector"
						:z-language="labelLanguage.zLang"
						@change="function ( value ) {
							return setInputLangByIndex( value, index )
						}"
					>
					</fn-editor-zlanguage-selector>
					<span v-else class="ext-wikilambda-function-definition__container__input__language__title">
						{{ labelLanguage.label ? labelLanguage.label : labelLanguage.zLang }}:
					</span>
				</div>
				<!-- component that displays names for a language -->
				<function-definition-name
					:z-lang="labelLanguage.zLang"
					:is-main-z-object="index === 0"
				></function-definition-name>
				<!-- component that displays aliases for a language -->
				<function-definition-aliases
					:z-lang="labelLanguage.zLang"
					:is-main-z-object="index === 0"
				></function-definition-aliases>
				<function-definition-inputs
					:is-mobile="isMobile"
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
		<cdx-message
			v-if="showToast"
			:dismiss-button-label="$i18n( 'wikilambda-toast-close' ).text()"
			:type="toastIntent"
			:auto-dismiss="true"
			@user-dismissed="closeToast"
			@auto-dismissed="closeToast"
		>
			{{ currentToast }}
		</cdx-message>

		<function-definition-footer
			:is-editing="isEditingExistingFunction"
			@publish="validateInputOutputTypeChanged"
			@cancel="handleCancel"
		></function-definition-footer>

		<dialog-container
			ref="dialogBox"
			:title="dialogInfo.title"
			:description="dialogInfo.description"
			:cancel-button-text="dialogInfo.cancelButtonText"
			:confirm-button-text="dialogInfo.confirmButtonText"
			@confirm-dialog="dialogInfo.onConfirm">
		</dialog-container>
	</main>
</template>

<script>
var FunctionDefinitionName = require( '../../components/function/definition/FunctionDefinitionName.vue' );
var FunctionDefinitionAliases = require( '../../components/function/definition/FunctionDefinitionAliases.vue' );
var FunctionDefinitionInputs = require( '../../components/function/definition/FunctionDefinitionInputs.vue' );
var FunctionDefinitionOutput = require( '../../components/function/definition/FunctionDefinitionOutput.vue' );
var FunctionDefinitionFooter = require( '../../components/function/definition/FunctionDefinitionFooter.vue' );
var FnEditorZLanguageSelector = require( '../../components/editor/FnEditorZLanguageSelector.vue' );
var useBreakpoints = require( '../../composables/useBreakpoints.js' );
var icons = require( '../../../lib/icons.json' );
var mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions;
var Constants = require( '../../Constants.js' );
var typeUtils = require( '../../mixins/typeUtils.js' );
var CdxButton = require( '@wikimedia/codex' ).CdxButton,
	CdxMessage = require( '@wikimedia/codex' ).CdxMessage,
	DialogContainer = require( '../../components/base/DialogContainer.vue' );

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
		'cdx-button': CdxButton,
		'cdx-message': CdxMessage,
		'dialog-container': DialogContainer
	},
	mixins: [ typeUtils ],
	setup: function () {
		var breakpoint = useBreakpoints( Constants.breakpoints );
		return {
			breakpoint
		};
	},
	data: function () {
		return {
			currentToast: null,
			toastIntent: 'success',
			labelLanguages: [],
			initialInputTypes: [],
			initialOutputType: '',
			dialogInfo: {
				title: '',
				description: '',
				cancelButtonText: '',
				confirmButtonText: '',
				onConfirm: ''
			}
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
		'getZObjectInitialized',
		'getZargumentsArray',
		'getNestedZObjectById'
	] ),
	mapGetters(
		'router',
		[ 'getQueryParams' ]
	),
	{
		isMobile: function () {
			return this.breakpoint.current.value === Constants.breakpointsTypes.MOBILE;
		},
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
					if ( label[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ] ) {
						languageList.push(
							label[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ][ Constants.Z_REFERENCE_ID ]
						);
					}
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
					if ( alias[ Constants.Z_MONOLINGUALSTRINGSET_LANGUAGE ] ) {
						var lang = alias[ Constants.Z_MONOLINGUALSTRINGSET_LANGUAGE ][ Constants.Z_REFERENCE_ID ];

						if ( languageList.indexOf( lang ) === -1 ) {
							languageList.push( lang );
						}
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
		},
		currentInputs: function () {
			return this.getZargumentsArray() || [];
		},
		currentOutput: function () {
			return this.getNestedZObjectById( 0, [
				Constants.Z_PERSISTENTOBJECT_VALUE,
				Constants.Z_FUNCTION_RETURN_TYPE,
				Constants.Z_REFERENCE_ID
			] ) || '';
		}
	} ),
	methods: $.extend( mapActions( [
		'setCurrentZLanguage',
		'submitZObject',
		'changeType'
	] ), {
		publishSuccessful: function ( toastMessage ) {
			this.toastIntent = 'success';
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
		 * @param {Boolean} shouldUnattachImplentationAndTester
		 */
		handlePublish: function ( summary, shouldUnattachImplentationAndTester ) {
			if ( this.dialogInfo.title ) {
				this.resetDialogInfo();
				this.$refs.dialogBox.closeDialog();
			}

			const context = this;
			this.submitZObject( { summary, shouldUnattachImplentationAndTester } ).then( function ( pageTitle ) {
				if ( pageTitle ) {
					window.location.href = new mw.Title( pageTitle ).getUrl();
				}
			} ).catch( function ( error ) {
				context.toastIntent = 'error';
				context.currentToast = error.error.message;
			} );
		},
		changeTypeToFunction: function () {
			var zObject = this.getZObjectChildrenById( 0 ); // We fetch the Root object
			var Z2K2 =
				this.findKeyInArray( Constants.Z_PERSISTENTOBJECT_VALUE, zObject );
			this.changeType( {
				id: Z2K2.id,
				type: Constants.Z_FUNCTION
			} );
		},
		validateInputTypeChanged: function () {
			let inputTypeChanged = false;
			if ( this.currentInputs.length === this.initialInputTypes.length ) {
				for ( let index = 0; index < this.currentInputs.length; index++ ) {
					const input = this.currentInputs[ index ];
					if ( input.type.zid !== this.initialInputTypes[ index ] ) {
						inputTypeChanged = true;
					}
				}
			} else {
				inputTypeChanged = true;
			}

			return inputTypeChanged;
		},
		validateOutputTypeChanged: function () {
			return this.currentOutput.value !== this.initialOutputType;
		},
		validateInputOutputTypeChanged: function ( summary ) {
			if ( this.isEditingExistingFunction &&
				( this.validateInputTypeChanged() || this.validateOutputTypeChanged() )
			) {
				this.dialogInfo = {
					title: this.$i18n( 'wikilambda-function-are-you-sure-dialog-header' ).text(),
					description: this.$i18n( 'wikilambda-publish-impact-prompt' ).text(),
					cancelButtonText: this.$i18n( 'wikilambda-continue-editing' ).text(),
					confirmButtonText: this.$i18n( 'wikilambda-publishnew' ).text(),
					onConfirm: function () { return this.handlePublish( summary, true ); }.bind( this )
				};
				this.$refs.dialogBox.openDialog();
			} else if ( !this.isEditingExistingFunction && this.isMobile ) {
				this.dialogInfo = {
					title: this.$i18n( 'wikilambda-publishnew' ).text(),
					description: this.$i18n( 'wikilambda-special-function-definition-publish-description' ).text(),
					cancelButtonText: this.$i18n( 'wikilambda-cancel' ).text(),
					confirmButtonText: this.$i18n( 'wikilambda-confirm' ).text(),
					onConfirm: function () {
						this.resetDialogInfo();
						this.$refs.dialogBox.closeDialog();
						this.handlePublish( summary, true );
					}.bind( this )
				};
				this.$refs.dialogBox.openDialog();
			} else {
				this.handlePublish( summary );
			}
		},
		handleCancel: function () {
			// if leaving without saving edits
			if ( this.isEditingExistingFunction ) {
				this.dialogInfo = {
					title: this.$i18n( 'wikilambda-function-are-you-sure-dialog-header' ).text(),
					description: this.$i18n( 'wikilambda-function-are-you-sure-dialog-description' ).text(),
					cancelButtonText: this.$i18n( 'wikilambda-continue-editing' ).text(),
					confirmButtonText: this.$i18n( 'wikilambda-discard-edits' ).text(),
					onConfirm: this.confirmCancel
				};
				this.$refs.dialogBox.openDialog();
			} else {
				// if not editing, go to previous page
				history.back();
			}
		},
		confirmCancel: function () {
			this.resetDialogInfo();
			this.$refs.dialogBox.closeDialog();
			window.location.href = new mw.Title( this.getQueryParams.title ).getUrl();
		},
		resetDialogInfo: function () {
			this.dialogInfo = {
				title: '',
				description: '',
				cancelButtonText: '',
				confirmButtonText: '',
				onConfirm: ''
			};
		}
	} ),
	watch: {
		currentInputs: {
			immediate: true,
			handler: function () {
				if ( this.initialInputTypes.length === 0 ) {
					this.initialInputTypes = this.currentInputs.map( ( inputs ) => {
						return inputs.type.zid || '';
					} );
				}
			}
		},
		currentOutput: {
			immediate: true,
			handler: function () {
				if ( this.initialOutputType === '' ) {
					this.initialOutputType = this.currentOutput.value;
				}
			}
		},
		/**
		 * show a toast once the user has filled out the requirements and a function can be published
		 */
		ableToPublish: {
			immediate: true,
			handler: function ( status ) {
				if ( status ) {
					this.toastIntent = 'success';
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
		if ( this.isNewZObject ) {
			this.changeTypeToFunction();
		}
	}
};
</script>

<style lang="less">
@import './../../../lib/wikimedia-ui-base.less';

.ext-wikilambda-function-definition {
	&__container {
		padding-top: 20px;

		&__input {
			margin-bottom: 40px;

			&__language {
				margin-bottom: 15px;

				&__selector {
					margin-bottom: 40px;
					display: flex;
				}

				&__title {
					font-size: 2em;
				}
			}
		}
	}

	&__action-add-input {
		height: 40px;
		margin: 40px 0;

		button {
			height: 100%;
			font-weight: bold;
			background: transparent;
			border: 0;
			color: @wmui-color-base0;
		}
	}

	@media screen and ( min-width: @width-breakpoint-tablet ) {
		&__container {
			border: 1px solid @wmui-color-base80;
			max-height: 450px;
			padding-left: 27px;
			overflow-y: scroll;
		}

		&__action-add-input {
			background: @wmui-color-base80;
			margin: 0;

			button {
				padding-left: 27px;
				padding-right: 27px;
			}
		}
	}
}
</style>
