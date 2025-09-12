<!--
	WikiLambda Vue component for Visual Editor Wikifunctions function call
	insertion and edit plugin: parser text input field.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div>
		<cdx-text-input
			:placeholder="placeholderValue"
			:model-value="value"
			@update:model-value="handleUpdate"
		></cdx-text-input>
		<cdx-progress-indicator
			v-if="isParserRunning"
			class="ext-wikilambda-app-function-input-parser__progress-indicator">
			{{ $i18n( 'wikilambda-loading' ).text() }}
		</cdx-progress-indicator>
	</div>
</template>

<script>
const { defineComponent } = require( 'vue' );
const { mapState, mapActions } = require( 'pinia' );

const Constants = require( '../../../Constants.js' );
const useMainStore = require( '../../../store/index.js' );
const errorMixin = require( '../../../mixins/errorMixin.js' );
const typeMixin = require( '../../../mixins/typeMixin.js' );
const zobjectMixin = require( '../../../mixins/zobjectMixin.js' );

// Codex components
const { CdxTextInput, CdxProgressIndicator } = require( '../../../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'wl-function-input-parser',
	components: {
		'cdx-text-input': CdxTextInput,
		'cdx-progress-indicator': CdxProgressIndicator
	},
	mixins: [ errorMixin, typeMixin, zobjectMixin ],
	props: {
		value: {
			type: String,
			required: false,
			default: ''
		},
		inputType: {
			type: String,
			required: true
		}
	},
	emits: [ 'update', 'input', 'validate', 'loading-start', 'loading-end' ],
	data: function () {
		return {
			areTestsFetched: false,
			isParserRunning: false, // Track whether the parser is running
			parserAbortController: null, // Track the AbortController for parser requests
			debounceDelay: 1000,
			debounceTimer: null
		};
	},
	computed: Object.assign( {}, mapState( useMainStore, [
		'getParserZid',
		'getRendererZid',
		'getRendererExamples',
		'getUserLangZid',
		'getValidRendererTests',
		'getUserLangZid'
	] ), {
		/**
		 * Return renderer function Zid
		 *
		 * @return {string}
		 */
		rendererZid: function () {
			return this.getRendererZid( this.inputType );
		},
		/**
		 * Return parser function Zid
		 *
		 * @return {string}
		 */
		parserZid: function () {
			return this.getParserZid( this.inputType );
		},
		/**
		 * Returns the rendered examples in case the renderer
		 * tests were run.
		 *
		 * @return {Array}
		 */
		renderedExamples: function () {
			return this.getRendererExamples( this.rendererZid );
		},
		/**
		 * Return a dynamically generated placeholder for the input field
		 * using the available tests for the renderer function. If none are
		 * available, returns the fallback placeholder message.
		 *
		 * @return {string}
		 */
		placeholderValue: function () {
			if ( this.renderedExamples.length > 0 ) {
				const example = this.renderedExamples[ 0 ].result;
				return this.$i18n( 'wikilambda-string-renderer-field-example', example ).text();
			}
			return '';
		},
		/**
		 * Filters the passing test zids array and returns an array with the
		 * test objects for those which are wellformed. We consider wellformed
		 * tests those which have a call to the renderer function on the first
		 * level, directly under the Test call key/Z20K1.
		 *
		 * @return {Array}
		 */
		validRendererTests: function () {
			// Return an empty array if tests are not fetched
			if ( !this.areTestsFetched ) {
				return [];
			}
			return this.getValidRendererTests( this.rendererZid );
		},
		/**
		 * Return error message for the parser function
		 *
		 * @return {string}
		 */
		fallbackErrorMsg: function () {
			return this.$i18n( 'wikilambda-visualeditor-wikifunctionscall-error-parser', this.inputType ).parse();
		},
		/**
		 * Whether this input type allows for empty fields
		 *
		 * @return {boolean}
		 */
		allowsEmptyField: function () {
			return Constants.VE_ALLOW_EMPTY_FIELD.includes( this.inputType );
		}
	} ),
	methods: Object.assign( {}, mapActions( useMainStore, [
		'getTestResults',
		'runParser',
		'runRendererTest'
	] ), {
		/**
		 * Validates the value by triggering the Parser function for the input type.
		 * Passes the current value and resolves the promise with the parsed value.
		 *
		 * @param {string} value - The value to validate.
		 * @return {Promise<void>} - A promise that resolves if the value is valid or rejects with an error message.
		 */
		isValid: function ( value ) {
			return new Promise( ( resolve, reject ) => {
				// With empty value: if allowed, resolve; else reject
				if ( !value ) {
					if ( this.allowsEmptyField ) {
						resolve();
					} else {
						reject( this.$i18n( 'wikilambda-visualeditor-wikifunctionscall-error-parser-empty' ).text() );
					}
				}

				// Cancel previous parser request if any
				if ( this.parserAbortController ) {
					this.parserAbortController.abort();
				}
				this.parserAbortController = new AbortController();

				// With non-empty value: run parser function
				this.runParser( {
					parserZid: this.parserZid,
					zobject: value,
					zlang: this.getUserLangZid,
					wait: true,
					signal: this.parserAbortController.signal
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
						this.setErrorMessageCallback( metadata, this.fallbackErrorMsg, reject );
					} else if ( this.typeToString( this.getZObjectType( response ) ) !== this.inputType ) {
						// Parser return unexpected type: reject with error message
						reject( this.fallbackErrorMsg );
					} else {
						// Success: Resolve the promise
						resolve();
					}
				} ).catch( ( error ) => {
					// If the parser request was aborted, set the error code to 'abort'
					if ( error.code === 'abort' ) {
						reject( error.code );
					}
					reject( this.fallbackErrorMsg );
				} );
			} );
		},

		/**
		 * Handles the start of the validation process by emitting the appropriate events.
		 * - Sets the field as invalid.
		 * - Sets the parser running state.
		 */
		onValidateStart: function () {
			this.$emit( 'validate', { isValid: false } );
			this.isParserRunning = true;
		},

		/**
		 * Handles the end of the validation process by resetting the parser state.
		 * - Resets the parser running state.
		 */
		onValidateEnd: function () {
			this.isParserRunning = false;
		},

		/**
		 * Handles validation success by emitting the appropriate events.
		 */
		onValidateSuccess: function () {
			this.$emit( 'validate', { isValid: true } );
		},

		/**
		 * Handles validation error by emitting the appropriate events.
		 *
		 * @param {string} error - The error message to emit.
		 */
		onValidateError: function ( error ) {
			// If the error message is 'abort', do not emit an error
			// because the validation was cancelled.
			if ( error === 'abort' ) {
				return;
			}
			// Otherwise, emit the error message
			this.$emit( 'validate', { isValid: false, errorMessage: error } );
		},

		/**
		 * Validates the value and handles the validation result.
		 * Emits validation status and optionally updates the value if valid.
		 *
		 * @param {string} value - The value to validate.
		 * @param {boolean} emitUpdate - Whether to emit the update event after validation.
		 * @return {Promise}
		 */
		validate: function ( value ) {
			this.onValidateStart();
			return this.isValid( value )
				.then( () => this.onValidateSuccess() )
				.catch( ( error ) => this.onValidateError( error ) )
				.finally( () => this.onValidateEnd() );
		},

		/**
		 * Handles the update model value event and emits:
		 * * 'input' event, to set the local value of the field
		 * * debounced validation, after which it emits 'update' event,
		 *   to set the value in the store and make it available for VE
		 *
		 * @param {string} value - The updated value.
		 */
		handleUpdate: function ( value ) {
			this.$emit( 'input', value );

			// Clear debounce
			clearTimeout( this.debounceTimer );

			// Set new debounce
			this.debounceTimer = setTimeout( () => {
				this.handleChange( value );
			}, this.debounceDelay );
		},

		/**
		 * Vlidates the new value asynchronously and emits
		 * the update event once the validation has finished.
		 *
		 * @param {string} value
		 */
		handleChange: function ( value ) {
			this.validate( value ).then( () => {
				this.$emit( 'update', value );
			} );
		},

		/**
		 * Runs the test results for the renderer function asynchronously.
		 * Updates the `areTestsFetched` flag during the process.
		 * The results are gathered as reactive computed properties.
		 */
		generateRendererExamples: function () {
			this.areTestsFetched = false;

			this.getTestResults( {
				zFunctionId: this.rendererZid
			} ).then( () => {
				// Do nothing, the results will be gathered as reactive computed properties
			} ).finally( () => {
				this.areTestsFetched = true;
			} );
		}
	} ),
	watch: {
		/**
		 * Watches the computed property `validRendererTests` and triggers the renderer function test
		 * for each valid test. The renderer function is executed with the user language as the second input.
		 *
		 * @param {Array} tests
		 */
		validRendererTests: function ( tests ) {
			for ( const test of tests ) {
				this.runRendererTest( {
					rendererZid: this.rendererZid,
					testZid: test.zid,
					test: test.zobject,
					zlang: this.getUserLangZid
				} );
			}
		}
	},
	/**
	 * Lifecycle hook that runs after the component is mounted.
	 * Validates the initial value and triggers the generation of renderer examples.
	 */
	mounted: function () {
		this.validate( this.value );
		this.generateRendererExamples();
	},
	beforeUnmount: function () {
		// Cancel any ongoing parser request when the component is unmounted
		if ( this.parserAbortController ) {
			this.parserAbortController.abort();
		}
	}
} );
</script>

<style lang="less">
@import '../../../ext.wikilambda.app.variables.less';

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
</style>
