<!--
	WikiLambda Vue component for evaluation of ZFunction objects.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<wl-widget-base class="ext-wikilambda-function-evaluator" data-testid="function-evaluator">
		<template #header>
			{{ title }}
		</template>

		<template #main>
			<!-- Logged out user warning -->
			<cdx-message
				v-if="userCanRunFunction === false"
				type="warning"
				class="ext-wikilambda-function-evaluator-message"
			>
				{{ $i18n( 'wikilambda-function-evaluation-restriction-warning' ).text() }}
			</cdx-message>
			<!-- Not-runnable user warning -->
			<cdx-message
				v-if="!hasImplementations && selectedFunctionExists"
				type="notice"
				class="ext-wikilambda-function-evaluator-message"
				data-testid="function-evaluator-message"

			>
				{{ $i18n( 'wikilambda-function-evaluation-restriction-notrunnable' ).text() }}
			</cdx-message>
			<!-- Function Call -->
			<div
				v-if="showFunctionSelector"
				class="ext-wikilambda-function-evaluator-call"
				data-testid="function-evaluator-call"
			>
				<div class="ext-wikilambda-key-block">
					<label
						:lang="functionCallLabelData.langCode"
						:dir="functionCallLabelData.langDir"
					>{{ functionCallLabelData.label }}</label>
				</div>
				<wl-z-reference
					:row-id="selectedFunctionRowId"
					:edit="true"
					:expected-type="functionType"
					@set-value="setFunctionZid"
				></wl-z-reference>
			</div>

			<!-- Loader for inputs + button -->
			<div
				v-if="!selectedFunctionExists && !showFunctionSelector"
				class="ext-wikilambda-function-evaluator-loader"
				data-testid="function-evaluator-loader">
				{{ $i18n( 'wikilambda-loading' ).text() }}
			</div>
			<div v-else>
				<!-- Function Inputs -->
				<div
					v-if="hasInputs"
					class="ext-wikilambda-function-evaluator-inputs"
					data-testid="function-evaluator-inputs"
				>
					<div class="ext-wikilambda-key-block">
						<label>{{ $i18n( 'wikilambda-function-evaluator-enter-inputs' ).text() }}</label>
					</div>
					<wl-z-object-key-value
						v-for="inputRowId in inputRowIds"
						:key="'input-row-id-' + inputRowId"
						:row-id="inputRowId"
						:edit="true"
					></wl-z-object-key-value>
				</div>

				<!-- Run Function button -->
				<div class="ext-wikilambda-function-evaluator-run-button">
					<cdx-button
						action="progressive"
						weight="primary"
						:disabled="!canRunFunction"
						data-testid="evaluator-run-button"
						@click="waitAndCallFunction"
					>
						{{ $i18n( 'wikilambda-function-evaluator-run-function' ).text() }}
					</cdx-button>
				</div>
			</div>

			<!-- Evaluation Result -->
			<div
				v-if="hasResult || running"
				class="ext-wikilambda-function-evaluator-result-block"
				data-testid="function-evaluator-result"
			>
				<div class="ext-wikilambda-function-evaluator-result">
					<div class="ext-wikilambda-key-block">
						<label>{{ $i18n( 'wikilambda-function-evaluator-result' ).text() }}</label>
					</div>
					<div v-if="running" data-testid="function-evaluator-running">
						{{ $i18n( 'wikilambda-function-evaluator-running' ).text() }}
					</div>
					<template v-else>
						<div v-if="apiErrors.length > 0">
							{{ getErrorMessage( apiErrors[ 0 ] ) }}
						</div>
						<wl-z-object-key-value
							v-else
							:row-id="resultRowId"
							:skip-indent="true"
							:edit="false"
						></wl-z-object-key-value>
					</template>
				</div>
			</div>
		</template>
	</wl-widget-base>
</template>

<script>
const { defineComponent } = require( 'vue' );
const Constants = require( '../../Constants.js' ),
	CdxButton = require( '@wikimedia/codex' ).CdxButton,
	CdxMessage = require( '@wikimedia/codex' ).CdxMessage,
	WidgetBase = require( '../base/WidgetBase.vue' ),
	ZReference = require( '../default-view-types/ZReference.vue' ),
	ZObjectKeyValue = require( '../default-view-types/ZObjectKeyValue.vue' ),
	eventLogUtils = require( '../../mixins/eventLogUtils.js' ),
	errorUtils = require( '../../mixins/errorUtils.js' ),
	mapActions = require( 'vuex' ).mapActions,
	mapGetters = require( 'vuex' ).mapGetters;

module.exports = exports = defineComponent( {
	name: 'wl-function-evaluator-widget',
	components: {
		'cdx-button': CdxButton,
		'cdx-message': CdxMessage,
		'wl-widget-base': WidgetBase,
		'wl-z-reference': ZReference,
		'wl-z-object-key-value': ZObjectKeyValue
	},
	mixins: [ eventLogUtils, errorUtils ],
	props: {
		functionZid: {
			type: String,
			required: false,
			default: undefined
		},
		forImplementation: {
			type: Boolean,
			required: false,
			default: false
		},
		contentRowId: {
			type: Number,
			required: false,
			default: undefined
		}
	},
	data: function () {
		return {
			functionCallRowId: '',
			resultRowId: '',
			running: false,
			hasResult: false,
			functionType: Constants.Z_FUNCTION
		};
	},
	computed: Object.assign( mapGetters( [
		'getErrors',
		'getConnectedObjects',
		'getZFunctionCallArguments',
		'getLabelData',
		'getRowByKeyPath',
		'getStoredObject',
		'getZFunctionCallFunctionId',
		'getZObjectAsJsonById',
		'getCurrentZObjectId',
		'getCurrentZObjectType',
		'getUserLangZid',
		'getMapValueByKey',
		'userCanRunFunction',
		'userCanRunUnsavedCode',
		'waitForRunningParsers'
	] ), {
		/**
		 * Whether the widget has a pre-defined function
		 *
		 * @return {boolean}
		 */
		showFunctionSelector: function () {
			return !this.forFunction && !this.forImplementation;
		},

		/**
		 * Whether the widget has a pre-defined function
		 *
		 * @return {boolean}
		 */
		forFunction: function () {
			return !!this.functionZid;
		},

		/**
		 * Returns the selected function in the function call component
		 *
		 * @return {string | undefined}
		 */
		selectedFunctionZid: function () {
			return this.getZFunctionCallFunctionId( this.functionCallRowId );
		},

		/**
		 * Returns the stored function object for the selected function Zid
		 *
		 * @return {Object}
		 */
		selectedFunctionObject: function () {
			return this.getStoredObject( this.selectedFunctionZid );
		},

		/**
		 * Returns whether the function exists and has been fetched
		 *
		 * @return {boolean}
		 */
		selectedFunctionExists: function () {
			return Boolean( this.selectedFunctionObject );
		},

		/**
		 * Returns the selected function in the function call component
		 *
		 * @return {string | undefined}
		 */
		selectedFunctionRowId: function () {
			const row = this.getRowByKeyPath( [ Constants.Z_FUNCTION_CALL_FUNCTION ], this.functionCallRowId );
			return row ? row.id : undefined;
		},

		/**
		 * Returns whether there are any inputs to enter
		 *
		 * @return {boolean}
		 */
		hasInputs: function () {
			return this.inputRowIds.length > 0;
		},

		/**
		 * Returns the rowIds of the inputs of a function call
		 *
		 * @return {Array}
		 */
		inputRowIds: function () {
			return this.getZFunctionCallArguments( this.functionCallRowId )
				.map( ( row ) => row.id );
		},

		/**
		 * Returns the rowId of the Response Envelope Metadata/Z22K2
		 *
		 * @return {string|undefined}
		 */
		metadataRowId: function () {
			if ( this.resultRowId === '' ) {
				return undefined;
			}
			const row = this.getRowByKeyPath( [ Constants.Z_RESPONSEENVELOPE_METADATA ], this.resultRowId );
			return row ? row.id : undefined;
		},

		/**
		 * Returns the rowId of the Metadata object with key 'errors'
		 *
		 * @return {string|undefined}
		 */
		errorRowId: function () {
			if ( !this.metadataRowId ) {
				return undefined;
			}
			const row = this.getMapValueByKey( this.metadataRowId, 'errors' );
			return row ? row.id : undefined;
		},

		/**
		 * Returns whether there's an error key in the metadata of the ZEvaluationResult given by this.resultRowId
		 *
		 * @return {boolean}
		 */
		resultHasError: function () {
			return this.errorRowId !== undefined;
		},

		/**
		 * Returns the API error returned by the orchestrator
		 *
		 * @return {Object}
		 */
		apiErrors: function () {
			return this.resultRowId ? this.getErrors( this.resultRowId ) : [];
		},

		/**
		 * Returns the array of implementation IDs for the selected function
		 *
		 * @return {Array}
		 */
		implementations: function () {
			return this.selectedFunctionZid ?
				this.getConnectedObjects( this.selectedFunctionZid, Constants.Z_FUNCTION_IMPLEMENTATIONS ) :
				[];
		},

		/**
		 * Returns whether the selected Function has any implementations
		 * and hence it can be run.
		 *
		 * @return {boolean}
		 */
		hasImplementations: function () {
			return this.implementations.length > 0;
		},

		/**
		 * Returns whether the function can be run, which can only happen
		 * if the function has active implementations and the user is logged in.
		 *
		 * @return {boolean}
		 */
		canRunFunction: function () {
			return this.hasImplementations && this.userCanRunFunction;
		},

		/**
		 * Returns the human readable label for the function selector block
		 *
		 * @return {LabelData}
		 */
		functionCallLabelData: function () {
			return this.getLabelData( Constants.Z_FUNCTION_CALL_FUNCTION );
		},

		/**
		 * Returns the human readable label for the function call inputs block
		 *
		 * @return {string}
		 */
		title: function () {
			return this.forImplementation ?
				this.$i18n( 'wikilambda-function-evaluator-title-implementation' ).text() :
				this.forFunction ?
					this.$i18n( 'wikilambda-function-evaluator-title-function' ).text() :
					this.$i18n( 'wikilambda-function-evaluator-title' ).text();
		}
	} ),
	methods: Object.assign( mapActions( [
		'clearErrors',
		'initializeResultId',
		'changeType',
		'fetchZids',
		'callZFunction',
		'setValueByRowIdAndPath',
		'setZFunctionCallArguments'
	] ), {

		/**
		 * @param {Object} payload
		 * @param {Object} payload.keyPath sequence of keys till the value to edit
		 * @param {Object | Array | string} payload.value new value
		 */
		setFunctionZid: function ( payload ) {
			// We set the arguments
			this.setZFunctionCallArguments( {
				parentId: this.functionCallRowId,
				functionZid: payload.value
			} );
			// And we set the value of the function
			this.setValueByRowIdAndPath( {
				rowId: this.selectedFunctionRowId,
				keyPath: payload.keyPath ? payload.keyPath : [],
				value: payload.value
			} );
		},

		/**
		 * Clears the orchestration result object
		 */
		clearResult: function () {
			this.hasResult = false;
			this.running = false;
			this.initializeResultId( this.resultRowId );
		},

		/**
		 * Waits for running parsers to return and persist
		 * changes before going ahead and running the function call
		 */
		waitAndCallFunction: function () {
			this.waitForRunningParsers.then( () => this.callFunction() );
		},

		/**
		 * Performs the function call
		 */
		callFunction: function () {
			const functionCallJson = this.getZObjectAsJsonById( this.functionCallRowId );
			// If we are in an implementation page, we build raw function call with raw implementation:
			// 1. Replace Z7K1 with the whole Z8 object: we assume it's in the store
			// 2. Replace te Z8K4 with [ Z14, implementation ]
			if ( this.forImplementation ) {
				const storedFunction = this.getStoredObject( this.functionZid );
				// If user can run unsaved code, we get the raw implementation,
				// else, we use the current persisted version by using its Zid
				const implementation = this.userCanRunUnsavedCode ?
					this.getZObjectAsJsonById( this.contentRowId ) :
					this.getCurrentZObjectId;
				if ( storedFunction && implementation ) {
					const functionObject = storedFunction[ Constants.Z_PERSISTENTOBJECT_VALUE ];
					functionObject[ Constants.Z_FUNCTION_IMPLEMENTATIONS ] = [
						Constants.Z_IMPLEMENTATION,
						implementation
					];
					functionCallJson[ Constants.Z_FUNCTION_CALL_FUNCTION ] = functionObject;
				}
			}

			this.running = true;
			this.initializeResultId( this.resultRowId )
				.then( ( rowId ) => {
					this.resultRowId = rowId;
					this.clearErrors( rowId );
					return this.callZFunction( {
						functionCall: functionCallJson,
						resultRowId: this.resultRowId
					} );
				} )
				.then( () => {
					this.running = false;
					this.hasResult = true;
					// Log an event using Metrics Platform
					const customData = {
						selectedfunctionzid: this.selectedFunctionZid || null,
						zobjectid: this.getCurrentZObjectId || null,
						zobjecttype: this.getCurrentZObjectType || null,
						resulthaserror: this.resultHasError,
						zlang: this.getUserLangZid || null
					};
					this.dispatchEvent( 'wf.ui.callFunction', customData );
					// T350497 Update the WikiLambda instrumentation to use core interaction events
					const interactionData = {
						zobjecttype: this.getCurrentZObjectType || null,
						zobjectid: this.getCurrentZObjectId || null,
						zlang: this.getUserLangZid || null,
						selectedfunctionzid: this.selectedFunctionZid || null,
						haserrors: this.resultHasError
					};
					this.submitInteraction( 'call', interactionData );
				} );
		},

		/**
		 * Initializes the detached objects in the zobject table
		 * that will contain:
		 * 1. The function call object, and
		 * 2. The evaluator result object returned from the call
		 *
		 * @param {string|undefined} initialFunctionZid
		 */
		initializeDetachedObjects: function ( initialFunctionZid ) {
			let functionCallRowId, resultRowId;
			// Initialize detached object for the function call
			this.initializeResultId( this.functionCallRowId ).then( ( rowId ) => {
				functionCallRowId = rowId;
				// Set the Function Call scaffolding
				return this.changeType( {
					type: Constants.Z_FUNCTION_CALL,
					id: rowId,
					value: initialFunctionZid || ''
				} ).then( () => {
					// If we are initializing the evaluator with an initialFunctionZid
					// we fetch the function data and then we set the arguments
					if ( initialFunctionZid ) {
						this.fetchZids( { zids: [ initialFunctionZid ] } ).then( () => {
							this.setZFunctionCallArguments( {
								parentId: rowId,
								functionZid: initialFunctionZid
							} );
						} );
					}
				} );
			} ).then(
				// Initialize detached object for the result
				() => this.initializeResultId( this.resultRowId ).then( ( rowId ) => {
					resultRowId = rowId;
				} )
			).finally(
				// Set both detached rowIds to render the components
				() => {
					this.functionCallRowId = functionCallRowId;
					this.resultRowId = resultRowId;
				}
			);
		}
	} ),
	watch: {
		selectedFunctionZid: function () {
			this.clearResult();
		}
	},
	mounted: function () {
		this.initializeDetachedObjects( this.functionZid );
	}
} );
</script>

<style lang="less">
@import '../../ext.wikilambda.app.variables.less';

.ext-wikilambda-function-evaluator {
	.ext-wikilambda-function-evaluator-loader {
		font-weight: @font-weight-normal;
		color: @color-placeholder;
		white-space: pre-wrap;
	}

	.ext-wikilambda-function-evaluator-message {
		margin-bottom: @spacing-125;
	}

	.ext-wikilambda-function-evaluator-inputs,
	.ext-wikilambda-function-evaluator-call {
		margin-bottom: @spacing-125;

		> .ext-wikilambda-key-block {
			margin-bottom: @spacing-25;

			label {
				font-weight: bold;
				color: @color-base;
			}
		}
	}

	.ext-wikilambda-function-evaluator-result-block {
		margin: 0 -@spacing-75 -@spacing-75;

		.ext-wikilambda-function-evaluator-result {
			margin-top: @spacing-75;
			padding: @spacing-75;
			background-color: @background-color-progressive-subtle;

			> .ext-wikilambda-key-block {
				margin-bottom: @spacing-25;

				label {
					font-weight: bold;
					color: @color-base;
				}
			}

			> .ext-wikilambda-key-value-row {
				> .ext-wikilambda-key-value {
					margin-bottom: 0;
				}
			}
		}
	}
}
</style>
