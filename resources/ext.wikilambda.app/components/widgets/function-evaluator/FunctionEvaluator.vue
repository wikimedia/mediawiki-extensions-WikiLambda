<!--
	WikiLambda Vue component for evaluation of ZFunction objects.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<wl-widget-base class="ext-wikilambda-app-function-evaluator-widget" data-testid="function-evaluator-widget">
		<template #header>
			{{ title }}
		</template>

		<template #main>
			<!-- Logged out user warning -->
			<cdx-message
				v-if="userCanRunFunction === false"
				type="warning"
				class="ext-wikilambda-app-function-evaluator-widget__message"
			>
				{{ $i18n( 'wikilambda-function-evaluation-restriction-warning' ).text() }}
			</cdx-message>
			<!-- Not-runnable user warning -->
			<cdx-message
				v-if="!hasImplementations && selectedFunctionExists"
				type="notice"
				class="ext-wikilambda-app-function-evaluator-widget__message"
				data-testid="function-evaluator-message"

			>
				{{ $i18n( 'wikilambda-function-evaluation-restriction-notrunnable' ).text() }}
			</cdx-message>
			<!-- Function Call -->
			<div
				v-if="showFunctionSelector"
				class="ext-wikilambda-app-function-evaluator-widget__call"
				data-testid="function-evaluator-call"
			>
				<wl-key-block :key-bold="true">
					<label
						:lang="functionCallLabelData.langCode"
						:dir="functionCallLabelData.langDir"
					>{{ functionCallLabelData.label }}</label>
				</wl-key-block>
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
				class="ext-wikilambda-app-function-evaluator-widget__loader"
				data-testid="function-evaluator-loader">
				{{ $i18n( 'wikilambda-loading' ).text() }}
			</div>
			<div v-else>
				<!-- Function Inputs -->
				<div
					v-if="hasInputs"
					class="ext-wikilambda-app-function-evaluator-widget__inputs"
					data-testid="function-evaluator-inputs"
				>
					<wl-key-block :key-bold="true">
						<label>{{ $i18n( 'wikilambda-function-evaluator-enter-inputs' ).text() }}</label>
					</wl-key-block>
					<wl-z-object-key-value
						v-for="inputRowId in inputRowIds"
						:key="'input-row-id-' + inputRowId"
						:row-id="inputRowId"
						:edit="true"
					></wl-z-object-key-value>
				</div>

				<!-- Run Function button -->
				<div class="ext-wikilambda-app-function-evaluator-widget__run-button">
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
				class="ext-wikilambda-app-function-evaluator-widget__result-block"
				data-testid="function-evaluator-result"
			>
				<div class="ext-wikilambda-app-function-evaluator-widget__result">
					<wl-key-block :key-bold="true">
						<label>{{ $i18n( 'wikilambda-function-evaluator-result' ).text() }}</label>
					</wl-key-block>
					<div v-if="running" data-testid="function-evaluator-running">
						{{ $i18n( 'wikilambda-function-evaluator-running' ).text() }}
					</div>
					<template v-else>
						<div v-if="apiErrors.length > 0">
							{{ getErrorMessage( apiErrors[ 0 ] ) }}
						</div>
						<wl-evaluation-result
							v-else
							:row-id="resultRowId"
						></wl-evaluation-result>
					</template>
				</div>
			</div>
		</template>
	</wl-widget-base>
</template>

<script>
const { defineComponent } = require( 'vue' );
const { mapActions, mapState } = require( 'pinia' );
const { CdxButton, CdxMessage } = require( '../../../../codex.js' );
const Constants = require( '../../../Constants.js' );
const EvaluationResult = require( './EvaluationResult.vue' );
const eventLogMixin = require( '../../../mixins/eventLogMixin.js' );
const errorMixin = require( '../../../mixins/errorMixin.js' );
const KeyBlock = require( '../../base/KeyBlock.vue' );
const useMainStore = require( '../../../store/index.js' );
const WidgetBase = require( '../../base/WidgetBase.vue' );
const ZObjectKeyValue = require( '../../default-view-types/ZObjectKeyValue.vue' );
const ZReference = require( '../../default-view-types/ZReference.vue' );

module.exports = exports = defineComponent( {
	name: 'wl-function-evaluator-widget',
	components: {
		'cdx-button': CdxButton,
		'cdx-message': CdxMessage,
		'wl-evaluation-result': EvaluationResult,
		'wl-widget-base': WidgetBase,
		'wl-z-reference': ZReference,
		'wl-key-block': KeyBlock,
		'wl-z-object-key-value': ZObjectKeyValue
	},
	mixins: [ eventLogMixin, errorMixin ],
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
	computed: Object.assign( {}, mapState( useMainStore, [
		'getErrors',
		'getMetadataError',
		'getInputsOfFunctionZid',
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
	methods: Object.assign( {}, mapActions( useMainStore, [
		'clearErrors',
		'initializeResultId',
		'changeType',
		'fetchZids',
		'callZFunction',
		'setValueByRowIdAndPath',
		'setZFunctionCallArguments'
	] ), {
		/**
		 * Returns the ZIDs of the arguments for the given functionZid
		 *
		 * @param {string} functionZid
		 * @return {Array}
		 */
		getArgumentZids: function ( functionZid ) {
			return this.getInputsOfFunctionZid( functionZid ).map( ( arg ) => arg[ Constants.Z_ARGUMENT_TYPE ] );
		},

		/**
		 * Sets the function Zid in the zobject table
		 *
		 * @param {Object} payload
		 * @param {Object} payload.keyPath sequence of keys till the value to edit
		 * @param {Object | Array | string} payload.value new value
		 */
		setFunctionZid: function ( payload ) {
			// The function zid was already fetched when the lookup was done
			// So we just need to fetch the zids of the arguments
			const argumentZids = this.getArgumentZids( payload.value );
			this.fetchZids( { zids: argumentZids } ).then( () => {
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
			this.resultRowId = this.initializeResultId( this.resultRowId );

			// Clear errors and perform the function call
			this.clearErrors( this.resultRowId );

			// Perform the function call using .then() chain
			this.callZFunction( {
				functionCall: functionCallJson,
				resultRowId: this.resultRowId
			} )
				.then( () => {
					// Once the function call is done, update the state
					this.running = false;
					this.hasResult = true;

					// Log an event using Metrics Platform's core interaction events
					const interactionData = {
						zobjecttype: this.getCurrentZObjectType || null,
						zobjectid: this.getCurrentZObjectId || null,
						zlang: this.getUserLangZid || null,
						selectedfunctionzid: this.selectedFunctionZid || null,
						haserrors: !!this.getMetadataError
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
			// Initialize detached object for the function call
			const functionCallRowId = this.initializeResultId( this.functionCallRowId );

			// Set the function call scaffolding
			this.changeType( {
				type: Constants.Z_FUNCTION_CALL,
				id: functionCallRowId,
				value: initialFunctionZid || ''
			} );

			// If we are initializing the evaluator with an initialFunctionZid
			// we fetch the function data and then we set the arguments
			if ( initialFunctionZid ) {
				// Fetch the function zid first
				// and then fetch the argument zids when the function zid is fetched
				this.fetchZids( { zids: [ initialFunctionZid ] } ).then( () => {
					const argumentZids = this.getArgumentZids( initialFunctionZid );
					this.fetchZids( { zids: argumentZids } ).then( () => {
						this.setZFunctionCallArguments( {
							parentId: functionCallRowId,
							functionZid: initialFunctionZid
						} );
					} );
				} );
			}

			// Initialize detached object for the result
			const resultRowId = this.initializeResultId( this.resultRowId );

			// Set both detached rowIds to render the components
			this.functionCallRowId = functionCallRowId;
			this.resultRowId = resultRowId;
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
@import '../../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-function-evaluator-widget {
	.ext-wikilambda-app-function-evaluator-widget__loader {
		font-weight: @font-weight-normal;
		color: @color-placeholder;
		white-space: pre-wrap;
	}

	.ext-wikilambda-app-function-evaluator-widget__message {
		margin-bottom: @spacing-125;
	}

	.ext-wikilambda-app-function-evaluator-widget__inputs,
	.ext-wikilambda-app-function-evaluator-widget__call {
		margin-bottom: @spacing-125;
	}

	.ext-wikilambda-app-function-evaluator-widget__result-block {
		margin: 0 -@spacing-75 -@spacing-75;
	}

	.ext-wikilambda-app-function-evaluator-widget__result {
		margin-top: @spacing-75;
		padding: @spacing-75;
		background-color: @background-color-progressive-subtle;
	}
}
</style>
