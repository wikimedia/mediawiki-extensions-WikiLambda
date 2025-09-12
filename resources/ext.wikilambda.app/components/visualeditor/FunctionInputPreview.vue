<template>
	<cdx-accordion
		:model-value="isOpen"
		class="ext-wikilambda-app-function-input-preview"
		:action-icon="actionIcon"
		:action-button-label="actionButtonLabel"
		@action-button-click="handleActionButtonClick"
		@update:model-value="handleAccordionClick">
		<template #title>
			{{ $i18n( 'wikilambda-visualeditor-wikifunctionscall-preview-title' ).text() }}
		</template>
		<div class="ext-wikilambda-app-function-input-preview__content">
			<cdx-progress-indicator v-if="isLoading">
				{{ $i18n( 'wikilambda-loading' ).text() }}
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
						:icon-label="$i18n( 'wikilambda-visualeditor-wikifunctionscall-preview-cancelled' ).text()"
					></cdx-icon>
					<span> {{ $i18n( 'wikilambda-visualeditor-wikifunctionscall-preview-cancelled' ).text() }}</span>
				</div>
				<span v-else class="ext-wikilambda-app-function-input-preview__no-result">
					{{ $i18n( 'wikilambda-visualeditor-wikifunctionscall-preview-no-result' ).text() }}
				</span>
			</div>
		</div>
	</cdx-accordion>
</template>

<script>
const { defineComponent } = require( 'vue' );
const { mapActions, mapState } = require( 'pinia' );
const Constants = require( '../../Constants.js' );
const { performFunctionCall } = require( '../../utils/apiUtils.js' );
const errorMixin = require( '../../mixins/errorMixin.js' );
const typeMixin = require( '../../mixins/typeMixin.js' );
const zobjectMixin = require( '../../mixins/zobjectMixin.js' );
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
	mixins: [ typeMixin, errorMixin, zobjectMixin ],
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
	data: function () {
		return {
			/**
			 * Icon for the reset action.
			 *
			 * @type {string}
			 */
			resetIcon: icons.cdxIconReload,
			/**
			 * Icon for the cancel action.
			 *
			 * @type {string}
			 */
			cancelIcon: icons.cdxIconCancel,
			/**
			 * Result of the function call.
			 *
			 * @type {string|null}
			 */
			functionCallResult: null,
			/**
			 * Error message from the function call.
			 *
			 * @type {string|null}
			 */
			functionCallError: null,
			/**
			 * Loading state of the function call.
			 *
			 * @type {boolean}
			 */
			isLoading: false,
			/**
			 * State of the accordion.
			 *
			 * @type {boolean}
			 */
			isOpen: false,
			/**
			 * Flag to indicate if the function call was cancelled by the user.
			 *
			 * @type {boolean}
			 */
			isCancelled: false,
			/**
			 * Tracks the last processed params to avoid redundant function calls.
			 *
			 * @type {Array|null}
			 */
			lastProcessedParams: null,
			/**
			 * Abort Controller for managing function calls.
			 *
			 * @type {Object|null}
			 */
			abortController: null,
			/**
			 * Collection of callbacks that produce default values for empty args
			 * indexed by the argument type.
			 *
			 * @type {Object}
			 */
			defaultValueCallbacks: {
				[ Constants.Z_GREGORIAN_CALENDAR_DATE ]: () => {
					const today = new Date();
					const d = today.getDate();
					const m = today.getMonth() + 1;
					const yyyy = today.getFullYear();
					return `${ d }-${ m }-${ yyyy }`;
				},
				[ Constants.Z_NATURAL_LANGUAGE ]: () => {
					const langCode = mw.config.get( 'wgContentLanguage' );
					return this.getLanguageZidOfCode( langCode ) || '';
				},
				[ Constants.Z_WIKIDATA_ITEM ]: () => mw.config.get( 'wgWikibaseItemId' ) || '',
				[ Constants.Z_WIKIDATA_REFERENCE_ITEM ]: () => mw.config.get( 'wgWikibaseItemId' ) || ''
			}
		};
	},
	computed: Object.assign( {}, mapState( useMainStore, [
		'getLanguageZidOfCode',
		'getOutputTypeOfFunctionZid',
		'getUserLangCode',
		'getUserLangZid',
		'getParserZid',
		'getRendererZid',
		'createObjectByType'
	] ), {
		/**
		 * Determines the icon for the action button.
		 *
		 * @return {string}
		 */
		actionIcon: function () {
			// If the function call is in progress, show the cancel icon.
			if ( this.isLoading ) {
				return this.cancelIcon;
			}
			// If the field is valid (payload exists) and the function call result is a string,
			// or if there is an error or the call was cancelled, show the reset icon.
			if ( this.payload && ( typeof this.functionCallResult === 'string' || this.functionCallError || this.isCancelled ) ) {
				return this.resetIcon;
			}
			return '';
		},
		/**
		 * Determines the label for the action button.
		 *
		 * @return {string}
		 */
		actionButtonLabel: function () {
			if ( this.isLoading ) {
				return this.$i18n( 'wikilambda-visualeditor-wikifunctionscall-preview-cancel-button-label' ).text();
			}
			if ( this.payload && ( typeof this.functionCallResult === 'string' || this.functionCallError || this.isCancelled ) ) {
				return this.$i18n( 'wikilambda-visualeditor-wikifunctionscall-preview-retry-button-label' ).text();
			}
			return '';
		}
	} ),
	methods: Object.assign( {}, mapActions( useMainStore, [
		'fetchLanguageCode',
		'submitVEInteraction'
	] ), {
		/**
		 * Handles the click event for the action button.
		 * - If the component is in a loading state, cancels the current function call.
		 * - Otherwise, initiates a new function call using the provided payload.
		 */
		handleActionButtonClick: function () {
			if ( this.isLoading ) {
				this.cancelFunctionCall();
			} else {
				this.runFunctionCall( this.payload );
			}
		},

		/**
		 * Cancels the current function call by setting the `isCancelled` flag to `true`,
		 * aborting the Abort Controller if it exists and stopping the loading state.
		 */
		cancelFunctionCall: function () {
			if ( this.abortController ) {
				this.abortController.abort();
			}
			this.isCancelled = true;
			this.isLoading = false;
		},

		/**
		 * Handles the click event for the accordion.
		 *
		 * @param {boolean} isOpen - The new state of the accordion.
		 */
		handleAccordionClick: function ( isOpen ) {
			this.isOpen = isOpen;
		},

		/**
		 * Checks if a parser ZID exists for the given type.
		 *
		 * @param {string} type - The type of the parameter.
		 * @return {boolean} - Returns `true` if a parser ZID exists, otherwise `false`.
		 */
		hasParserZid: function ( type ) {
			return !!this.getParserZid( type );
		},

		/**
		 * Constructs the function call parameter based on its type.
		 * Handles parser calls, enum types, and default cases.
		 *
		 * @param {Object} param - The parameter object containing `value` and `type`.
		 * @param {string} param.value - The value of the parameter.
		 * @param {string} param.type - The type of the parameter.
		 * @return {Object|string} - The created parameter object or string.
		 */
		createFunctionCallParam: function ( param ) {
			let { value } = param;
			const { type } = param;

			// Overwrite value with the default value if it's empty and type has a callback
			if ( value === '' && this.hasDefaultValue( type ) ) {
				value = this.getDefaultValue( type );
			}

			// If the type has a parser ZID, create a parser call
			if ( this.hasParserZid( type ) ) {
				return this.createParserCall( type, value );
			}

			// For all other types, create an object by type
			// Except Z1, which defaults to String/Z6
			return this.createObjectByType( {
				type: type === Constants.Z_OBJECT ? Constants.Z_STRING : type,
				value
			} );
		},

		/**
		 * Creates a parser call object for the given type and value.
		 *
		 * @param {string} type - The type of the parameter.
		 * @param {string} value - The value of the parameter.
		 * @return {Object} - The created parser call object.
		 */
		createParserCall: function ( type, value ) {
			const parserZid = this.getParserZid( type );
			return createParserCall( {
				parserZid,
				zobject: value,
				zlang: this.getUserLangZid
			} );
		},

		/**
		 * Creates the renderer call using the given renderer ZID and the function call.
		 *
		 * @param {string} rendererZid - The ZID of the renderer function.
		 * @param {Object} functionCall - The created function call object.
		 * @return {Object} - The renderer function call object.
		 */
		createRendererCall: function ( rendererZid, functionCall ) {
			return createRendererCall( {
				rendererZid,
				zobject: functionCall,
				zlang: this.getUserLangZid
			} );
		},

		/**
		 * Creates the function call with its parameters.
		 *
		 * @param {string} functionZid - The ZID of the function to call.
		 * @param {Array} params - The parameters for the function call.
		 * @return {Object} - The function call object.
		 */
		createFunctionCall: function ( functionZid, params ) {
			const functionCall = this.getScaffolding( Constants.Z_FUNCTION_CALL );
			functionCall[ Constants.Z_FUNCTION_CALL_FUNCTION ] = functionZid;
			params.forEach( ( param, index ) => {
				functionCall[ `${ functionZid }K${ index + 1 }` ] = this.createFunctionCallParam( param );
			} );
			return functionCall;
		},

		/**
		 * Constructs the function call object with its parameters.
		 *
		 * @param {string} functionZid - The ZID of the function to call.
		 * @param {Array} params - The parameters for the function call.
		 * @return {Object} - The created function call object.
		 */
		constructFunctionCall: function ( functionZid, params ) {
			const outputType = this.getOutputTypeOfFunctionZid( functionZid );
			const rendererZid = this.getRendererZid( outputType );

			// Construct the main function call object
			const functionCall = this.createFunctionCall( functionZid, params );

			// If no renderer is needed, return the function call as is
			if ( !rendererZid ) {
				return functionCall;
			}

			// If a renderer is needed, wrap the function call with a renderer call
			return this.createRendererCall( rendererZid, functionCall );
		},

		/**
		 * Executes a function call with the provided payload.
		 * Handles API requests, error handling, and updates the component's state.
		 *
		 * @param {Object} payload - The payload containing details for the function call.
		 * @param {string} payload.functionZid - The ZID of the function to call.
		 * @param {Array} payload.params - The parameters to pass to the function call.
		 * @return {Promise} - A promise that resolves when the function call completes.
		 */
		runFunctionCall: function ( payload ) {
			const { functionZid, params } = payload;

			// Track the preview action
			this.submitVEInteraction( 'preview-change-query' );

			// Cancel previous request and set up a new AbortController
			if ( this.abortController ) {
				this.abortController.abort();
			}
			// Create a new AbortController for the current function call
			this.abortController = new AbortController();
			const signal = this.abortController.signal;

			this.startLoading();

			return performFunctionCall( {
				functionCall: this.constructFunctionCall( functionZid, params ),
				language: this.getUserLangCode,
				signal
			} )
				.then( ( data ) => {
					const response = data.response[ Constants.Z_RESPONSEENVELOPE_VALUE ];

					// If the function call returns void or an unexpected type, set an error message
					const type = this.typeToString( this.getZObjectType( response ) );
					const isAllowedOutputType = type !== Constants.Z_STRING || type !== Constants.Z_HTML_FRAGMENT;
					if ( response === Constants.Z_VOID || !isAllowedOutputType ) {
						this.functionCallError = this.$i18n( 'wikilambda-visualeditor-wikifunctionscall-preview-error' ).text();
						this.isLoading = false;
						return;
					}
					// Else, set the function call result
					this.functionCallResult = this.getFunctionCallResult( type, response );
					this.isLoading = false;
				} )
				.catch( ( error ) => {
					if ( error.code === 'abort' ) {
						return;
					}
					this.functionCallError = error.messageOrFallback( 'wikilambda-unknown-exec-error-message' );
					this.isLoading = false;
				} );
		},

		/**
		 * Retrieves the result of a function call based on its type.
		 *
		 * @param {string} type - The type of the function call result.
		 * @param {string|Object} data - The data returned from the function call.
		 * @return {string|null} - The processed result of the function call, or null if not applicable.
		 */
		getFunctionCallResult: function ( type, data ) {
			if ( type === Constants.Z_STRING ) {
				return data;
			}

			if ( type === Constants.Z_HTML_FRAGMENT ) {
				return data[ Constants.Z_HTML_FRAGMENT_VALUE ];
			}
			return null;
		},

		/**
		 * Initializes the loading state for a new function call.
		 * Resets the function call result, error messages, and cancellation flag.
		 */
		startLoading: function () {
			this.functionCallResult = null;
			this.functionCallError = null;
			this.isCancelled = false;
			this.isLoading = true;
		},

		/**
		 * Determines whether the function call should be executed based on the
		 * component's open state and the provided parameters.
		 *
		 * @param {Object} payload - The payload object containing function call details.
		 * @return {boolean} - Returns `true` if the function call should be executed, otherwise `false`.
		 */
		shouldRunFunction: function ( payload ) {
			return this.isOpen &&
					payload && JSON.stringify( payload.params ) !== JSON.stringify( this.lastProcessedParams );
		},

		/**
		 * Processes the function call if the conditions for execution are met.
		 * Updates the last processed parameters to avoid redundant calls.
		 *
		 * @param {Object} payload - The payload object containing function call details.
		 */
		processFunctionCall: function ( payload ) {
			if ( this.shouldRunFunction( payload ) ) {
				this.runFunctionCall( payload );
				this.lastProcessedParams = payload.params;
			}
		},

		/**
		 * Determines whether the defaultValueCallbacks config variable
		 * has a callback function for the given type.
		 *
		 * @param {string} type
		 * @return {boolean}
		 */
		hasDefaultValue: function ( type ) {
			return ( type in this.defaultValueCallbacks );
		},

		/**
		 * Runs the defaultValueCallbacks callback function for the
		 * given type and returns the generated string.
		 *
		 * @param {string} type
		 * @return {string}
		 */
		getDefaultValue: function ( type ) {
			return this.defaultValueCallbacks[ type ]();
		}
	} ),
	watch: {
		/**
		 * Watches for changes to the `isOpen` property.
		 * When opened, triggers the function call if the payload is updated
		 */
		isOpen: function () {
			this.processFunctionCall( this.payload );
		},
		/**
		 * Watches for changes to the function call payload's params.
		 * When updated, fetches the new function call result.
		 *
		 * @param {Object} newPayload - The updated payload for the function call.
		 */
		payload: {
			handler: function ( newPayload ) {
				this.processFunctionCall( newPayload );
			},
			deep: true
		}
	},
	mounted: function () {
		// Fetch language zid for content page
		const langCode = mw.config.get( 'wgContentLanguage' );
		this.fetchLanguageCode( langCode );
	},
	beforeUnmount: function () {
		// Clean up the Abort Controller if it exists
		if ( this.abortController ) {
			this.abortController.abort();
		}
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
