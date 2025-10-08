<!--
	WikiLambda Vue component for evaluation of ZFunction objects.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<wl-widget-base
		id="function-evaluator-widget"
		class="ext-wikilambda-app-function-evaluator-widget"
		data-testid="function-evaluator-widget">
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
				{{ i18n( 'wikilambda-function-evaluation-restriction-warning' ).text() }}
			</cdx-message>
			<!-- Not-runnable user warning -->
			<cdx-message
				v-if="!hasImplementations && isSelectedFunctionFetched"
				type="notice"
				class="ext-wikilambda-app-function-evaluator-widget__message"
				data-testid="function-evaluator-message"
			>
				{{ i18n( 'wikilambda-function-evaluation-restriction-notrunnable' ).text() }}
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
				<wl-z-object-key-value
					:key-path="functionKeyPath"
					:object-value="functionCall[ functionKey ]"
					:skip-key="true"
					:skip-indent="true"
					:edit="true"
				></wl-z-object-key-value>
			</div>

			<!-- Loader for inputs + button -->
			<div
				v-if="isLoading"
				class="ext-wikilambda-app-function-evaluator-widget__loader"
				data-testid="function-evaluator-loader">
				{{ i18n( 'wikilambda-loading' ).text() }}
			</div>
			<div v-else-if="!isSelectedFunctionFetched && !showFunctionSelector">
				<p v-if="forImplementation">
					{{ i18n( 'wikilambda-function-evaluator-no-function-selected-for-implementation' ).text() }}
				</p>
				<p v-else>
					{{ i18n( 'wikilambda-function-evaluator-no-function-selected' ).text() }}
				</p>
			</div>
			<div v-else>
				<!-- Function Inputs -->
				<div
					v-if="inputKeys.length > 0"
					class="ext-wikilambda-app-function-evaluator-widget__inputs"
					data-testid="function-evaluator-inputs"
				>
					<wl-key-block :key-bold="true">
						<label>{{ i18n( 'wikilambda-function-evaluator-enter-inputs' ).text() }}</label>
					</wl-key-block>
					<wl-z-object-key-value
						v-for="inputKey in inputKeys"
						:key="inputKey"
						:key-path="getInputKeyPath( inputKey )"
						:object-value="functionCall[ inputKey ]"
						:edit="true"
					></wl-z-object-key-value>
				</div>

				<!-- Run Function and Share buttons -->
				<div class="ext-wikilambda-app-function-evaluator-widget__run-button">
					<cdx-button
						action="progressive"
						weight="primary"
						:disabled="!canRunFunction"
						data-testid="evaluator-run-button"
						@click="waitAndCallFunction"
					>
						{{ i18n( 'wikilambda-function-evaluator-run-function' ).text() }}
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
						<label>{{ i18n( 'wikilambda-function-evaluator-result' ).text() }}</label>
					</wl-key-block>
					<div v-if="running" data-testid="function-evaluator-running">
						{{ i18n( 'wikilambda-function-evaluator-running' ).text() }}
					</div>
					<template v-else>
						<wl-safe-message v-if="apiErrors.length > 0" :error="apiErrors[0]"></wl-safe-message>
						<wl-evaluation-result v-else :content-type="contentType"></wl-evaluation-result>
					</template>
				</div>
			</div>
		</template>
	</wl-widget-base>
</template>

<script>
const { computed, defineComponent, inject, onMounted, ref, watch } = require( 'vue' );

const Constants = require( '../../../Constants.js' );
const useMainStore = require( '../../../store/index.js' );
const useEventLog = require( '../../../composables/useEventLog.js' );
const { typeToString } = require( '../../../utils/typeUtils.js' );
const { hybridToCanonical, canonicalToHybrid, extractZIDs } = require( '../../../utils/schemata.js' );
const {
	getZFunctionCallFunctionId,
	getZFunctionCallArgumentKeys
} = require( '../../../utils/zobjectUtils.js' );

// Base components
const KeyBlock = require( '../../base/KeyBlock.vue' );
const SafeMessage = require( '../../base/SafeMessage.vue' );
const WidgetBase = require( '../../base/WidgetBase.vue' );
// Type components
const EvaluationResult = require( './EvaluationResult.vue' );
const ZObjectKeyValue = require( '../../types/ZObjectKeyValue.vue' );
// Codex components
const { CdxButton, CdxMessage } = require( '../../../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'wl-function-evaluator-widget',
	components: {
		'cdx-button': CdxButton,
		'cdx-message': CdxMessage,
		'wl-evaluation-result': EvaluationResult,
		'wl-key-block': KeyBlock,
		'wl-safe-message': SafeMessage,
		'wl-widget-base': WidgetBase,
		'wl-z-object-key-value': ZObjectKeyValue
	},
	props: {
		functionZid: {
			type: String,
			required: false,
			default: undefined
		},
		contentType: {
			type: String,
			required: false,
			default: undefined
		},
		sharedFunctionCall: {
			type: Object,
			required: false,
			default: null
		}
	},
	setup( props ) {
		const i18n = inject( 'i18n' );
		const { submitInteraction } = useEventLog();
		const store = useMainStore();

		// Reactive data
		const running = ref( false );
		const hasResult = ref( false );
		const isLoading = ref( true );
		const functionKey = Constants.Z_FUNCTION_CALL_FUNCTION;
		const functionKeyPath = [
			Constants.STORED_OBJECTS.FUNCTION_CALL,
			Constants.Z_FUNCTION_CALL_FUNCTION
		].join( '.' );

		/**
		 * The function call as set in the store
		 *
		 * @return {Object}
		 */
		const functionCall = computed( () => store.getZObjectByKeyPath(
			[ Constants.STORED_OBJECTS.FUNCTION_CALL ]
		) );

		/**
		 * Returns the selected function in the function call.
		 *
		 * @return {string|undefined}
		 */
		const selectedFunctionZid = computed( () => {
			if (
				!functionCall.value ||
				typeof functionCall.value !== 'object' ||
				!( Constants.Z_FUNCTION_CALL_FUNCTION in functionCall.value )
			) {
				return undefined;
			}
			return getZFunctionCallFunctionId( functionCall.value );
		} );

		/**
		 * Returns the keys of the inputs of the function call.
		 *
		 * @return {Array}
		 */
		const inputKeys = computed( () => selectedFunctionZid.value ?
			getZFunctionCallArgumentKeys( functionCall.value ) :
			[] );

		/**
		 * Returns the API error returned by the orchestrator
		 *
		 * @return {Object}
		 */
		const apiErrors = computed( () => store.getErrors( Constants.STORED_OBJECTS.RESPONSE ) );

		/**
		 * Returns the array of implementation IDs for the selected function
		 *
		 * @return {Array}
		 */
		const implementations = computed( () => selectedFunctionZid.value ?
			store.getConnectedObjects( selectedFunctionZid.value, Constants.Z_FUNCTION_IMPLEMENTATIONS ) :
			[] );

		/**
		 * Returns whether the function exists and has been fetched
		 *
		 * @return {boolean}
		 */
		const isSelectedFunctionFetched = computed( () => !!store.getStoredObject( selectedFunctionZid.value ) );

		/**
		 * Whether the widget has a pre-defined function
		 *
		 * @return {boolean}
		 */
		const showFunctionSelector = computed( () => !props.functionZid );

		/**
		 * Returns whether the selected Function has any implementations
		 * and hence it can be run.
		 *
		 * @return {boolean}
		 */
		const hasImplementations = computed( () => implementations.value.length > 0 );

		/**
		 * Returns whether the function can be run, which can only happen
		 * if the function has active implementations and the user is logged in.
		 *
		 * @return {boolean}
		 */
		const canRunFunction = computed( () => hasImplementations.value && store.userCanRunFunction );

		/**
		 * Returns the human readable label for the function selector block
		 *
		 * @return {LabelData}
		 */
		const functionCallLabelData = computed( () => store.getLabelData( Constants.Z_FUNCTION_CALL_FUNCTION ) );

		/**
		 * Returns the title of the Function Evaluator widget, depending on the type.
		 * E.g.:
		 * * 'Try a function' if the function is not preselected
		 * * 'Try this function' if the function is preselected (function and tester pages)
		 * * 'Try this implementation' if the function and implementation are preselected
		 *   (implementation page)
		 *
		 * @return {string}
		 */
		const title = computed( () => {
			switch ( props.contentType ) {
				case Constants.Z_FUNCTION:
				case Constants.Z_TESTER:
					return i18n( 'wikilambda-function-evaluator-title-function' ).text();
				case Constants.Z_IMPLEMENTATION:
					return i18n( 'wikilambda-function-evaluator-title-implementation' ).text();
				default:
					return i18n( 'wikilambda-function-evaluator-title' ).text();
			}
		} );

		/**
		 * Whether this widget is being rendered in an implementation page
		 *
		 * @return {boolean}
		 */
		const forImplementation = computed( () => props.contentType === Constants.Z_IMPLEMENTATION );

		/**
		 * Returns the ZIDs of the arguments for the given functionZid
		 *
		 * @param {string} functionZid
		 * @return {Array}
		 */
		function getInputTypeZids( functionZid ) {
			return store.getInputsOfFunctionZid( functionZid ).map(
				( arg ) => typeToString( arg[ Constants.Z_ARGUMENT_TYPE ], true )
			);
		}

		/**
		 * Returns the key path of a function call input given the input key
		 *
		 * @param {string} inputKey
		 * @return {string}
		 */
		function getInputKeyPath( inputKey ) {
			return [ Constants.STORED_OBJECTS.FUNCTION_CALL, inputKey ].join( '.' );
		}

		/**
		 * Clears the orchestration result object
		 */
		function clearResult() {
			hasResult.value = false;
			running.value = false;
		}

		/**
		 * Fetches a function and its argument types
		 *
		 * @param {string} functionZid - The function ZID to fetch
		 * @return {Promise} Promise that resolves when all data is loaded
		 */
		function fetchFunctionAndArguments( functionZid ) {
			return store.fetchZids( { zids: [ functionZid ] } ).then( () => {
				const inputTypeZids = getInputTypeZids( functionZid );
				return store.fetchZids( { zids: inputTypeZids } );
			} );
		}

		/**
		 * Initializes the detached objects in the zobject table
		 * that will contain:
		 * 1. The function call object, and
		 * 2. The evaluator result object returned from the call
		 *
		 * @param {string|undefined} functionZid
		 */
		function initialize( functionZid ) {
			isLoading.value = true;

			// Clear the function call response
			clearResult();
			store.setJsonObject( {
				namespace: Constants.STORED_OBJECTS.RESPONSE,
				zobject: {}
			} );

			// If we have a shared function call from URL, set it directly
			if ( props.sharedFunctionCall ) {
				loadSharedFunctionCall();
				return;
			}

			// Set blank function call object
			store.changeTypeByKeyPath( {
				keyPath: [ Constants.STORED_OBJECTS.FUNCTION_CALL ],
				type: Constants.Z_FUNCTION_CALL,
				value: functionZid || undefined
			} );

			// If we are initializing the evaluator with an functionZid
			// we fetch the function data and then we set the arguments
			if ( functionZid ) {
				fetchFunctionAndArguments( functionZid ).then( () => {
					store.setFunctionCallArguments( {
						keyPath: [ Constants.STORED_OBJECTS.FUNCTION_CALL ],
						functionZid
					} );
					isLoading.value = false;
				} );
			} else {
				isLoading.value = false;
			}
		}

		/**
		 * Waits for running parsers to return and persist
		 * changes before going ahead and running the function call
		 */
		function waitAndCallFunction() {
			store.waitForRunningParsers.then( () => callFunction() );
		}

		/**
		 * Loads a shared function call from the prop
		 */
		function loadSharedFunctionCall() {
			// Get the function ZID from the shared function call
			const functionZid = getZFunctionCallFunctionId( props.sharedFunctionCall );

			// Extract all ZIDs from the function call
			const allZids = extractZIDs( props.sharedFunctionCall );

			// Set the entire function call object in the store at once
			store.setJsonObject( {
				namespace: Constants.STORED_OBJECTS.FUNCTION_CALL,
				zobject: canonicalToHybrid( props.sharedFunctionCall )
			} );

			// Fetch all ZIDs mentioned in the function call, plus the function and argument types
			Promise.all( [
				store.fetchZids( { zids: allZids } ),
				fetchFunctionAndArguments( functionZid )
			] ).then( () => {
				isLoading.value = false;

				// Always auto-run when loading from shared URL
				if ( canRunFunction.value ) {
					waitAndCallFunction();
				}
			} );
		}

		/**
		 * Performs the function call
		 */
		function callFunction() {
			const funcCall = JSON.parse( JSON.stringify( functionCall.value ) );
			// If we are in an implementation page, we build raw function call with raw implementation:
			// 1. Replace Z7K1 with the whole Z8 object: we assume it's in the store
			// 2. Replace te Z8K4 with [ Z14, implementation ]
			if ( forImplementation.value ) {
				const storedFunction = store.getStoredObject( props.functionZid );
				// If user can run unsaved code, we get the raw implementation,
				// else, we use the current persisted version by using its Zid
				const thisImplementation = () => {
					const hybrid = store.getZObjectByKeyPath( [
						Constants.STORED_OBJECTS.MAIN,
						Constants.Z_PERSISTENTOBJECT_VALUE
					] );
					return hybridToCanonical( hybrid );
				};
				const implementation = store.userCanRunUnsavedCode ?
					thisImplementation() :
					store.getCurrentZObjectId;

				if ( storedFunction && implementation ) {
					const functionObject = storedFunction[ Constants.Z_PERSISTENTOBJECT_VALUE ];
					functionObject[ Constants.Z_FUNCTION_IMPLEMENTATIONS ] = [
						Constants.Z_IMPLEMENTATION,
						implementation
					];
					funcCall[ Constants.Z_FUNCTION_CALL_FUNCTION ] = functionObject;
				}
			}

			running.value = true;

			// Clear errors and perform the function call
			store.clearErrors( Constants.STORED_OBJECTS.RESPONSE );

			// Perform the function call using .then() chain
			store.callZFunction( {
				functionCall: funcCall,
				resultKeyPath: [ Constants.STORED_OBJECTS.RESPONSE ]
			} ).then( () => {
				// Once the function call is done, update the state
				running.value = false;
				hasResult.value = true;

				// Log an event using Metrics Platform's core interaction events
				const interactionData = {
					zobjecttype: store.getCurrentZObjectType || null,
					zobjectid: store.getCurrentZObjectId || null,
					zlang: store.getUserLangZid || null,
					selectedfunctionzid: selectedFunctionZid.value || null,
					haserrors: !!store.hasMetadataErrors
				};

				submitInteraction( 'call', interactionData );
			} );
		}

		// Watchers
		watch( () => props.functionZid, () => {
			initialize( props.functionZid );
		} );
		watch( () => props.sharedFunctionCall, () => {
			loadSharedFunctionCall();
		} );

		// Lifecycle
		onMounted( () => {
			initialize( props.functionZid );
		} );

		return {
			apiErrors,
			canRunFunction,
			forImplementation,
			functionCall,
			functionCallLabelData,
			functionKey,
			functionKeyPath,
			getInputKeyPath,
			hasImplementations,
			hasResult,
			inputKeys,
			isLoading,
			isSelectedFunctionFetched,
			running,
			showFunctionSelector,
			title,
			userCanRunFunction: store.userCanRunFunction,
			waitAndCallFunction,
			i18n
		};
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

	.ext-wikilambda-app-function-evaluator-widget__run-button {
		display: flex;
		gap: @spacing-50;
		align-items: center;
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
