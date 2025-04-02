<!--
	WikiLambda Vue component for the definition tab in the ZFunction Editor.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div
		class="ext-wikilambda-app-function-editor"
		data-testid="function-editor-definition"
	>
		<!-- Function Definition blocks -->
		<div class="ext-wikilambda-app-function-editor__container">
			<wl-function-editor-language-block
				v-for="( langZid, index ) in functionLanguages"
				:key="'language-block-' + langZid"
				:index="index"
				:z-language="langZid"
				@language-changed="setLanguage"
				@labels-updated="setHasUpdatedLabels"
			></wl-function-editor-language-block>
		</div>
		<!-- Add Language Button -->
		<div class="ext-wikilambda-app-function-editor__action-add-language">
			<cdx-button
				data-testid="add-language-button"
				class="ext-wikilambda-app-function-editor__action-add-language-button"
				@click="addLanguage"
			>
				<cdx-icon :icon="icons.cdxIconLanguage"></cdx-icon>
				{{ addLanguageButtonText }}
			</cdx-button>
		</div>
		<!-- Footer with Publish Widget -->
		<wl-publish-widget
			class="ext-wikilambda-app-function-editor__footer"
			:is-dirty="isFunctionDirty"
			:function-signature-changed="functionSignatureChanged"
			@start-publish="raiseFunctionWarnings"
		></wl-publish-widget>
	</div>
</template>

<script>
const { CdxButton, CdxIcon } = require( '../../../../codex.js' );
const { defineComponent } = require( 'vue' );
const { mapState, mapActions } = require( 'pinia' );

const Constants = require( '../../../Constants.js' );
const eventLogMixin = require( '../../../mixins/eventLogMixin.js' );
const FunctionEditorLanguageBlock = require( './FunctionEditorLanguageBlock.vue' );
const icons = require( '../../../../lib/icons.json' );
const typeMixin = require( '../../../mixins/typeMixin.js' );
const useMainStore = require( '../../../store/index.js' );
const { hybridToCanonical } = require( '../../../utils/schemata.js' );
const PublishWidget = require( '../../widgets/publish/Publish.vue' );

module.exports = exports = defineComponent( {
	name: 'wl-function-editor',
	components: {
		'wl-function-editor-language-block': FunctionEditorLanguageBlock,
		'wl-publish-widget': PublishWidget,
		'cdx-button': CdxButton,
		'cdx-icon': CdxIcon
	},
	mixins: [ eventLogMixin, typeMixin ],
	data: function () {
		return {
			rowId: 0,
			icons: icons,
			initialInputTypes: [],
			initialOutputType: '',
			hasUpdatedLabels: false,
			functionLanguages: []
		};
	},
	computed: Object.assign( {}, mapState( useMainStore, [
		'getCurrentZObjectId',
		'getRowByKeyPath',
		'getUserLangZid',
		'getZFunctionInputs',
		'getMultilingualDataLanguages',
		'getZFunctionOutput',
		'getZObjectAsJsonById',
		'isCreateNewPage',
		'getConnectedImplementations',
		'getConnectedTests'
	] ),
	{
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
		 * Returns whether the function has connected objects (implementations or tests).
		 *
		 * @return {boolean}
		 */
		hasConnectedObjects: function () {
			return !!this.getConnectedImplementations().length || !!this.getConnectedTests().length;
		},
		/**
		 * Returns the error code for the type of function
		 * signature warning to be shown to the user, depending on
		 * whether the inputs have changed, the output, or both.
		 *
		 * @return {string}
		 */
		signatureWarningCode: function () {
			if ( this.inputTypeChanged && this.outputTypeChanged ) {
				return Constants.ERROR_CODES.FUNCTION_INPUT_OUTPUT_CHANGED;
			} else if ( this.inputTypeChanged ) {
				return Constants.ERROR_CODES.FUNCTION_INPUT_CHANGED;
			} else if ( this.outputTypeChanged ) {
				return Constants.ERROR_CODES.FUNCTION_OUTPUT_CHANGED;
			}
			return '';
		},
		/**
		 * Returns the text for the button to add more languages
		 *
		 * @return {string}
		 */
		addLanguageButtonText: function () {
			return this.$i18n( 'wikilambda-function-definition-add-other-label-languages-title' ).text();
		},
		/**
		 * Returns an array with the string representation of the
		 * currently selected input types. Filters out the undefined
		 * values in between.
		 *
		 * @return {Array}
		 */
		currentInputTypes: function () {
			return this.getZFunctionInputs().map( ( inputRow ) => {
				const inputTypeRow = this.getRowByKeyPath( [ Constants.Z_ARGUMENT_TYPE ], inputRow.id );
				return inputTypeRow ?
					this.getTypeStringRepresentation( inputTypeRow.id ) :
					undefined;
			} ).filter( ( type ) => !!type );
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
				this.getTypeStringRepresentation( outputRow.id ) :
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
	methods: Object.assign( {}, mapActions( useMainStore, [
		'setError'
	] ), {
		/**
		 * Saves the initial values for initialInputTypes and initialOutputType
		 */
		saveInitialFunctionSignature: function () {
			this.initialInputTypes = this.currentInputTypes;
			this.initialOutputType = this.currentOutputType;
		},
		/**
		 * Sets the hasUpdatedLabels flag to true
		 */
		setHasUpdatedLabels: function () {
			this.hasUpdatedLabels = true;
		},
		/**
		 * Adds a new entry to the functionLanguages local array.
		 * Initiates it to "unset" language, so it just adds an
		 * empty string.
		 */
		addLanguage: function () {
			this.functionLanguages.push( '' );
		},
		/**
		 * Sets a function definition unset language to a given
		 * value, given its index in the functionLanguages array.
		 *
		 * @param {Object} payload
		 * @param {number} payload.index array index
		 * @param {string} payload.language zid
		 */
		setLanguage: function ( payload ) {
			this.functionLanguages[ payload.index ] = payload.language;
		},
		/**
		 * Return the string representation of the object under
		 * the given rowId. If it's a function call, includes args (E.g.
		 * Z881(Z6)
		 *
		 * @param {number} rowId
		 * @return {string}
		 */
		getTypeStringRepresentation: function ( rowId ) {
			const canonical = hybridToCanonical( this.getZObjectAsJsonById( rowId ) );
			return this.typeToString( canonical );
		},
		/**
		 * Set warnings when there are changes in the function signature
		 * to announce that
		 */
		raiseFunctionWarnings: function () {
			// Only warn of changes if we are editing an existing function
			if ( this.isCreateNewPage ) {
				return;
			}

			// If there's changes in the function signature, warn that
			// implementations and testers will be detached
			if ( this.functionSignatureChanged && this.hasConnectedObjects ) {
				this.setError( {
					rowId: 0,
					errorType: Constants.ERROR_TYPES.WARNING,
					errorCode: this.signatureWarningCode
				} );
			}
		}
	} ),
	watch: {
		isFunctionDirty: function ( newValue ) {
			if ( newValue === true ) {
				const interactionData = {
					zobjectid: this.getCurrentZObjectId,
					zobjecttype: 'Z8',
					zlang: this.getUserLangZid || null
				};
				this.submitInteraction( 'change', interactionData );
			}
		}
	},
	mounted: function () {
		// Initialize the local array with the collection of available languages
		// and initialize first label block with user lang if there are none.
		this.functionLanguages = this.getMultilingualDataLanguages( this.rowId );
		if ( this.functionLanguages.length === 0 ) {
			this.functionLanguages.push( this.getUserLangZid );
		}

		// Initialize initial state of inputs and output
		this.saveInitialFunctionSignature();

		// Log an event using Metrics Platform's core interaction events
		const interactionData = {
			zobjecttype: Constants.Z_FUNCTION,
			zobjectid: this.getCurrentZObjectId || null,
			zlang: this.getUserLangZid || null
		};
		const action = this.isCreateNewPage ? 'create' : 'edit';
		this.submitInteraction( action, interactionData );
	}
} );
</script>

<style lang="less">
@import '../../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-function-editor {
	.ext-wikilambda-app-function-editor__action-add-language {
		border-bottom: 1px solid @border-color-subtle;
		padding: @spacing-150 0;
	}

	.ext-wikilambda-app-function-editor__footer {
		margin-top: @spacing-150;
	}
}
</style>
