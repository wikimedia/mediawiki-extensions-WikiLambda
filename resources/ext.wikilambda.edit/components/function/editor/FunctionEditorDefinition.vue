<template>
	<!--
		WikiLambda Vue component for the definition tab in the ZFunction Editor.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<main class="ext-wikilambda-function-definition">
		<!-- Function Definition -->
		<div
			ref="fnDefinitionContainer"
			class="ext-wikilambda-function-definition__container">
			<div
				v-for="( labelLanguage, index ) in labelLanguages"
				:key="index"
				class="ext-wikilambda-function-definition__container__input"
			>
				<div class="ext-wikilambda-function-definition__container__input__language">
					<wl-function-editor-language
						class="ext-wikilambda-function-definition__container__input__language__selector"
						:z-language="labelLanguage.zLang"
						@change="function ( value ) {
							return setInputLangByIndex( value, index )
						}"
					>
					</wl-function-editor-language>
				</div>
				<!-- component that displays names for a language -->
				<wl-function-editor-name
					:z-lang="labelLanguage.zLang"
					:is-main-z-object="isMainZObject( labelLanguage.zLang, index )"
					@updated-name="updatedLabel"
				></wl-function-editor-name>
				<!-- component that displays the description for a language -->
				<wl-function-editor-description
					:z-lang="labelLanguage.zLang"
					@updated-description="updatedLabel"
				>
				</wl-function-editor-description>
				<!-- component that displays aliases for a language -->
				<wl-function-editor-aliases
					:z-lang="labelLanguage.zLang"
					@updated-alias="updatedLabel"
				></wl-function-editor-aliases>
				<!-- component that displays list of inputs for a language -->
				<wl-function-editor-inputs
					:is-mobile="isMobile"
					:z-lang="labelLanguage.zLang"
					:is-main-language-block="index === 0"
					:can-edit="canEditFunction"
					:tooltip-icon="adminTooltipIcon"
					:tooltip-message="adminTooltipMessage"
					@updated-argument-label="updatedLabel"
				></wl-function-editor-inputs>
				<!-- component that displays output for a language -->
				<template v-if="index === 0">
					<wl-function-editor-output
						:can-edit="canEditFunction"
						:tooltip-icon="adminTooltipIcon"
						:tooltip-message="adminTooltipMessage"
					></wl-function-editor-output>
				</template>
			</div>
		</div>
		<div class="ext-wikilambda-function-definition__action-add-language">
			<cdx-button
				class="ext-wikilambda-function-definition__action-add-language-button"
				@click="addLabelInOtherLanguages"
			>
				<cdx-icon :icon="icons.cdxIconAdd"></cdx-icon>
				{{ $i18n( 'wikilambda-function-definition-add-other-label-languages-title' ).text() }}
			</cdx-button>
		</div>

		<wl-function-editor-footer
			:is-editing="isEditingExistingFunction"
			:should-unattach-implementation-and-tester="shouldUnattachImplementationAndTester"
			:publish-disabled="!isDirty"
			@cancel="handleCancel"
		></wl-function-editor-footer>

		<wl-leave-editor-dialog
			:show-dialog="showLeaveEditorDialog"
			:continue-callback="leaveEditorCallback"
			@close-dialog="closeLeaveEditorDialog">
		</wl-leave-editor-dialog>
	</main>
</template>

<script>
var FunctionEditorLanguage = require( './FunctionEditorLanguage.vue' ),
	FunctionEditorName = require( './FunctionEditorName.vue' ),
	FunctionEditorDescription = require( './FunctionEditorDescription.vue' ),
	FunctionEditorAliases = require( './FunctionEditorAliases.vue' ),
	FunctionEditorInputs = require( './FunctionEditorInputs.vue' ),
	FunctionEditorOutput = require( './FunctionEditorOutput.vue' ),
	FunctionEditorFooter = require( './FunctionEditorFooter.vue' ),
	LeaveEditorDialog = require( '../../base/LeaveEditorDialog.vue' ),
	useBreakpoints = require( '../../../composables/useBreakpoints.js' ),
	icons = require( '../../../../lib/icons.json' ),
	Constants = require( '../../../Constants.js' ),
	typeUtils = require( '../../../mixins/typeUtils.js' ),
	eventLogger = require( '../../../mixins/eventLogUtils.js' ).methods,
	CdxButton = require( '@wikimedia/codex' ).CdxButton,
	CdxIcon = require( '@wikimedia/codex' ).CdxIcon,
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions;

// @vue/component
module.exports = exports = {
	name: 'wl-function-editor-definition',
	components: {
		'wl-function-editor-name': FunctionEditorName,
		'wl-function-editor-aliases': FunctionEditorAliases,
		'wl-function-editor-inputs': FunctionEditorInputs,
		'wl-function-editor-description': FunctionEditorDescription,
		'wl-function-editor-output': FunctionEditorOutput,
		'wl-function-editor-footer': FunctionEditorFooter,
		'wl-function-editor-language': FunctionEditorLanguage,
		'wl-leave-editor-dialog': LeaveEditorDialog,
		'cdx-button': CdxButton,
		'cdx-icon': CdxIcon
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
			zobjectId: 0,
			icons: icons,
			labelLanguages: [],
			initialInputTypes: [],
			hasUpdatedLabels: false,
			initialOutputType: '',
			showLeaveEditorDialog: false,
			leaveEditorCallback: ''
		};
	},
	computed: $.extend( mapGetters( [
		'getLabel',
		'getCurrentZLanguage',
		'getCurrentZObjectId',
		'currentZObjectLanguages',
		'isNewZObject',
		'getViewMode',
		'getZObjectChildrenById',
		'getZObjectAsJsonById',
		'getZargumentsArray',
		'getNestedZObjectById',
		'getUserZlangZID',
		'isUserLoggedIn'
	] ),
	{
		canEditFunction: function () {
			// TODO(T301667): restrict to only certain user roles
			return this.isNewZObject ? true : this.isUserLoggedIn;
		},
		shouldUnattachImplementationAndTester: function () {
			return this.validateInputTypeChanged() || this.validateOutputTypeChanged();
		},
		isDirty: function () {
			return this.validateInputTypeChanged() || this.validateOutputTypeChanged() || this.hasUpdatedLabels;
		},
		isMobile: function () {
			return this.breakpoint.current.value === Constants.breakpointsTypes.MOBILE;
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
			return icons.cdxIconLock;
		},
		/**
		 * message for admin tooltip
		 *
		 * @return {string}
		 */
		adminTooltipMessage: function () {
			// TODO (T299604): Instead of just "users with special permissions", once the right exists we should
			// actually check which group has the right, fetch its display name, and display it in this text.
			return this.$i18n( 'wikilambda-editor-fn-edit-definition-tooltip-content' ).text();
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
			var languageList = this.currentZObjectLanguages;
			var formattedLanguages = [];

			// Add languages from function names, labels and aliases.
			for ( var item in languageList ) {
				formattedLanguages.push( {
					zLang: languageList[ item ][ Constants.Z_REFERENCE_ID ],
					// get the label for the language zId
					label: this.getLabel( languageList[ item ][ Constants.Z_REFERENCE_ID ] ),
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
		'changeType',
		'setError'
	] ), {
		closeLeaveEditorDialog: function () {
			this.showLeaveEditorDialog = false;
		},
		updatedLabel: function () {
			this.hasUpdatedLabels = true;
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
					const fnDefinitionContainer = this.$refs.fnDefinitionContainer;
					fnDefinitionContainer.scrollTop = fnDefinitionContainer.scrollHeight;
				}.bind( this ), 0 );
			}
		},
		setInputLangByIndex: function ( lang, index ) {
			// If index is zero, set currentZLanguage as lang.zLang
			if ( index === 0 ) {
				this.setCurrentZLanguage( lang );
			}
			this.labelLanguages[ index ] = {
				zLang: lang,
				label: this.getLabel( lang ),
				readOnly: true
			};
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
			return ( this.currentOutput.value !== this.initialOutputType ) && this.currentOutput.value !== '';
		},
		handleCancel: function () {
			const cancelTargetUrl = this.isNewZObject ? new mw.Title( 'Wikifunctions:Main_Page' ).getUrl() : new mw.Title( this.getCurrentZObjectId ).getUrl();
			const customData = {
				isnewzobject: this.isNewZObject,
				// If not set, this will be Z0:
				zobjectid: this.getCurrentZObjectId,
				zlang: this.getUserZlangZID || null,
				isdirty: this.isDirty
			};

			if ( this.isDirty ) {
				this.showLeaveEditorDialog = true;
				this.leaveEditorCallback = function () {
					window.location.href = cancelTargetUrl;
					eventLogger.dispatchEvent( 'wf.ui.editFunction.cancel', customData );
				};
			} else {
				// If there are no changes, go immediately without showing the dialog.
				window.location.href = cancelTargetUrl;
				eventLogger.dispatchEvent( 'wf.ui.editFunction.cancel', customData );
			}
		},
		/**
		 *  The main zObject labels are displayed on the Page title.
		 *
		 *  It is the zobject which matches the users language, otherwise
		 *  is the first zobject on the page.
		 *
		 *  @param {Object} zLang
		 *  @param {number} index
		 *  @return {boolean} isMainZObject
		 */
		isMainZObject: function ( zLang, index ) {
			var languageList = this.currentZObjectLanguages || [];
			return languageList.some(
				( id ) => id[ Constants.Z_REFERENCE_ID ] === this.getUserZlangZID ) ?
				zLang === this.getUserZlangZID :
				index === 0;
		},
		handleClickAway: function ( e ) {
			let target = e.target;

			// Find if what was clicked was a link.
			while ( target && target.tagName !== 'A' ) {
				target = target.parentNode;
				if ( !target ) {
					return;
				}
			}
			if ( target.href && this.isDirty ) {
				this.showLeaveEditorDialog = true;
				e.preventDefault();
				this.leaveEditorCallback = function () {
					window.removeEventListener( 'click', this.handleClickAway );
					window.location.href = target.href;
				}.bind( this );
			}
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
		selectedLanguages: {
			immediate: true,
			handler: function () {
				if ( this.labelLanguages.length === 0 &&
					this.selectedLanguages[ this.selectedLanguages.length - 1 ].label !== undefined ) {
					this.labelLanguages = this.selectedLanguages;
				}
			}
		},
		shouldUnattachImplementationAndTester: {
			handler: function () {
				if ( this.isEditingExistingFunction ) {
					if ( this.shouldUnattachImplementationAndTester ) {
						const inputTypeChanged = this.validateInputTypeChanged();
						const outputTypeChanged = this.validateOutputTypeChanged();

						let errorCode;
						if ( inputTypeChanged && outputTypeChanged ) {
							errorCode = Constants.errorCodes.FUNCTION_INPUT_OUTPUT_CHANGED;
						} else if ( inputTypeChanged ) {
							errorCode = Constants.errorCodes.FUNCTION_INPUT_CHANGED;
						} else {
							errorCode = Constants.errorCodes.FUNCTION_OUTPUT_CHANGED;
						}

						this.setError( {
							rowId: 0,
							errorType: Constants.errorTypes.WARNING,
							errorCode
						} );
					}
				}
			}
		}
	},
	mounted: function () {
		if ( !this.zObjectLabels ) {
			this.labelLanguages.push( {
				label: this.getLabel( this.getCurrentZLanguage ),
				zLang: this.getCurrentZLanguage,
				readonly: false
			} );
		}
		if ( this.isNewZObject ) {
			this.changeTypeToFunction();
		}
		window.addEventListener( 'click', this.handleClickAway );
		eventLogger.dispatchEvent( 'wf.ui.editFunction.load', {
			isnewzobject: this.isNewZObject,
			zobjectid: this.getCurrentZObjectId || null,
			zlang: this.getUserZlangZID || null
		} );
	},
	beforeUnmount: function () {
		window.removeEventListener( 'click', this.handleClickAway );
	}
};
</script>

<style lang="less">
@import '../../../ext.wikilambda.edit.less';

.ext-wikilambda-function-definition {
	&__container {
		&__input {
			padding-top: @spacing-150;
			border-bottom: 1px solid @border-color-subtle;

			&:first-child {
				border-top: 1px solid @border-color-subtle;
			}

			&__language {
				margin-bottom: @spacing-150;

				&__selector {
					display: flex;
				}
			}
		}
	}

	&__action-add-language {
		border-bottom: 1px solid @border-color-subtle;
		padding: @spacing-150 0;
	}
}
</style>
