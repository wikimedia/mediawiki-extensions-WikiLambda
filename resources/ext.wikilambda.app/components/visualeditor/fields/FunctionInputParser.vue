<!--
	WikiLambda Vue component for Visual Editor Wikifunctions function call
	insertion and edit plugin: parser text input field.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-app-function-input-parser">
		<cdx-text-input
			:placeholder="placeholder"
			:model-value="value"
			:disabled="shouldUseDefaultValue"
			@update:model-value="handleUpdate"
		></cdx-text-input>
		<cdx-progress-indicator
			v-if="isParserRunning"
			class="ext-wikilambda-app-function-input-parser__progress-indicator">
			{{ i18n( 'wikilambda-loading' ).text() }}
		</cdx-progress-indicator>
	</div>
</template>

<script>
const { computed, defineComponent, inject, onBeforeUnmount, onMounted, ref, watch } = require( 'vue' );

const Constants = require( '../../../Constants.js' );
const useMainStore = require( '../../../store/index.js' );
const ErrorData = require( '../../../store/classes/ErrorData.js' );
const useType = require( '../../../composables/useType.js' );
const useZObject = require( '../../../composables/useZObject.js' );

// Codex components
const { CdxTextInput, CdxProgressIndicator } = require( '../../../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'wl-function-input-parser',
	components: {
		'cdx-text-input': CdxTextInput,
		'cdx-progress-indicator': CdxProgressIndicator
	},
	props: {
		value: {
			type: String,
			required: false,
			default: ''
		},
		inputType: {
			type: String,
			required: true
		},
		shouldUseDefaultValue: {
			type: Boolean,
			required: false,
			default: false
		},
		hasDefaultValue: {
			type: Boolean,
			required: false,
			default: false
		},
		defaultValue: {
			type: String,
			required: false,
			default: ''
		}
	},
	emits: [ 'update', 'input', 'validate', 'loading-start', 'loading-end' ],
	setup( props, { emit } ) {
		const i18n = inject( 'i18n' );
		const { typeToString } = useType();
		const { getZObjectType } = useZObject();
		const store = useMainStore();

		// Constants
		const debounceDelay = 1000;

		// State
		const areTestsFetched = ref( false );
		const isParserRunning = ref( false );
		let debounceTimer = null;
		let parserAbortController = null;

		// Parser and renderer data
		/**
		 * Return renderer function Zid
		 *
		 * @return {string}
		 */
		const rendererZid = computed( () => store.getRendererZid( props.inputType ) );

		/**
		 * Return parser function Zid
		 *
		 * @return {string}
		 */
		const parserZid = computed( () => store.getParserZid( props.inputType ) );

		/**
		 * Returns the rendered examples in case the renderer
		 * tests were run.
		 *
		 * @return {Array}
		 */
		const renderedExamples = computed( () => store.getRendererExamples( rendererZid.value ) );

		/**
		 * Filters the passing test zids array and returns an array with the
		 * test objects for those which are wellformed. We consider wellformed
		 * tests those which have a call to the renderer function on the first
		 * level, directly under the Test call key/Z20K1.
		 *
		 * @return {Array}
		 */
		const validRendererTests = computed( () => {
			// Return an empty array if tests are not fetched
			if ( !areTestsFetched.value ) {
				return [];
			}
			return store.getValidRendererTests( rendererZid.value );
		} );

		// Placeholder
		/**
		 * Return the default value if the default value checkbox is checked,
		 * otherwise return the first example of the rendered examples.
		 * If no examples are available, return an empty string.
		 *
		 * @return {string}
		 */
		const placeholder = computed( () => {
			if ( props.shouldUseDefaultValue ) {
				return props.defaultValue;
			}

			if ( renderedExamples.value.length > 0 ) {
				const example = renderedExamples.value[ 0 ].result;
				return i18n( 'wikilambda-string-renderer-field-example', example ).text();
			}
			return '';
		} );

		// Error handling
		/**
		 * Return error message for the parser function
		 *
		 * @return {Object}
		 */
		const fallbackErrorData = computed( () => ( {
			errorMessageKey: 'wikilambda-visualeditor-wikifunctionscall-error-parser',
			errorParams: [ props.inputType ]
		} ) );

		// Validation configuration
		/**
		 * Whether this input type allows for empty fields
		 *
		 * @return {boolean}
		 */
		const allowsEmptyField = computed( () => Constants.VE_ALLOW_EMPTY_FIELD.includes( props.inputType ) );

		// Validation
		/**
		 * Validates the value by triggering the Parser function for the input type.
		 * Passes the current value and resolves the promise with the parsed value.
		 *
		 * @param {string} value - The value to validate.
		 * @return {Promise<void>} - A promise that resolves if the value is valid or rejects with an error message.
		 */
		const isValid = ( value ) => new Promise( ( resolve, reject ) => {
			// If default value checkbox is checked, field is valid
			if ( props.shouldUseDefaultValue ) {
				resolve();
				return;
			}

			// With empty value: if allowed AND no default value available, resolve; else reject
			if ( !value ) {
				if ( allowsEmptyField.value && !props.hasDefaultValue ) {
					resolve();
				} else {
					const errorMessageKey = 'wikilambda-visualeditor-wikifunctionscall-error-parser-empty';
					const error = ErrorData.buildErrorData( { errorMessageKey } );
					reject( error );
				}
			}

			// Cancel previous parser request if any
			if ( parserAbortController ) {
				parserAbortController.abort();
			}
			parserAbortController = new AbortController();

			// With non-empty value: run parser function
			store.runParser( {
				parserZid: parserZid.value,
				zobject: value,
				zlang: store.getUserLangZid,
				wait: true,
				signal: parserAbortController.signal
			} ).then( ( data ) => {
				const response = data.response[ Constants.Z_RESPONSEENVELOPE_VALUE ];
				// Resolve the parser promise because we do not have other API calls
				// that need to wait for the parser to finish
				data.resolver.resolve();
				if ( response === Constants.Z_VOID ) {
					// Parser returned void:
					// * get error from metadata object
					// * reject with error message
					const metadata = data.response[ Constants.Z_RESPONSEENVELOPE_METADATA ];
					const errorHandler = ( errorPayload ) => {
						const errorData = ErrorData.buildErrorData( errorPayload );
						reject( errorData );
					};
					store.handleMetadataError( {
						metadata,
						fallbackErrorData: fallbackErrorData.value,
						errorHandler
					} );
				} else if ( typeToString( getZObjectType( response ) ) !== props.inputType ) {
					// Parser return unexpected type: reject with error message
					reject( ErrorData.buildErrorData( fallbackErrorData.value ) );
				} else {
					// Success: Resolve the promise
					resolve();
				}
			} ).catch( ( error ) => {
				// If the parser request was aborted, set the error code to 'abort'
				if ( error.code === 'abort' ) {
					reject( error.code );
				}
				reject( ErrorData.buildErrorData( fallbackErrorData.value ) );
			} );
		} );

		/**
		 * Handles the start of the validation process by emitting the appropriate events.
		 * - Sets the field as invalid.
		 * - Sets the parser running state.
		 */
		function onValidateStart() {
			emit( 'validate', { isValid: false } );
			isParserRunning.value = true;
		}

		/**
		 * Handles the end of the validation process by resetting the parser state.
		 * - Resets the parser running state.
		 */
		function onValidateEnd() {
			isParserRunning.value = false;
		}

		/**
		 * Handles validation success by emitting the appropriate events.
		 */
		function onValidateSuccess() {
			emit( 'validate', { isValid: true } );
		}

		/**
		 * Handles validation error by emitting the appropriate events.
		 *
		 * @param {ErrorData|string} error - The error caught
		 */
		function onValidateError( error ) {
			// If the error message is 'abort', do not emit an error
			// because the validation was cancelled.
			if ( error === 'abort' ) {
				return;
			}
			// Otherwise, emit the ErrorData object
			emit( 'validate', { isValid: false, error } );
		}

		/**
		 * Validates the value and handles the validation result.
		 * Emits validation status and optionally updates the value if valid.
		 *
		 * @param {string} value - The value to validate.
		 * @param {boolean} emitUpdate - Whether to emit the update event after validation.
		 * @return {Promise}
		 */
		function validate( value ) {
			onValidateStart();
			return isValid( value )
				.then( () => {
					onValidateSuccess();
					onValidateEnd();
				} )
				.catch( ( error ) => {
					onValidateError( error );
					// Only call onValidateEnd if the error is not an abort
					if ( error !== 'abort' ) {
						onValidateEnd();
					}
				} );
		}

		// Event handlers
		/**
		 * Validates the new value asynchronously and emits
		 * the update event once the validation has finished.
		 *
		 * @param {string} value
		 */
		function handleChange( value ) {
			validate( value ).then( () => {
				emit( 'update', value );
			} );
		}

		/**
		 * Handles the update model value event and emits:
		 * * 'input' event, to set the local value of the field
		 * * debounced validation, after which it emits 'update' event,
		 *   to set the value in the store and make it available for VE
		 *
		 * @param {string} value - The updated value.
		 */
		function handleUpdate( value ) {
			emit( 'input', value );

			// Clear debounce
			clearTimeout( debounceTimer );

			// Set new debounce
			debounceTimer = setTimeout( () => {
				handleChange( value );
			}, debounceDelay );
		}

		// Renderer examples
		/**
		 * Runs the test results for the renderer function asynchronously.
		 * Updates the `areTestsFetched` flag during the process.
		 * The results are gathered as reactive computed properties.
		 */
		function generateRendererExamples() {
			areTestsFetched.value = false;

			store.getTestResults( {
				zFunctionId: rendererZid.value
			} ).then( () => {
				// Do nothing, the results will be gathered as reactive computed properties
			} ).finally( () => {
				areTestsFetched.value = true;
			} );
		}

		// Watch
		watch( () => props.shouldUseDefaultValue, ( newValue ) => {
			if ( newValue ) {
				// Cancel any ongoing parser validation
				if ( parserAbortController ) {
					parserAbortController.abort();
				}
				// Clear any pending debounced validation
				clearTimeout( debounceTimer );
				// Reset parser state
				isParserRunning.value = false;
			}
		} );

		watch( validRendererTests, ( tests ) => {
			for ( const test of tests ) {
				store.runRendererTest( {
					rendererZid: rendererZid.value,
					testZid: test.zid,
					test: test.zobject,
					zlang: store.getUserLangZid
				} );
			}
		} );

		// Lifecycle
		onMounted( () => {
			generateRendererExamples();
			validate( props.value );
		} );

		onBeforeUnmount( () => {
			// Cancel any ongoing parser request when the component is unmounted
			if ( parserAbortController ) {
				parserAbortController.abort();
			}
		} );

		// Return all properties and methods for the template
		return {
			handleUpdate,
			isParserRunning,
			placeholder,
			i18n
		};
	}
} );
</script>

<style lang="less">
@import '../../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-function-input-parser {
	position: relative;

	.ext-wikilambda-app-function-input-parser__progress-indicator {
		position: absolute;
		right: @spacing-50;
		bottom: @spacing-25;

		.cdx-progress-indicator__indicator {
			width: @size-icon-small;
			height: @size-icon-small;
			min-width: @size-icon-small;
			min-height: @size-icon-small;
		}
	}
}
</style>
