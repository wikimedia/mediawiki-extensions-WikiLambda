<!--
	WikiLambda Vue component for the definition tab in the ZFunction Editor.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<main class="ext-wikilambda-function-definition" data-testid="function-editor-definition">
		<!-- Function Definition -->
		<div
			ref="fnDefinitionContainer"
			class="ext-wikilambda-function-definition__container">
			<div
				v-for="( labelLanguage, index ) in labelLanguages"
				:key="index"
				data-testid="function-editor-definition-language-block"
				class="ext-wikilambda-function-definition__container__input"
			>
				<div class="ext-wikilambda-function-definition__container__input__language">
					<wl-function-editor-language
						class="ext-wikilambda-function-definition__container__input__language__selector"
						data-testid="function-editor-language-selector"
						:z-language="labelLanguage.zLang"
						@change="function ( value ) {
							return setInputLangByIndex( value, index )
						}"
					>
					</wl-function-editor-language>
				</div>
				<!-- component that displays names for a language -->
				<wl-function-editor-name
					data-testid="function-editor-name-input"
					:z-lang="labelLanguage.zLang"
					:is-main-z-object="isMainZObject( labelLanguage.zLang, index )"
					@updated-name="setHasUpdatedLabels"
				></wl-function-editor-name>
				<!-- component that displays the description for a language -->
				<wl-function-editor-description
					:z-lang="labelLanguage.zLang"
					@updated-description="updatedLabel"
				>
				</wl-function-editor-description>
				<!-- component that displays aliases for a language -->
				<wl-function-editor-aliases
					data-testid="function-editor-alias-input"
					:z-lang="labelLanguage.zLang"
					@updated-alias="setHasUpdatedLabels"
				></wl-function-editor-aliases>
				<!-- component that displays list of inputs for a language -->
				<wl-function-editor-inputs
					:is-mobile="isMobile"
					:z-lang="labelLanguage.zLang"
					:is-main-language-block="index === 0"
					:can-edit="canEditFunction"
					:tooltip-icon="icons.cdxIconLock"
					:tooltip-message="adminTooltipMessage"
					@updated-argument-label="setHasUpdatedLabels"
				></wl-function-editor-inputs>
				<!-- component that displays output for a language -->
				<template v-if="index === 0">
					<wl-function-editor-output
						:can-edit="canEditFunction"
						:tooltip-icon="icons.cdxIconLock"
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
			:is-function-dirty="isFunctionDirty"
			:function-input-changed="inputTypeChanged"
			:function-output-changed="outputTypeChanged"
			:function-signature-changed="functionSignatureChanged"
		></wl-function-editor-footer>
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
	useBreakpoints = require( '../../../composables/useBreakpoints.js' ),
	icons = require( '../../../../lib/icons.json' ),
	Constants = require( '../../../Constants.js' ),
	typeUtils = require( '../../../mixins/typeUtils.js' ),
	eventLogUtils = require( '../../../mixins/eventLogUtils.js' ),
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
		'cdx-button': CdxButton,
		'cdx-icon': CdxIcon
	},
	mixins: [ eventLogUtils, typeUtils ],
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
			initialOutputType: '',
			hasUpdatedLabels: false
		};
	},
	computed: $.extend( mapGetters( [
		'currentZObjectLanguages',
		'getCurrentZLanguage',
		'getCurrentZObjectId',
		'getLabel',
		'getRowByKeyPath',
		'getUserZlangZID',
		'getViewMode',
		'getZFunctionInputs',
		'getZFunctionOutput',
		'getZTypeStringRepresentation',
		'getZObjectChildrenById',
		'getZObjectAsJsonById',
		'isNewZObject',
		'isUserLoggedIn'
	] ),
	{
		/**
		 * Returns whether the current view is mobile
		 *
		 * @return {boolean}
		 */
		isMobile: function () {
			return this.breakpoint.current.value === Constants.breakpointsTypes.MOBILE;
		},
		/**
		 * Returns whether the user can edit the function
		 *
		 * @return {boolean}
		 */
		canEditFunction: function () {
			// TODO(T301667): restrict to only certain user roles
			return this.isNewZObject ? true : this.isUserLoggedIn;
		},
		/**
		 * Returns whether there have been any changes made
		 * in inputs or output types.
		 *
		 * @return {boolean}
		 */
		functionSignatureChanged: function () {
			return this.inputTypeChanged || this.outputTypeChanged;
		},
		/**
		 * Returns whether there have been any changes made
		 * from the initial value of the function.
		 *
		 * @return {boolean}
		 */
		isFunctionDirty: function () {
			return this.functionSignatureChanged || this.hasUpdatedLabels;
		},
		/**
		 * Returns whether the page is an edit page
		 * of an already persisted function.
		 *
		 * @return {boolean}
		 */
		isEditingExistingFunction: function () {
			// TODO: why? this is always gonna be an edit page
			return !this.isNewZObject && !this.getViewMode;
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
		/**
		 * Returns an array with the string representation of the
		 * currently selected input types. Filters out the undefined
		 * values in between.
		 *
		 * @return {Array}
		 */
		currentInputTypes: function () {
			return this.getZFunctionInputs()
				.map( ( inputRow ) => {
					const inputTypeRow = this.getRowByKeyPath( [
						Constants.Z_ARGUMENT_TYPE
					], inputRow.id );
					return inputTypeRow ?
						this.getZTypeStringRepresentation( inputTypeRow.id ) :
						undefined;
				} )
				.filter( ( type ) => !!type );
		},
		/**
		 * Returns an the string representation of the
		 * currently selected output type.
		 *
		 * @return {string}
		 */
		currentOutputType: function () {
			const outputRow = this.getZFunctionOutput();
			return outputRow ?
				this.getZTypeStringRepresentation( outputRow.id ) :
				undefined;
		},
		/**
		 * Returns whether the input types have changed from the
		 * initial value.
		 *
		 * @return {boolean}
		 */
		inputTypeChanged: function () {
			// Return true if length is different, or if at least an item is found to be different
			return ( this.currentInputTypes.length !== this.initialInputTypes.length ) ||
				!!this.currentInputTypes.find( ( value, i ) => value !== this.initialInputTypes[ i ] );
		},
		/**
		 * Returns whether the output type has changed from the
		 * initial value.
		 *
		 * @return {boolean}
		 */
		outputTypeChanged: function () {
			return ( this.currentOutputType !== this.initialOutputType );
		}
	} ),
	methods: $.extend( mapActions( [
		'setCurrentZLanguage'
	] ), {
		/**
		 * Saves the initial values for initialInputTypes and initialOutputType
		 */
		saveInitialFunctionSignature: function () {
			this.initialInputTypes = this.currentInputTypes;
			this.initialOutputType = this.currentOutputType;
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
		/**
		 * @param {string} lang
		 * @param {number} index
		 */
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
		/**
		 * Sets the hasUpdatedLabels flag to true
		 */
		setHasUpdatedLabels: function () {
			this.hasUpdatedLabels = true;
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
		}
	} ),
	watch: {
		selectedLanguages: {
			immediate: true,
			handler: function () {
				if ( this.labelLanguages.length === 0 &&
					this.selectedLanguages[ this.selectedLanguages.length - 1 ].label !== undefined ) {
					this.labelLanguages = this.selectedLanguages;
				}
			}
		}
	},
	mounted: function () {
		// Initialize first label block with user lang if there are none
		if ( !this.zObjectLabels ) {
			this.labelLanguages.push( {
				label: this.getLabel( this.getCurrentZLanguage ),
				zLang: this.getCurrentZLanguage,
				readonly: false
			} );
		}

		// Initialize initial state of inputs and output
		this.saveInitialFunctionSignature();

		// Dispatch an editFunction load event
		this.dispatchEvent( 'wf.ui.editFunction.load', {
			isnewzobject: this.isNewZObject,
			zobjectid: this.getCurrentZObjectId || null,
			zlang: this.getUserZlangZID || null
		} );
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
