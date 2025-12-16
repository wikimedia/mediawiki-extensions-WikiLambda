<template>
	<cdx-accordion
		:model-value="isOpen"
		class="ext-wikilambda-app-function-input-preview"
		:action-icon="actionIcon"
		:action-button-label="actionButtonLabel"
		@action-button-click="handleActionButtonClick"
		@update:model-value="handleAccordionClick">
		<template #title>
			{{ i18n( 'wikilambda-visualeditor-wikifunctionscall-preview-title' ).text() }}
		</template>
		<div class="ext-wikilambda-app-function-input-preview__content">
			<cdx-progress-indicator v-if="isLoading">
				{{ i18n( 'wikilambda-loading' ).text() }}
			</cdx-progress-indicator>
			<div v-else>
				<span v-if="typeof functionCallResult === 'string'">{{ functionCallResult }}</span>
				<cdx-message
					v-else-if="functionCallError"
					type="error"
					:inline="true">
					{{ functionCallError }}
				</cdx-message>
				<div
					v-else-if="isCancelled"
					class="ext-wikilambda-app-function-input-preview__cancelled">
					<cdx-icon
						class="ext-wikilambda-app-function-input-preview__cancelled-icon"
						:icon="cancelIcon"
						size="medium"
						:icon-label="i18n( 'wikilambda-visualeditor-wikifunctionscall-preview-cancelled' ).text()"
					></cdx-icon>
					<span> {{ i18n( 'wikilambda-visualeditor-wikifunctionscall-preview-cancelled' ).text() }}</span>
				</div>
				<span v-else class="ext-wikilambda-app-function-input-preview__no-result">
					{{ i18n( 'wikilambda-visualeditor-wikifunctionscall-preview-no-result' ).text() }}
				</span>
			</div>
		</div>
	</cdx-accordion>
</template>

<script>
const { computed, defineComponent, inject, onBeforeUnmount, ref, watch } = require( 'vue' );
const Constants = require( '../../Constants.js' );
const { performFunctionCall } = require( '../../utils/apiUtils.js' );
const useType = require( '../../composables/useType.js' );
const useZObject = require( '../../composables/useZObject.js' );
const { CdxAccordion, CdxIcon, CdxMessage, CdxProgressIndicator } = require( '../../../codex.js' );
const useMainStore = require( '../../store/index.js' );
const icons = require( '../../../lib/icons.json' );
const { createParserCall, createRendererCall } = require( '../../utils/zobjectUtils.js' );

module.exports = exports = defineComponent( {
	name: 'wl-function-input-preview',
	components: {
		'cdx-icon': CdxIcon,
		'cdx-accordion': CdxAccordion,
		'cdx-message': CdxMessage,
		'cdx-progress-indicator': CdxProgressIndicator
	},
	props: {
		/**
		 * Function call payload.
		 *
		 * @type {Object}
		 */
		payload: {
			type: Object,
			required: false,
			default: null
		}
	},
	setup( props ) {
		const i18n = inject( 'i18n' );
		const { typeToString, getScaffolding } = useType();
		const {
			getZHTMLFragmentTerminalValue,
			getZObjectType,
			getZStringTerminalValue
		} = useZObject( { keyPath: props.keyPath } );
		const store = useMainStore();

		// Constants
		const resetIcon = icons.cdxIconReload;
		const cancelIcon = icons.cdxIconCancel;

		// State
		const functionCallResult = ref( null );
		const functionCallError = ref( null );
		const isLoading = ref( false );
		const isOpen = ref( false );
		const isCancelled = ref( false );
		let lastProcessedParams = null;
		let abortController = null;

		// Default value callbacks
		/**
		 * Collection of callbacks that produce default values for empty args
		 * indexed by the argument type.
		 *
		 * @type {Object}
		 */
		const defaultValueCallbacks = {
			[ Constants.Z_GREGORIAN_CALENDAR_DATE ]: () => {
				const today = new Date();
				const d = today.getDate();
				const m = today.getMonth() + 1;
				const yyyy = today.getFullYear();
				return `${ d }-${ m }-${ yyyy }`;
			},
			[ Constants.Z_NATURAL_LANGUAGE ]: () => {
				const langCode = mw.config.get( 'wgContentLanguage' );
				return store.getLanguageZidOfCode( langCode ) || '';
			},
			[ Constants.Z_WIKIDATA_ITEM ]: () => mw.config.get( 'wgWikibaseItemId' ) || '',
			[ Constants.Z_WIKIDATA_REFERENCE_ITEM ]: () => mw.config.get( 'wgWikibaseItemId' ) || ''
		};

		// Action button display
		/**
		 * Determines the icon for the action button.
		 *
		 * @return {string}
		 */
		const actionIcon = computed( () => {
			// If the function call is in progress, show the cancel icon.
			if ( isLoading.value ) {
				return cancelIcon;
			}
			// If the field is valid (payload exists) and the function call result is a string,
			// or if there is an error or the call was cancelled, show the reset icon.
			if ( props.payload && ( typeof functionCallResult.value === 'string' || functionCallError.value || isCancelled.value ) ) {
				return resetIcon;
			}
			return '';
		} );

		/**
		 * Determines the label for the action button.
		 *
		 * @return {string}
		 */
		const actionButtonLabel = computed( () => {
			if ( isLoading.value ) {
				return i18n( 'wikilambda-visualeditor-wikifunctionscall-preview-cancel-button-label' ).text();
			}
			if ( props.payload && ( typeof functionCallResult.value === 'string' || functionCallError.value || isCancelled.value ) ) {
				return i18n( 'wikilambda-visualeditor-wikifunctionscall-preview-retry-button-label' ).text();
			}
			return '';
		} );

		// Accordion actions
		/**
		 * Handles the click event for the accordion.
		 *
		 * @param {boolean} value - The new state of the accordion.
		 */
		function handleAccordionClick( value ) {
			isOpen.value = value;
		}

		// Function call construction helpers
		/**
		 * Checks if a parser ZID exists for the given type.
		 *
		 * @param {string} type - The type of the parameter.
		 * @return {boolean} - Returns `true` if a parser ZID exists, otherwise `false`.
		 */
		const hasParserZid = ( type ) => !!store.getParserZid( type );

		/**
		 * Checks if a default value callback exists for the given type.
		 *
		 * @param {string} type - The type to check.
		 * @return {boolean} - Returns `true` if a callback exists, otherwise `false`.
		 */
		const hasDefaultValue = ( type ) => !!defaultValueCallbacks[ type ];

		/**
		 * Gets the default value for the given type using the callback.
		 *
		 * @param {string} type - The type to get the default value for.
		 * @return {string} - The default value.
		 */
		const getDefaultValue = ( type ) => defaultValueCallbacks[ type ]();

		/**
		 * Creates a parser call object for the given type and value.
		 *
		 * @param {string} type - The type of the parameter.
		 * @param {string} value - The value of the parameter.
		 * @return {Object} - The created parser call object.
		 */
		function createParserCallMethod( type, value ) {
			const parserZid = store.getParserZid( type );
			return createParserCall( {
				parserZid,
				zobject: value,
				zlang: store.getUserLangZid
			} );
		}

		/**
		 * Constructs the function call parameter based on its type.
		 * Handles parser calls, enum types, and default cases.
		 *
		 * @param {Object} param - The parameter object containing `value` and `type`.
		 * @param {string} param.value - The value of the parameter.
		 * @param {string} param.type - The type of the parameter.
		 * @return {Object|string} - The created parameter object or string.
		 */
		function createFunctionCallParam( param ) {
			let { value } = param;
			const { type } = param;

			// Overwrite value with the default value if it's empty and type has a callback
			if ( value === '' && hasDefaultValue( type ) ) {
				value = getDefaultValue( type );
			}

			// If the type has a parser ZID, create a parser call
			if ( hasParserZid( type ) ) {
				return createParserCallMethod( type, value );
			}

			// For all other types, create an object by type
			// Except Z1, which defaults to String/Z6
			return store.createObjectByType( {
				type: type === Constants.Z_OBJECT ? Constants.Z_STRING : type,
				value
			} );
		}

		/**
		 * Creates the renderer call using the given renderer ZID and the function call.
		 *
		 * @param {string} rendererZid - The ZID of the renderer function.
		 * @param {Object} functionCall - The created function call object.
		 * @return {Object} - The renderer function call object.
		 */
		const createRendererCallMethod = ( rendererZid, functionCall ) => createRendererCall( {
			rendererZid,
			zobject: functionCall,
			zlang: store.getUserLangZid
		} );

		/**
		 * Creates the function call with its parameters.
		 *
		 * @param {string} functionZid - The ZID of the function to call.
		 * @param {Array} params - The parameters for the function call.
		 * @return {Object} - The function call object.
		 */
		function createFunctionCallMethod( functionZid, params ) {
			const functionCall = getScaffolding( Constants.Z_FUNCTION_CALL );
			functionCall[ Constants.Z_FUNCTION_CALL_FUNCTION ] = functionZid;
			params.forEach( ( param, index ) => {
				functionCall[ `${ functionZid }K${ index + 1 }` ] = createFunctionCallParam( param );
			} );
			return functionCall;
		}

		/**
		 * Constructs the function call object with its parameters.
		 *
		 * @param {string} functionZid - The ZID of the function to call.
		 * @param {Array} params - The parameters for the function call.
		 * @return {Object} - The created function call object.
		 */
		function constructFunctionCall( functionZid, params ) {
			const outputType = store.getOutputTypeOfFunctionZid( functionZid );
			const rendererZid = store.getRendererZid( outputType );

			// Construct the main function call object
			const functionCall = createFunctionCallMethod( functionZid, params );

			// If no renderer is needed, return the function call as is
			if ( !rendererZid ) {
				return functionCall;
			}

			// If a renderer is needed, wrap the function call with a renderer call
			return createRendererCallMethod( rendererZid, functionCall );
		}

		// Function call execution
		/**
		 * Cancels the current function call by setting the `isCancelled` flag to `true`,
		 * aborting the Abort Controller if it exists and stopping the loading state.
		 */
		function cancelFunctionCall() {
			if ( abortController ) {
				abortController.abort();
			}
			isCancelled.value = true;
			isLoading.value = false;
		}

		/**
		 * Starts the loading state and resets result/error states.
		 */
		function startLoading() {
			isLoading.value = true;
			functionCallResult.value = null;
			functionCallError.value = null;
			isCancelled.value = false;
		}

		/**
		 * Retrieves the result of a function call based on its type.
		 *
		 * @param {string} type - The type of the response.
		 * @param {Object|string} response - The response from the function call.
		 * @return {string} - The result as a string.
		 */
		function getFunctionCallResult( type, response ) {
			if ( type === Constants.Z_STRING ) {
				return getZStringTerminalValue( response );
			}
			if ( type === Constants.Z_HTML_FRAGMENT ) {
				return getZHTMLFragmentTerminalValue( response );
			}
			return '';
		}

		/**
		 * Executes a function call with the provided payload.
		 * Handles API requests, error handling, and updates the component's state.
		 *
		 * @param {Object} payload - The payload containing details for the function call.
		 * @param {string} payload.functionZid - The ZID of the function to call.
		 * @param {Array} payload.params - The parameters to pass to the function call.
		 * @return {Promise} - A promise that resolves when the function call completes.
		 */
		function runFunctionCall( payload ) {
			const { functionZid, params } = payload;

			// Track the preview action
			store.submitVEInteraction( 'preview-change-query' );

			// Cancel previous request and set up a new AbortController
			if ( abortController ) {
				abortController.abort();
			}
			// Create a new AbortController for the current function call
			abortController = new AbortController();
			const signal = abortController.signal;

			startLoading();

			return performFunctionCall( {
				functionCall: constructFunctionCall( functionZid, params ),
				language: store.getUserLangCode,
				signal
			} )
				.then( ( data ) => {
					const response = data.response[ Constants.Z_RESPONSEENVELOPE_VALUE ];

					// If the function call returns void or an unexpected type, set an error message
					const type = typeToString( getZObjectType( response ) );
					const isAllowedOutputType = type !== Constants.Z_STRING || type !== Constants.Z_HTML_FRAGMENT;
					if ( response === Constants.Z_VOID || !isAllowedOutputType ) {
						functionCallError.value = i18n( 'wikilambda-visualeditor-wikifunctionscall-preview-error' ).text();
						isLoading.value = false;
						return;
					}
					// Else, set the function call result
					functionCallResult.value = getFunctionCallResult( type, response );
					isLoading.value = false;
				} )
				.catch( ( error ) => {
					if ( error.code === 'abort' ) {
						return;
					}
					functionCallError.value = error.messageOrFallback( 'wikilambda-unknown-exec-error-message' );
					isLoading.value = false;
				} );
		}

		/**
		 * Determines whether the function call should be executed based on the
		 * component's open state and the provided parameters.
		 *
		 * @param {Object} payload - The payload object containing function call details.
		 * @return {boolean} - Returns `true` if the function call should be executed, otherwise `false`.
		 */
		const shouldRunFunction = ( payload ) => isOpen.value &&
					payload && JSON.stringify( payload.params ) !== JSON.stringify( lastProcessedParams );

		/**
		 * Processes the function call if the conditions for execution are met.
		 * Updates the last processed parameters to avoid redundant calls.
		 *
		 * @param {Object} payload - The payload object containing function call details.
		 */
		function processFunctionCall( payload ) {
			if ( shouldRunFunction( payload ) ) {
				runFunctionCall( payload );
				lastProcessedParams = payload.params;
			}
		}

		/**
		 * Handles the click event for the action button.
		 * - If the component is in a loading state, cancels the current function call.
		 * - Otherwise, initiates a new function call using the provided payload.
		 */
		function handleActionButtonClick() {
			if ( isLoading.value ) {
				cancelFunctionCall();
			} else {
				runFunctionCall( props.payload );
			}
		}

		// Watch
		watch( isOpen, () => {
			processFunctionCall( props.payload );
		} );

		watch( () => props.payload, ( newPayload ) => {
			processFunctionCall( newPayload );
		}, { deep: true } );

		// Lifecycle
		onBeforeUnmount( () => {
			// Clean up the Abort Controller if it exists
			if ( abortController ) {
				abortController.abort();
			}
		} );

		// Return all properties and methods for the template
		return {
			actionButtonLabel,
			actionIcon,
			cancelIcon,
			functionCallError,
			functionCallResult,
			handleAccordionClick,
			handleActionButtonClick,
			isCancelled,
			isLoading,
			isOpen,
			i18n
		};
	}
} );
</script>

<style lang="less">
@import '../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-function-input-preview {
	background-color: @background-color-progressive-subtle;

	.ext-wikilambda-app-function-input-preview__content {
		padding: 0 @spacing-150;
		font-size: @font-size-medium;
		min-height: @size-200;
		word-break: break-word;
	}

	.ext-wikilambda-app-function-input-preview__cancelled,
	.ext-wikilambda-app-function-input-preview__cancelled-icon,
	.ext-wikilambda-app-function-input-preview__no-result {
		color: @color-placeholder;
	}
}
</style>
