<!--
	WikiLambda Vue component for a ZObject with a string renderer.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-app-object-string-renderer" data-testid="z-object-string-renderer">
		<!-- If expanded is false, show text field -->
		<template v-if="!expanded || !initialized">
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
					<!-- eslint-disable vue/no-v-html -->
					<span v-html="getErrorMessage( fieldErrors[0] )"></span>
				</cdx-message>
				<a v-if="showExamplesLink" @click="openExamplesDialog">
					{{ $i18n( 'wikilambda-string-renderer-examples-title' ).text() }}
				</a>
				<!-- eslint-disable vue/no-v-html -->
				<p
					v-if="showErrorFooter"
					class="ext-wikilambda-app-object-string-renderer__error-footer"
					v-html="$i18n( 'wikilambda-renderer-error-footer-project-chat' ).parse()"
				></p>
			</div>
		</template>

		<!-- If expanded is true, show key-value set -->
		<template v-else>
			<wl-z-object-key-value-set
				:row-id="rowId"
				:edit="edit"
				:depth="depth"
				@set-type="setType"
			></wl-z-object-key-value-set>
		</template>

		<!-- Renderer examples dialog -->
		<cdx-dialog
			:open="showExamplesDialog"
			:title="$i18n( 'wikilambda-string-renderer-examples-title' ).text()"
			:close-button-label="$i18n( 'wikilamda-dialog-close' ).text()"
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
const { CdxDialog, CdxMessage, CdxTextInput } = require( '../../../codex.js' );
const { defineComponent } = require( 'vue' );
const { mapActions, mapState } = require( 'pinia' );

const Constants = require( '../../Constants.js' );
const errorMixin = require( '../../mixins/errorMixin.js' );
const typeMixin = require( '../../mixins/typeMixin.js' );
const { getValueFromCanonicalZMap, hybridToCanonical } = require( '../../utils/schemata.js' );
const urlUtils = require( '../../utils/urlUtils.js' );
const useMainStore = require( '../../store/index.js' );
const ZObjectKeyValueSet = require( './ZObjectKeyValueSet.vue' );

module.exports = exports = defineComponent( {
	name: 'wl-z-object-string-renderer',
	components: {
		'cdx-dialog': CdxDialog,
		'cdx-message': CdxMessage,
		'cdx-text-input': CdxTextInput,
		'wl-z-object-key-value-set': ZObjectKeyValueSet
	},
	mixins: [ typeMixin, errorMixin ],
	props: {
		rowId: {
			type: Number,
			required: false,
			default: 0
		},
		edit: {
			type: Boolean,
			required: true
		},
		depth: {
			type: Number,
			required: true
		},
		type: {
			type: String,
			required: false,
			default: undefined
		},
		expanded: {
			type: Boolean,
			required: true
		}
	},
	data: function () {
		return {
			blankObject: undefined,
			initialized: false,
			renderedValue: '',
			rendererRunning: false,
			showExamplesDialog: false,
			showExamplesLink: false,
			showErrorFooter: false,
			pendingPromises: []
		};
	},
	computed: Object.assign( {}, mapState( useMainStore, [
		'createObjectByType',
		'getCurrentView',
		'getLabelData',
		'getPassingTestZids',
		'getParserZid',
		'getRendererZid',
		'getRendererExamples',
		'getStoredObject',
		'getUserLangCode',
		'getUserLangZid',
		'getZObjectAsJsonById',
		'isCreateNewPage',
		'getValidRendererTests'
	] ), {
		/**
		 * Return the stored type object
		 *
		 * @return {Object}
		 */
		typeObject: function () {
			return this.getStoredObject( this.type );
		},
		/**
		 * Return renderer function Zid
		 *
		 * @return {string}
		 */
		rendererZid: function () {
			return this.getRendererZid( this.type );
		},
		/**
		 * Return renderer LabelData
		 *
		 * @return {LabelData}
		 */
		rendererLabel: function () {
			return this.getLabelData( this.rendererZid );
		},
		/**
		 * Return the url for the renderer wiki page
		 *
		 * @return {string}
		 */
		rendererUrl: function () {
			return urlUtils.generateViewUrl( {
				langCode: this.getUserLangCode,
				zid: this.rendererZid
			} );
		},
		/**
		 * Return parser function Zid
		 *
		 * @return {string}
		 */
		parserZid: function () {
			return this.getParserZid( this.type );
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
		 * Return a dynamically generated placeholder for the renderer field
		 * using the available tests for the renderer function. If none are
		 * available, returns the fallback placeholder message.
		 *
		 * When the renderer is running, show the Renderer running message.
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
			if ( !this.initialized ) {
				return [];
			}
			return this.getValidRendererTests( this.rendererZid );
		}
	} ),
	methods: Object.assign( {}, mapActions( useMainStore, [
		'getTestResults',
		'runRendererTest',
		'runRenderer',
		'runParser',
		'setError'
	] ), {
		/**
		 * If the object type is changed, surface the event so that
		 * the ZObjectKeyValue parent component makes the type change.
		 *
		 * @param {Object} payload
		 */
		setType: function ( payload ) {
			this.$emit( 'set-type', payload );
		},
		/**
		 * Update the local renderedValue variable with the new
		 * value and trigger the function call to generate the new
		 * parsed object and set its keys in the global store.
		 *
		 * @param {Object} event
		 */
		setRenderedValue: function ( event ) {
			this.renderedValue = event.target.value;
			this.generateParsedValue();
		},
		/**
		 * Trigger the call to the Renderer function for this type
		 * passing the current object values, and set the returned string
		 * in the local renderedValue variable.
		 */
		generateRenderedValue: function () {
			// If we are in view mode, only generate rendered value once.
			if ( !this.edit && this.initialized ) {
				return;
			}

			// If we are in edit mode, only generate rendered value if the object is not
			// blank. For this we need to wait till the typeObject has been fetched.
			if ( this.edit && !this.typeObject ) {
				return;
			}

			// If typeObject is available, initialize the model blank object.
			if ( this.typeObject && !this.blankObject ) {
				this.initializeBlankObject();
			}

			const zobject = hybridToCanonical( this.getZObjectAsJsonById( this.rowId ) );

			// If zobject is blank, exit renderer.
			if ( JSON.stringify( zobject ) === JSON.stringify( this.blankObject ) ) {
				return;
			}
			this.rendererRunning = true;
			this.renderedValue = this.$i18n( 'wikilambda-string-renderer-running' ).text();

			this.runRenderer( {
				rendererZid: this.rendererZid,
				zobject,
				zlang: this.getUserLangZid
			} ).then( ( data ) => {
				this.clearRendererError();
				const response = data.response[ Constants.Z_RESPONSEENVELOPE_VALUE ];
				if ( response === Constants.Z_VOID ) {
					// Renderer returned void:
					// get error from metadata object and show examples link
					this.renderedValue = this.edit ? '' :
						this.$i18n( 'wikilambda-renderer-view-invalid-result' ).text();
					this.showExamplesLink = ( this.renderedExamples.length > 0 );
					const metadata = data.response[ Constants.Z_RESPONSEENVELOPE_METADATA ];
					const errorMessage = this.extractErrorMessage( metadata );
					this.setRendererError( errorMessage || this.$i18n( 'wikilambda-renderer-unknown-error',
						this.rendererZid ).parse() );
				} else if ( this.getZObjectType( response ) !== Constants.Z_STRING ) {
					// Renderer returned unexpected type:
					// show unexpected result error and project chat footer
					this.renderedValue = this.edit ? '' :
						this.i18n( 'wikilambda-renderer-view-invalid-result' ).text();
					this.showErrorFooter = true;
					this.setRendererError( this.$i18n( 'wikilambda-renderer-unexpected-result-error',
						this.rendererZid ).parse() );
				} else {
					// Success: Update the locally saved renderedValue with the response
					this.renderedValue = response;
				}
			} ).catch( () => {
				this.clearRendererError();
				this.setRendererError( this.$i18n( 'wikilambda-renderer-api-error' ).text() );
			} );
		},
		/**
		 * Trigger the call to the Parser function for this type
		 * passing the current rendererValue, and set the returned object
		 * in the global store.
		 */
		generateParsedValue: function () {
			this.runParser( {
				parserZid: this.parserZid,
				zobject: this.renderedValue,
				zlang: this.getUserLangZid,
				wait: true
			} ).then( ( data ) => {
				this.clearRendererError();
				const response = data.response[ Constants.Z_RESPONSEENVELOPE_VALUE ];
				if ( response === Constants.Z_VOID ) {
					// Parser returned void:
					// * Resolve parser promise
					// * get error from metadata object and show examples link
					data.resolver.resolve();
					this.clearParsedValue();
					const metadata = data.response[ Constants.Z_RESPONSEENVELOPE_METADATA ];
					const errorMessage = this.extractErrorMessage( metadata );
					this.showExamplesLink = ( this.renderedExamples.length > 0 );
					this.setRendererError( errorMessage || this.$i18n( 'wikilambda-parser-unknown-error',
						this.parserZid ).parse() );
				} else if ( this.getZObjectType( response ) !== this.type ) {
					// Parser return unexpected type:
					// * Resolve parser promise
					// * show unexpected result error and project chat footer
					data.resolver.resolve();
					this.clearParsedValue();
					this.showErrorFooter = true;
					this.setRendererError( this.$i18n( 'wikilambda-parser-unexpected-result-error',
						this.parserZid ).parse() );
				} else {
					// Success:
					// Parent component (ZObjectKeyValue) should:
					// * Set the value of the returned ZObject
					// * Resolve parser promise once the changes are persisted
					this.pendingPromises.push( data.resolver );
					this.$emit( 'set-value', {
						keyPath: [],
						value: response,
						callback: () => data.resolver.resolve()
					} );
				}
			} ).catch( () => {
				this.clearRendererError();
				this.setRendererError( this.$i18n( 'wikilambda-renderer-api-error' ).text() );
			} );
		},
		/**
		 * Resets the parsed key-values to a blank state.
		 * To do this, it emits a setType event with the current type
		 * which will make the parent ZObjectKeyValue component run
		 * the changeType action.
		 */
		clearParsedValue: function () {
			this.$emit( 'set-value', {
				keyPath: [],
				value: this.blankObject
			} );
		},
		/**
		 * Saves the given error message for current rowId
		 *
		 * @param {string} errorMessage
		 */
		setRendererError: function ( errorMessage ) {
			this.setError( {
				rowId: this.rowId,
				errorType: Constants.errorTypes.ERROR,
				errorMessage
			} );
		},
		/**
		 * Clears renderer field errors
		 */
		clearRendererError: function () {
			this.showExamplesLink = false;
			this.showErrorFooter = false;
			this.rendererRunning = false;
			this.clearFieldErrors();
		},
		/**
		 * Runs the test results for the renderer function. This
		 * call must be treated asynchronously, so all the results
		 * will be gathered as reactive computed properties.
		 */
		generateRendererExamples: function () {
			if ( this.edit ) {
				this.getTestResults( {
					zFunctionId: this.rendererZid
				} ).then( () => {
					// At this point getPassingTestZids is already returning the existing tests.
					// If none exist and we are creating a new object, expand to key-value set
					const setExpanded = (
						( this.isCreateNewPage || this.getCurrentView === Constants.VIEWS.FUNCTION_EVALUATOR ) &&
						( this.getPassingTestZids( this.rendererZid ).length === 0 )
					);
					this.$emit( 'expand', setExpanded );
					this.initialized = true;
				} );
			} else {
				this.$emit( 'expand', false );
				this.initialized = true;
			}
		},
		/**
		 * Given a metadata object of a failed function call, extracts the value
		 * of the Z500K1 key and, if it contains a message, returns it
		 *
		 * @param {Object} metadata
		 * @return {string}
		 */
		extractErrorMessage: function ( metadata ) {
			const error = getValueFromCanonicalZMap( metadata, 'errors' );
			const errorInfo = error[ Constants.Z_ERROR_VALUE ][ Constants.Z_GENERIC_ERROR_VALUE ];
			return ( ( typeof errorInfo === 'string' ) && ( !!errorInfo ) ) ? errorInfo : undefined;
		},
		/**
		 * Opens the dialog with the renderer examples, if any.
		 */
		openExamplesDialog: function () {
			this.showExamplesDialog = true;
		},
		/**
		 * Create the model for a blank object of this type and store it locally.
		 * This initialization will only be run once, and only when we know for
		 * sure that the typeObject is available.
		 */
		initializeBlankObject: function () {
			this.blankObject = hybridToCanonical( this.createObjectByType( { type: this.type } ) );
		}
	} ),
	watch: {
		/**
		 * Watch the prop expanded. When the field is collapsed
		 * generate the rendered value. When the field is expanded
		 * we clear the renderer errors.
		 *
		 * @param {boolean} value
		 */
		expanded: function ( value ) {
			if ( value === false ) {
				this.generateRenderedValue();
			} else {
				if ( this.edit ) {
					this.clearRendererError();
				}
			}
		},
		/**
		 * Watch the computed property validRendererTests and whenever those
		 * are updated, run the renderer function test with the user language
		 * as second input.
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
		},
		/**
		 * Watch the typeObject and whenever it's updated, generate the
		 * rendered value, in case the initial generateRenderedValue call
		 * is called before the type object has been fetched.
		 */
		typeObject: function () {
			this.generateRenderedValue();
		}
	},
	mounted: function () {
		this.generateRenderedValue();
		this.generateRendererExamples();
	},
	beforeUnmount: function () {
		// In the case of an abrupt unmount, resolve all pending promises
		this.pendingPromises.forEach( ( resolver ) => {
			resolver.resolve();
		} );
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
