<!--
	WikiLambda Vue component for Z16/Code objects.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-app-code" data-testid="z-code">
		<!-- Programming language block -->
		<wl-key-value-block
			:key-bold="parentIsImplementation"
			class="ext-wikilambda-app-code__language-selector-block">
			<template #key>
				<label
					:lang="programmingLanguageLabelData.langCode"
					:dir="programmingLanguageLabelData.langDir"
				>{{ programmingLanguageLabelData.label }}</label>
			</template>
			<template #value>
				<div
					data-testid="language-dropdown"
					class="ext-wikilambda-app-code__language-selector"
				>
					<span v-if="!edit">
						{{ programmingLanguageLiteral }}
					</span>
					<cdx-select
						v-else
						:selected="programmingLanguageValue"
						:menu-items="programmingLanguageMenuItems"
						:default-label="i18n( 'wikilambda-editor-label-select-programming-language-label' ).text()"
						:status="programmingLanguageErrors.length > 0 ? 'error' : 'default'"
						@update:selected="setProgrammingLanguage"
					></cdx-select>
				</div>
			</template>
			<template v-if="programmingLanguageErrors.length > 0" #footer>
				<cdx-message
					v-for="( error, index ) in programmingLanguageErrors"
					:key="`language-error-${ index }`"
					class="ext-wikilambda-app-code__inline-error"
					:type="error.type"
					:inline="true"
				>
					<wl-safe-message :error="error"></wl-safe-message>
				</cdx-message>
			</template>
		</wl-key-value-block>

		<!-- Code editor block -->
		<wl-key-value-block
			:key-bold="parentIsImplementation"
			class="ext-wikilambda-app-code__code-editor-block"
		>
			<template #key>
				<label
					:lang="codeLabelData.langCode"
					:dir="codeLabelData.langDir"
				>{{ codeLabelData.label }}</label>
			</template>
			<template #value>
				<code-editor
					class="ext-wikilambda-app-code__code-editor"
					:mode="programmingLanguageLiteral"
					:read-only="!edit"
					:disabled="!programmingLanguageValue"
					:value="editorValue"
					data-testid="code-editor"
					@change="updateCode"
					@click="checkCode"
				></code-editor>
			</template>
			<template v-if="codeErrors.length > 0" #footer>
				<cdx-message
					v-for="( error, index ) in codeErrors"
					:key="`code-error-${ index }`"
					class="ext-wikilambda-app-code__inline-error"
					:type="error.type"
					:inline="true"
				>
					<wl-safe-message :error="error"></wl-safe-message>
				</cdx-message>
			</template>
		</wl-key-value-block>
	</div>
</template>

<script>
const { computed, defineComponent, inject, onMounted, ref, watch } = require( 'vue' );

const Constants = require( '../../Constants.js' );
const useMainStore = require( '../../store/index.js' );
const ErrorData = require( '../../store/classes/ErrorData.js' );
const useZObject = require( '../../composables/useZObject.js' );
const useType = require( '../../composables/useType.js' );

// Base components
const CodeEditor = require( '../base/CodeEditor.vue' );
const KeyValueBlock = require( '../base/KeyValueBlock.vue' );
const SafeMessage = require( '../base/SafeMessage.vue' );
// Codex components
const { CdxMessage, CdxSelect } = require( '../../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'wl-z-code',
	components: {
		'cdx-message': CdxMessage,
		'cdx-select': CdxSelect,
		'code-editor': CodeEditor,
		'wl-key-value-block': KeyValueBlock,
		'wl-safe-message': SafeMessage
	},
	props: {
		keyPath: {
			type: String,
			required: true
		},
		objectValue: {
			type: Object,
			required: true
		},
		edit: {
			type: Boolean,
			required: true
		}
	},
	emits: [ 'set-value' ],
	setup( props, { emit } ) {
		const i18n = inject( 'i18n' );
		const { getZidOfGlobalKey } = useType();
		const { getZCodeString, key, getZCodeProgrammingLanguageId } = useZObject( { keyPath: props.keyPath } );
		const store = useMainStore();

		const editorValue = ref( '' );
		const allowSetEditorValue = ref( true );
		const hasClickedDisabledField = ref( false );
		const codeErrorId = `${ props.keyPath }.${ Constants.Z_CODE_CODE }`;
		const programmingLangErrorId = `${ props.keyPath }.${ Constants.Z_CODE_LANGUAGE }`;

		// Computed properties
		/**
		 * Whether the parent is an implementation (Z14).
		 * The parent can be either an implementations (Z14) or a converter (Z46, Z64)
		 *
		 * @return {string}
		 */
		const parentIsImplementation = computed( () => getZidOfGlobalKey( key.value ) === Constants.Z_IMPLEMENTATION );

		/**
		 * Returns the label of the key Z16K2
		 *
		 * @return {LabelData}
		 */
		const codeLabelData = computed( () => store.getLabelData( Constants.Z_CODE_CODE ) );

		/**
		 * Terminal string with the code of the function
		 * implementation or undefined if not found
		 *
		 * @return {string | undefined}
		 */
		const codeValue = computed( () => getZCodeString( props.objectValue ) );

		/**
		 * Returns code field notices.
		 * * When creating new implementation: "Z0 is a placeholder and will be replaced..."
		 *
		 * @return {ErrorData[]}
		 */
		const codeNotices = computed( () => ( !store.isCreateNewPage || !codeValue.value.includes( 'Z0' ) ) ? [] : [
			ErrorData.buildErrorData( {
				errorType: Constants.ERROR_TYPES.NOTICE,
				errorMessageKey: 'wikilambda-editor-code-editor-zid-placeholder-error'
			} )
		] );

		/**
		 * Returns code field errors and notices (if any)
		 *
		 * @return {ErrorData[]}
		 */
		const codeErrors = computed( () => codeErrorId ?
			[ ...codeNotices.value, ...store.getErrors( codeErrorId ) ] :
			codeNotices.value );

		/**
		 * Returns the label of the key Z16K1
		 *
		 * @return {LabelData}
		 */
		const programmingLanguageLabelData = computed( () => store.getLabelData( Constants.Z_CODE_LANGUAGE ) );

		/**
		 * Returns the Zid of the programming language selected, or undefined if unselected
		 *
		 * @return {string | undefined}
		 */
		const programmingLanguageZid = computed( () => getZCodeProgrammingLanguageId( props.objectValue ) );

		/**
		 * Returns the appropriately formatted menu items to load the cdx-select
		 * component with the different programming language options
		 *
		 * @return {Array}
		 */
		const programmingLanguageMenuItems = computed( () => {
			const programmingLangs = [];
			if ( store.getAllProgrammingLangs.length > 0 ) {
				for ( const lang of store.getAllProgrammingLangs ) {
					programmingLangs.push( {
						label: lang[ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_PROGRAMMING_LANGUAGE_CODE ],
						value: lang[ Constants.Z_PERSISTENTOBJECT_ID ][ Constants.Z_STRING_VALUE ]
					} );
				}
			}
			return programmingLangs;
		} );

		/**
		 * Zid of the selected programming language or empty string if not set
		 *
		 * @return {string}
		 */
		const programmingLanguageValue = computed( () => !programmingLanguageZid.value ? '' : programmingLanguageZid.value );

		/**
		 * Returns the literal of the programming language selected in the Menu Items array by its zid,
		 * or empty string if unselected.
		 *
		 * @return {string}
		 */
		const programmingLanguageLiteral = computed( () => {
			const menuObject = programmingLanguageMenuItems.value
				.find( ( item ) => item.value === programmingLanguageValue.value );
			return menuObject ? menuObject.label : undefined;
		} );

		/**
		 * Returns programming language errors
		 *
		 * @return {Array}
		 */
		const programmingLanguageErrors = computed( () => store.getErrors( programmingLangErrorId ) );

		/**
		 * If parent is Implementation/Z14:
		 * * Zid of the target function that this code will implement
		 * If parent is Serialiser/Z64 or Deserialiser/Z46:
		 * * Zid of the converter identity (or Z0):
		 *
		 * @return {string | undefined }
		 */
		const functionZid = computed( () => parentIsImplementation.value ?
			store.getCurrentTargetFunctionZid :
			store.getCurrentZObjectId );

		/**
		 * If parent is Implementation/Z14:
		 * * Returns an array of strings with the keys of the selected
		 *   target function for the implementation (Z14K1)
		 * * Zid of the target function that this code will implement
		 * If parent is Serialiser/Z64 or Deserialiser/Z46:
		 * * Return one key using the the converter identity (or Z0):
		 *
		 * @return {Array}
		 */
		const functionArgumentKeys = computed( () => parentIsImplementation.value ?
			store.getInputsOfFunctionZid( functionZid.value ).map( ( arg ) => arg[ Constants.Z_ARGUMENT_KEY ] ) :
			[ `${ functionZid.value }K1` ] );

		// Methods
		/**
		 * Generates boilerplate code based on the selected programming language.
		 *
		 * @param {string} language - The programming language selected.
		 * @return {string} The generated boilerplate code.
		 */
		function generateBoilerplateCode( language ) {
			switch ( language ) {
				case Constants.Z_PROGRAMMING_LANGUAGES.JAVASCRIPT:
					return `function ${ functionZid.value }( ${ functionArgumentKeys.value.join( ', ' ) } ) {\n\n}`;
				case Constants.Z_PROGRAMMING_LANGUAGES.PYTHON:
					return `def ${ functionZid.value }(${ functionArgumentKeys.value.join( ', ' ) }):\n\t`;
				default:
					return '';
			}
		}

		/**
		 * Sets the value of the Code programming language key (Z16K1) and
		 * initializes the value of the Code content key (Z16K2)
		 *
		 * @param {string} value
		 */
		function selectLanguage( value ) {
			allowSetEditorValue.value = true;

			// clear errors for language field
			store.clearErrors( programmingLangErrorId );

			emit( 'set-value', {
				keyPath: [
					Constants.Z_CODE_LANGUAGE,
					Constants.Z_REFERENCE_ID
				],
				value
			} );

			emit( 'set-value', {
				keyPath: [ Constants.Z_CODE_CODE, Constants.Z_STRING_VALUE ],
				value: generateBoilerplateCode( value )
			} );
		}

		/**
		 * Checks if the code contains 'Wikifunctions.Debug' and sets or clears an error accordingly.
		 *
		 * @param {string} code - The code to check.
		 */
		function checkDebugMessage( code ) {
			const hasDebugCode = code.toLowerCase().includes( 'wikifunctions.debug' );

			// If 'Wikifunctions.Debug' is not found, clear the error.
			if ( !hasDebugCode ) {
				store.clearErrorsByKey( {
					errorId: Constants.STORED_OBJECTS.MAIN,
					errorMessageKey: 'wikilambda-editor-code-editor-debug-code-warning'
				} );
				return;
			}

			// If the debug message error has already been set, do nothing
			if ( store.hasErrorByKey( Constants.STORED_OBJECTS.MAIN, 'wikilambda-editor-code-editor-debug-code-warning' ) ) {
				return;
			}

			// If 'Wikifunctions.Debug' is found, set the error.
			store.setError( {
				errorId: Constants.STORED_OBJECTS.MAIN,
				errorType: Constants.ERROR_TYPES.WARNING,
				errorMessageKey: 'wikilambda-editor-code-editor-debug-code-warning',
				isPermanent: true
			} );
		}

		/**
		 * Updates the value of the Code content key (Z16K2)
		 *
		 * @param {string} code
		 */
		function updateCode( code ) {
			// there is an edge case where acejs will trigger an empty change that we process as an event object
			// we don't want to update our object with that bad data
			// TODO (T324605): this deserves a deeper investigation
			if ( typeof code !== 'object' ) {
				store.clearErrors( codeErrorId );
				emit( 'set-value', {
					keyPath: [ Constants.Z_CODE_CODE, Constants.Z_STRING_VALUE ],
					value: code
				} );
				checkDebugMessage( code );
			}
		}

		/**
		 * Handles the change event of the programming language dropdown
		 *
		 * @param {string} newValue
		 */
		function setProgrammingLanguage( newValue ) {
			if ( newValue !== programmingLanguageValue.value ) {
				selectLanguage( newValue );
			}
			store.clearErrors( programmingLangErrorId );
		}

		/**
		 * Checks if a programming language is set
		 */
		function checkCode() {
			if ( !props.edit || programmingLanguageValue.value || hasClickedDisabledField.value ) {
				return;
			}
			const payload = {
				errorId: programmingLangErrorId,
				errorType: Constants.ERROR_TYPES.WARNING,
				errorMessageKey: 'wikilambda-editor-label-select-programming-language-empty'
			};
			hasClickedDisabledField.value = true;
			store.setError( payload );
		}

		// Watchers
		watch( codeValue, () => {
			// Check allowSetEditorValue to ensure we only set value in the editor when its current value should be
			// overridden (e.g. when the editor is first loaded, or when the language changes). Ensuring this
			// prevents a bug that moves the cursor to the end of the editor on every keypress.
			if ( allowSetEditorValue.value ) {
				editorValue.value = codeValue.value || '';
				allowSetEditorValue.value = false;
			}
		}, { immediate: true } );

		watch( functionZid, ( newValue, oldValue ) => {
			if ( !oldValue || newValue === oldValue ) {
				return;
			}
			// If the functionZid changes, we need to update the code editor with the new boilerplate code
			allowSetEditorValue.value = true;
			// Reinitialize the code editor with updated boilerplate code
			emit( 'set-value', {
				keyPath: [ Constants.Z_CODE_CODE, Constants.Z_STRING_VALUE ],
				value: generateBoilerplateCode( programmingLanguageValue.value )
			} );
		}, { immediate: true } );

		// Lifecycle
		onMounted( () => {
			store.fetchZids( { zids: [ Constants.Z_CODE ] } );
			if ( store.getAllProgrammingLangs.length <= 0 ) {
				store.fetchAllZProgrammingLanguages();
			}
		} );

		return {
			checkCode,
			codeErrors,
			codeLabelData,
			editorValue,
			setProgrammingLanguage,
			parentIsImplementation,
			programmingLanguageErrors,
			programmingLanguageLabelData,
			programmingLanguageLiteral,
			programmingLanguageMenuItems,
			programmingLanguageValue,
			updateCode,
			i18n
		};
	}
} );
</script>

<style lang="less">
@import '../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-code {
	.ext-wikilambda-app-code__language-selector {
		margin-top: @spacing-25;
		margin-bottom: @spacing-50;
	}

	.ext-wikilambda-app-code__inline-error {
		margin-top: @spacing-25;
	}
}
</style>
