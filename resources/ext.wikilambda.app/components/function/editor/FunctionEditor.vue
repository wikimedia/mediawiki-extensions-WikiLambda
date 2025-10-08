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
				<cdx-icon :icon="iconLanguage"></cdx-icon>
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
const { computed, defineComponent, inject, onMounted, ref, watch } = require( 'vue' );

const Constants = require( '../../../Constants.js' );
const icons = require( '../../../../lib/icons.json' );
const useEventLog = require( '../../../composables/useEventLog.js' );
const useMainStore = require( '../../../store/index.js' );
const { hybridToCanonical } = require( '../../../utils/schemata.js' );
const { typeToString } = require( '../../../utils/typeUtils.js' );

// Function editor componetns
const FunctionEditorLanguageBlock = require( './FunctionEditorLanguageBlock.vue' );
// Widget components
const PublishWidget = require( '../../widgets/publish/Publish.vue' );
// Codex components
const { CdxButton, CdxIcon } = require( '../../../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'wl-function-editor',
	components: {
		'wl-function-editor-language-block': FunctionEditorLanguageBlock,
		'wl-publish-widget': PublishWidget,
		'cdx-button': CdxButton,
		'cdx-icon': CdxIcon
	},
	setup() {
		const i18n = inject( 'i18n' );
		const { submitInteraction } = useEventLog();
		const store = useMainStore();

		// Reactive data
		const iconLanguage = icons.cdxIconLanguage;
		const initialInputTypes = ref( [] );
		const initialOutputType = ref( '' );
		const hasUpdatedLabels = ref( false );
		const functionLanguages = ref( [] );

		// Computed properties
		/**
		 * Returns an array with the string representation of the
		 * currently selected input types. Filters out the undefined
		 * values in between.
		 *
		 * @return {Array}
		 */
		const currentInputTypes = computed( () => store.getZFunctionInputs.map( ( input ) => {
			const inputType = hybridToCanonical( input[ Constants.Z_ARGUMENT_TYPE ] );
			return typeToString( inputType );
		} ).filter( ( type ) => !!type ) );

		/**
		 * Returns an the string representation of the
		 * currently selected output type.
		 *
		 * @return {string}
		 */
		const currentOutputType = computed( () => {
			const outputType = hybridToCanonical( store.getZFunctionOutput );
			return typeToString( outputType );
		} );

		/**
		 * Returns whether the input types have changed from the
		 * initial value.
		 *
		 * @return {boolean}
		 */
		const inputTypeChanged = computed( () => currentInputTypes.value.length !== initialInputTypes.value.length ||
			!!currentInputTypes.value.find( ( value, i ) => value !== initialInputTypes.value[ i ] )
		);

		/**
		 * Returns whether the output type has changed from the
		 * initial value.
		 *
		 * @return {boolean}
		 */
		const outputTypeChanged = computed( () => currentOutputType.value !== initialOutputType.value );

		/**
		 * Returns whether there have been any changes made
		 * in inputs or output types.
		 *
		 * @return {boolean}
		 */
		const functionSignatureChanged = computed( () => inputTypeChanged.value || outputTypeChanged.value );

		/**
		 * Returns whether there have been any changes made
		 * from the initial value of the function.
		 *
		 * @return {boolean}
		 */
		const isFunctionDirty = computed( () => functionSignatureChanged.value || hasUpdatedLabels.value );

		/**
		 * Returns whether the function has connected objects (implementations or tests).
		 *
		 * @return {boolean}
		 */
		const hasConnectedObjects = computed( () => !!store.getConnectedImplementations.length ||
			!!store.getConnectedTests.length );

		/**
		 * Returns the error code for the type of function
		 * signature warning to be shown to the user, depending on
		 * whether the inputs have changed, the output, or both.
		 *
		 * @return {string}
		 */
		const signatureWarningCode = computed( () => {
			if ( inputTypeChanged.value && outputTypeChanged.value ) {
				return 'wikilambda-publish-input-and-output-changed-impact-prompt';
			} else if ( inputTypeChanged.value ) {
				return 'wikilambda-publish-input-changed-impact-prompt';
			} else if ( outputTypeChanged.value ) {
				return 'wikilambda-publish-output-changed-impact-prompt';
			}
			return '';
		} );

		/**
		 * Returns the text for the button to add more languages
		 *
		 * @return {string}
		 */
		const addLanguageButtonText = computed( () => i18n( 'wikilambda-function-definition-add-other-label-languages-title' ).text() );

		// Methods
		/**
		 * Saves the initial values for initialInputTypes and initialOutputType
		 */
		function saveInitialFunctionSignature() {
			initialInputTypes.value = currentInputTypes.value;
			initialOutputType.value = currentOutputType.value;
		}

		/**
		 * Sets the hasUpdatedLabels flag to true
		 */
		function setHasUpdatedLabels() {
			hasUpdatedLabels.value = true;
		}

		/**
		 * Adds a new entry to the functionLanguages local array.
		 * Initiates it to "unset" language, so it just adds an
		 * empty string.
		 */
		function addLanguage() {
			functionLanguages.value.push( '' );
		}

		/**
		 * Sets a function definition unset language to a given
		 * value, given its index in the functionLanguages array.
		 *
		 * @param {Object} payload
		 * @param {number} payload.index array index
		 * @param {string} payload.language zid
		 */
		function setLanguage( payload ) {
			functionLanguages.value[ payload.index ] = payload.language;
		}

		/**
		 * Set warnings when there are changes in the function signature
		 * to announce that
		 */
		function raiseFunctionWarnings() {
			// Only warn of changes if we are editing an existing function
			if ( store.isCreateNewPage ) {
				return;
			}

			// If there's changes in the function signature, warn that
			// implementations and testers will be detached
			if ( functionSignatureChanged.value && hasConnectedObjects.value ) {
				store.setError( {
					errorId: Constants.STORED_OBJECTS.MAIN,
					errorType: Constants.ERROR_TYPES.WARNING,
					errorMessageKey: signatureWarningCode.value
				} );
			}
		}

		// Watchers
		watch( isFunctionDirty, ( newValue ) => {
			if ( newValue === true ) {
				const interactionData = {
					zobjectid: store.getCurrentZObjectId,
					zobjecttype: Constants.Z_FUNCTION,
					zlang: store.getUserLangZid || null
				};
				submitInteraction( 'change', interactionData );
			}
		} );

		// Lifecycle
		onMounted( () => {
			// Initialize the local array with the collection of available languages
			// and initialize first label block with user lang if there are none.
			functionLanguages.value = store.getMultilingualDataLanguages.all;
			if ( functionLanguages.value.length === 0 ) {
				functionLanguages.value.push( store.getUserLangZid );
			}

			// Initialize initial state of inputs and output
			saveInitialFunctionSignature();

			// Log an event using Metrics Platform's core interaction events
			const interactionData = {
				zobjecttype: Constants.Z_FUNCTION,
				zobjectid: store.getCurrentZObjectId || null,
				zlang: store.getUserLangZid || null
			};
			const action = store.isCreateNewPage ? 'create' : 'edit';
			submitInteraction( action, interactionData );
		} );

		return {
			addLanguage,
			addLanguageButtonText,
			functionLanguages,
			functionSignatureChanged,
			iconLanguage,
			isFunctionDirty,
			raiseFunctionWarnings,
			setHasUpdatedLabels,
			setLanguage
		};
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
