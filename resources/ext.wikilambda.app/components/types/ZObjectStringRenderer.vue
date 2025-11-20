<!--
	WikiLambda Vue component for a ZObject with a string renderer.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-app-object-string-renderer" data-testid="z-object-string-renderer">
		<!-- If expanded is false, show text field -->
		<template v-if="!expanded">
			<p
				v-if="!edit"
				class="ext-wikilambda-app-object-string-renderer__text"
				:class="{ 'ext-wikilambda-app-object-string-renderer__rendering': rendererRunning }"
				data-testid="zobject-string-renderer-text">
				{{ renderedValue }}
			</p>
			<!-- We capture the change event instead of update:modelValue
			to reduce the number of unnecessary calls to the orchestrator -->
			<cdx-text-input
				v-else
				:class="{ 'cdx-text-input--status-error': hasFieldErrors }"
				:model-value="renderedValue"
				:disabled="rendererRunning"
				:placeholder="placeholderValue"
				data-testid="zobject-string-renderer-input"
				@change="setRenderedValue"
			></cdx-text-input>
			<div
				v-if="hasFieldErrors"
				class="ext-wikilambda-app-object-string-renderer__error"
			>
				<cdx-message :type="fieldErrors[0].type" :inline="true">
					<wl-safe-message :error="fieldErrors[0]"></wl-safe-message>
				</cdx-message>
				<cdx-button
					v-if="showExamplesLink"
					weight="quiet"
					action="progressive"
					class="ext-wikilambda-app-object-string-renderer__examples-link"
					@click="openExamplesDialog">
					{{ i18n( 'wikilambda-string-renderer-examples-title' ).text() }}
				</cdx-button>
				<!-- eslint-disable vue/no-v-html -->
				<p
					v-if="showErrorFooter"
					class="ext-wikilambda-app-object-string-renderer__error-footer"
					v-html="i18n( 'wikilambda-renderer-error-footer-project-chat' ).parse()"
				></p>
				<!-- eslint-enable vue/no-v-html -->
			</div>
		</template>

		<!-- If expanded is true, show key-value set -->
		<template v-else>
			<wl-z-object-key-value-set
				:key-path="keyPath"
				:object-value="objectValue"
				:edit="edit"
				:type="type"
				@set-type="setType"
			></wl-z-object-key-value-set>
		</template>

		<!-- Renderer examples dialog -->
		<cdx-dialog
			:open="showExamplesDialog"
			:title="i18n( 'wikilambda-string-renderer-examples-title' ).text()"
			:close-button-label="i18n( 'wikilamda-dialog-close' ).text()"
			:use-close-button="true"
			@update:open="showExamplesDialog = false"
		>
			<ul class="ext-wikilambda-app-object-string-renderer__examples">
				<li v-for="example in renderedExamples" :key="example.testZid">
					{{ example.result }}
				</li>
			</ul>
			<template #footer>
				<a
					:href="rendererUrl"
					target="_blank"
					:lang="rendererLabel.langCode"
					:dir="rendererLabel.langDir"
				>{{ rendererLabel.label }}</a>
			</template>
		</cdx-dialog>
	</div>
</template>

<script>
const { computed, defineComponent, inject, onBeforeUnmount, onMounted, ref, watch } = require( 'vue' );

const Constants = require( '../../Constants.js' );
const useError = require( '../../composables/useError.js' );
const useZObject = require( '../../composables/useZObject.js' );
const { canonicalToHybrid, hybridToCanonical } = require( '../../utils/schemata.js' );
const urlUtils = require( '../../utils/urlUtils.js' );
const useMainStore = require( '../../store/index.js' );

// Base components:
const SafeMessage = require( '../base/SafeMessage.vue' );
// Type components:
const ZObjectKeyValueSet = require( './ZObjectKeyValueSet.vue' );
// Codex components:
const { CdxButton, CdxDialog, CdxMessage, CdxTextInput } = require( '../../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'wl-z-object-string-renderer',
	components: {
		'cdx-dialog': CdxDialog,
		'cdx-button': CdxButton,
		'cdx-message': CdxMessage,
		'cdx-text-input': CdxTextInput,
		'wl-safe-message': SafeMessage,
		'wl-z-object-key-value-set': ZObjectKeyValueSet
	},
	props: {
		keyPath: {
			type: String,
			required: true
		},
		objectValue: {
			type: [ Object, Array ],
			required: true
		},
		edit: {
			type: Boolean,
			required: true
		},
		type: {
			type: String,
			required: true
		},
		expanded: {
			type: Boolean,
			required: true
		}
	},
	emits: [ 'expand', 'set-type', 'set-value' ],
	setup( props, { emit } ) {
		const i18n = inject( 'i18n' );
		const { getZObjectType } = useZObject( { keyPath: props.keyPath } );
		const { hasFieldErrors, fieldErrors, clearFieldErrors } = useError( { keyPath: props.keyPath } );
		const store = useMainStore();

		const blankObject = ref( undefined );
		const renderValueInitialized = ref( false );
		const renderTestsInitialized = ref( false );
		const renderedValue = ref( '' );
		const rendererRunning = ref( false );
		const showExamplesDialog = ref( false );
		const showExamplesLink = ref( false );
		const showErrorFooter = ref( false );
		const pendingPromises = [];
		let parserAbortController = null;

		// Computed properties
		/**
		 * Return the stored type object
		 *
		 * @return {Object}
		 */
		const typeObject = computed( () => store.getStoredObject( props.type ) );

		/**
		 * Return renderer function Zid
		 *
		 * @return {string}
		 */
		const rendererZid = computed( () => store.getRendererZid( props.type ) );

		/**
		 * Return renderer LabelData
		 *
		 * @return {LabelData}
		 */
		const rendererLabel = computed( () => store.getLabelData( rendererZid.value ) );

		/**
		 * Return the url for the renderer wiki page
		 *
		 * @return {string}
		 */
		const rendererUrl = computed( () => urlUtils.generateViewUrl( {
			langCode: store.getUserLangCode,
			zid: rendererZid.value
		} ) );

		/**
		 * Return parser function Zid
		 *
		 * @return {string}
		 */
		const parserZid = computed( () => store.getParserZid( props.type ) );

		/**
		 * Returns the rendered examples in case the renderer
		 * tests were run.
		 *
		 * @return {Array}
		 */
		const renderedExamples = computed( () => store.getRendererExamples( rendererZid.value ) );

		/**
		 * Return a dynamically generated placeholder for the renderer field
		 * using the available tests for the renderer function. If none are
		 * available, returns the fallback placeholder message.
		 *
		 * When the renderer is running, show the Renderer running message.
		 *
		 * @return {string}
		 */
		const placeholderValue = computed( () => {
			if ( renderedExamples.value.length > 0 ) {
				const example = renderedExamples.value[ 0 ].result;
				return i18n( 'wikilambda-string-renderer-field-example', example ).text();
			}
			return '';
		} );

		/**
		 * Filters the passing test zids array and returns an array with the
		 * test objects for those which are wellformed. We consider wellformed
		 * tests those which have a call to the renderer function on the first
		 * level, directly under the Test call key/Z20K1.
		 *
		 * @return {Array}
		 */
		const validRendererTests = computed( () => {
			if ( !renderTestsInitialized.value ) {
				return [];
			}
			return store.getValidRendererTests( rendererZid.value );
		} );

		/**
		 * Returns the string to show when rendered value fails, which will
		 * be epty string on edit mode, and "No display value" on view
		 *
		 * @return {string}
		 */
		const noRenderedValue = computed( () => props.edit ? '' : i18n( 'wikilambda-renderer-view-invalid-result' ).text() );

		// Methods
		/**
		 * Sets the given error message for current errorId
		 *
		 * @param {Object} payload
		 * @param {string} payload.errorMessage - raw error message, unsafe for HTML rendering
		 * @param {string} payload.errorMessageKey - i18n message, safe for HTML rendering
		 * @param {Array} payload.errorParams - i18n message parameters (if any)
		 */
		function setFieldError( payload ) {
			const errorData = Object.assign( {
				errorId: props.keyPath,
				errorType: Constants.ERROR_TYPES.ERROR
			}, payload );

			store.setError( errorData );
		}

		/**
		 * Clears renderer field errors
		 */
		function clearRendererError() {
			showExamplesLink.value = false;
			showErrorFooter.value = false;
			rendererRunning.value = false;
			clearFieldErrors();
		}

		/**
		 * Create the model for a blank object of this type and store it locally.
		 * This initialization will only be run once, and only when we know for
		 * sure that the typeObject is available.
		 * The blank object is in canonical form, but it must be transformed into
		 * hybrid form before setting it up in the store zobject.
		 */
		function initializeBlankObject() {
			blankObject.value = hybridToCanonical( store.createObjectByType( { type: props.type } ) );
		}

		/**
		 * If the object type is changed, surface the event so that
		 * the ZObjectKeyValue parent component makes the type change.
		 *
		 * @param {Object} payload
		 */
		function setType( payload ) {
			emit( 'set-type', payload );
		}

		/**
		 * Update the local renderedValue variable with the new
		 * value and trigger the function call to generate the new
		 * parsed object and set its keys in the global store.
		 *
		 * @param {Object} event
		 */
		function setRenderedValue( event ) {
			renderedValue.value = event.target.value;
			generateParsedValue();
		}
		/**
		 * Trigger the call to the Renderer function for this type
		 * passing the current object values, and set the returned string
		 * in the local renderedValue variable.
		 */
		function generateRenderedValue() {
			// If we are in view mode, only initialize rendered value once.
			// Only when the rendered value is generated successfully we will
			// mark it as initialized.
			if ( !props.edit && renderValueInitialized.value ) {
				return;
			}

			// If we are in edit mode, only generate rendered value if the object is not
			// blank. For this we need to wait till the typeObject has been fetched.
			if ( props.edit && !typeObject.value ) {
				return;
			}

			// If typeObject is available, initialize the model blank object.
			if ( typeObject.value && !blankObject.value ) {
				initializeBlankObject();
			}

			const zobject = hybridToCanonical( props.objectValue );

			// If zobject is blank, exit renderer.
			if ( JSON.stringify( zobject ) === JSON.stringify( blankObject.value ) ) {
				return;
			}
			rendererRunning.value = true;
			renderedValue.value = i18n( 'wikilambda-string-renderer-running' ).text();

			store.runRenderer( {
				rendererZid: rendererZid.value,
				zobject,
				zlang: store.getUserLangZid
			} ).then( ( data ) => {
				clearRendererError();
				const response = data.response[ Constants.Z_RESPONSEENVELOPE_VALUE ];
				if ( response === Constants.Z_VOID ) {
					// Renderer returned void:
					// get error from metadata object and show examples link
					renderedValue.value = noRenderedValue.value;
					showExamplesLink.value = renderedExamples.value.length > 0;

					const metadata = data.response[ Constants.Z_RESPONSEENVELOPE_METADATA ];
					const fallbackErrorData = {
						errorMessageKey: 'wikilambda-renderer-unknown-error',
						errorParams: [ rendererZid.value ]
					};

					store.handleMetadataError( {
						metadata,
						fallbackErrorData,
						errorHandler: setFieldError
					} );

				} else if ( getZObjectType( response ) !== Constants.Z_STRING ) {
					// Renderer returned unexpected type:
					// show unexpected result error and project chat footer
					renderedValue.value = noRenderedValue.value;
					showErrorFooter.value = true;
					setFieldError( {
						errorMessageKey: 'wikilambda-renderer-unexpected-result-error',
						errorParams: [ rendererZid.value ]
					} );
				} else {
					// Success: Update the locally saved renderedValue with the response
					renderedValue.value = response;
					renderValueInitialized.value = true;
				}
			} ).catch( () => {
				renderedValue.value = noRenderedValue.value;
				clearRendererError();
				setFieldError( { errorMessageKey: 'wikilambda-renderer-api-error' } );
			} );
		}
		/**
		 * Trigger the call to the Parser function for this type
		 * passing the current rendererValue, and set the returned object
		 * in the global store.
		 */
		function generateParsedValue() {
			// Cancel previous parser request if any
			if ( parserAbortController ) {
				parserAbortController.abort();
			}
			parserAbortController = new AbortController();

			store.runParser( {
				parserZid: parserZid.value,
				zobject: renderedValue.value,
				zlang: store.getUserLangZid,
				wait: true,
				signal: parserAbortController.signal
			} ).then( ( data ) => {
				clearRendererError();
				const response = data.response[ Constants.Z_RESPONSEENVELOPE_VALUE ];
				if ( response === Constants.Z_VOID ) {
					// Parser returned void:
					// * Resolve parser promise
					// * get error from metadata object and show examples link
					data.resolver.resolve();
					clearParsedValue();
					showExamplesLink.value = renderedExamples.value.length > 0;

					const metadata = data.response[ Constants.Z_RESPONSEENVELOPE_METADATA ];
					const fallbackErrorData = {
						errorMessageKey: 'wikilambda-parser-unknown-error',
						errorParams: [ parserZid.value ]
					};

					store.handleMetadataError( {
						metadata,
						fallbackErrorData,
						errorHandler: setFieldError
					} );

				} else if ( getZObjectType( response ) !== props.type ) {
					// Parser return unexpected type:
					// * Resolve parser promise
					// * show unexpected result error and project chat footer
					data.resolver.resolve();
					clearParsedValue();
					showErrorFooter.value = true;
					setFieldError( {
						errorMessageKey: 'wikilambda-parser-unexpected-result-error',
						errorParams: [ parserZid.value ]
					} );
				} else {
					// Success:
					// Parent component (ZObjectKeyValue) should:
					// * Set the value of the returned ZObject
					// * Resolve parser promise once the changes are persisted
					pendingPromises.push( data.resolver );
					emit( 'set-value', {
						keyPath: [],
						value: canonicalToHybrid( response ),
						callback: () => data.resolver.resolve()
					} );
				}
			} ).catch( ( error ) => {
				// If the parser request was aborted, do not set an error
				if ( error.code === 'abort' ) {
					return;
				}
				clearRendererError();
				setFieldError( { errorMessageKey: 'wikilambda-renderer-api-error' } );
			} );
		}

		/**
		 * Resets the parsed key-values to a blank state.
		 */
		function clearParsedValue() {
			emit( 'set-value', {
				keyPath: [],
				value: canonicalToHybrid( blankObject.value )
			} );
		}

		/**
		 * Runs the test results for the renderer function. This
		 * call must be treated asynchronously, so all the results
		 * will be gathered as reactive computed properties.
		 */
		function generateRendererExamples() {
			if ( props.edit ) {
				store.getTestResults( {
					zFunctionId: rendererZid.value
				} ).then( () => {
					// At this point store.getPassingTestZids is already returning the existing tests.
				// If none exist and we are creating a new object, expand to key-value set
					const isNewOrEvaluator = store.isCreateNewPage ||
					store.getCurrentView === Constants.VIEWS.FUNCTION_EVALUATOR;
					const hasNoPassingTests = store.getPassingTestZids( rendererZid.value ).length === 0;
					const setExpanded = isNewOrEvaluator && hasNoPassingTests;
					emit( 'expand', setExpanded );
					renderTestsInitialized.value = true;
				} );
			} else {
				// For view mode we don't need to initialize the renderer examples
				emit( 'expand', false );
				renderTestsInitialized.value = true;
			}
		}

		/**
		 * Opens the dialog with the renderer examples, if any.
		 */
		function openExamplesDialog() {
			showExamplesDialog.value = true;
		}

		/**
		 * Watch the prop expanded. When the field is collapsed
		 * generate the rendered value. When the field is expanded
		 * we clear the renderer errors.
		 */
		watch( () => props.expanded, ( value ) => {
			if ( value === false ) {
				generateRenderedValue();
			} else {
				if ( props.edit ) {
					clearRendererError();
				}
			}
		} );

		/**
		 * Watch the computed property validRendererTests and whenever those
		 * are updated, run the renderer function test with the user language
		 * as second input.
		 */
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

		/**
		 * Watch the typeObject and whenever it's updated, generate the
		 * rendered value, in case the initial generateRenderedValue call
		 * is called before the type object has been fetched.
		 */
		watch( typeObject, () => {
			generateRenderedValue();
		} );

		// Lifecycle
		onMounted( () => {
			generateRenderedValue();
			generateRendererExamples();
		} );

		onBeforeUnmount( () => {
			// In the case of an abrupt unmount, resolve all pending promises
			pendingPromises.forEach( ( resolver ) => {
				resolver.resolve();
			} );
			if ( parserAbortController ) {
				parserAbortController.abort();
			}
		} );

		return {
			fieldErrors,
			hasFieldErrors,
			openExamplesDialog,
			placeholderValue,
			renderedExamples,
			renderedValue,
			rendererLabel,
			rendererRunning,
			rendererUrl,
			setRenderedValue,
			setType,
			showErrorFooter,
			showExamplesDialog,
			showExamplesLink,
			i18n
		};
	}
} );
</script>

<style lang="less">
@import '../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-object-string-renderer {
	.ext-wikilambda-app-object-string-renderer__text {
		margin: 0;
		line-height: @spacing-200;
	}

	.ext-wikilambda-app-object-string-renderer__rendering {
		color: @color-placeholder;
	}

	.ext-wikilambda-app-object-string-renderer__error {
		margin-top: @spacing-25;
	}

	.ext-wikilambda-app-object-string-renderer__error-footer {
		margin: 0;
		color: @color-subtle;
	}
}
</style>
