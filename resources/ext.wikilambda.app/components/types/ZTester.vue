<!--
	WikiLambda Vue component for Z20/Tester objects.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-app-tester" data-testid="z-tester">
		<!-- Function selection block -->
		<wl-key-value-block
			:key-bold="true"
			class="ext-wikilambda-app-tester__function"
			data-testid="tester-function-select"
		>
			<template #key>
				<label
					:lang="functionLabelData.langCode"
					:dir="functionLabelData.langDir"
				>{{ functionLabelData.label }}</label>
			</template>
			<template #value>
				<wl-z-object-key-value
					:key-path="`${ keyPath }.${ functionKey }`"
					:object-value="objectValue[ functionKey ]"
					:edit="edit"
					:skip-key="true"
					:skip-indent="true"
				></wl-z-object-key-value>
			</template>
		</wl-key-value-block>

		<!-- Tester call block -->
		<wl-key-value-block
			:key-bold="true"
			class="ext-wikilambda-app-tester__content"
			data-testid="tester-call"
		>
			<template #key>
				<label
					:lang="testerCallLabelData.langCode"
					:dir="testerCallLabelData.langDir"
				>{{ testerCallLabelData.label }}</label>
			</template>
			<template #value>
				<wl-z-object-key-value
					:key-path="`${ keyPath }.${ callKey }`"
					:object-value="objectValue[ callKey ]"
					:edit="edit"
					:skip-key="true"
				></wl-z-object-key-value>
			</template>
		</wl-key-value-block>

		<!-- Tester result validation block -->
		<wl-key-value-block
			:key-bold="true"
			class="ext-wikilambda-app-tester__content"
			data-testid="tester-validation"
		>
			<template #key>
				<label
					:lang="testerValidationLabelData.langCode"
					:dir="testerValidationLabelData.langDir"
				>{{ testerValidationLabelData.label }}</label>
			</template>
			<template #value>
				<wl-z-object-key-value
					:key-path="`${ keyPath }.${ validationKey }`"
					:object-value="objectValue[ validationKey ]"
					:edit="edit"
					:skip-key="true"
				></wl-z-object-key-value>
			</template>
		</wl-key-value-block>
	</div>
</template>

<script>
const { defineComponent, computed, watch, onMounted } = require( 'vue' );

const Constants = require( '../../Constants.js' );
const useMainStore = require( '../../store/index.js' );
const useType = require( '../../composables/useType.js' );
const useZObject = require( '../../composables/useZObject.js' );

// Base components
const KeyValueBlock = require( '../base/KeyValueBlock.vue' );

module.exports = exports = defineComponent( {
	name: 'wl-z-tester',
	components: {
		'wl-key-value-block': KeyValueBlock
	},
	props: {
		keyPath: {
			type: String,
			required: true
		},
		objectValue: {
			type: [ String, Object ],
			required: true
		},
		edit: {
			type: Boolean,
			required: true
		}
	},
	emits: [ 'set-value' ],
	setup( props, { emit } ) {
		const { isValidZidFormat } = useType();
		const { getZTesterFunctionZid } = useZObject( { keyPath: props.keyPath } );
		const store = useMainStore();

		// Data
		const functionKey = Constants.Z_TESTER_FUNCTION;
		const callKey = Constants.Z_TESTER_CALL;
		const validationKey = Constants.Z_TESTER_VALIDATION;

		// Computed properties
		/**
		 * Returns the LabelData object for the test Function/Z20K1 key
		 *
		 * @return {LabelData}
		 */
		const functionLabelData = computed( () => store.getLabelData( Constants.Z_TESTER_FUNCTION ) );

		/**
		 * Returns the Zid of the selected function/Z20K1
		 *
		 * @return {string}
		 */
		const functionZid = computed( () => getZTesterFunctionZid( props.objectValue ) );

		/**
		 * Returns the stored function object given the selected function Zid.
		 * This computed property is needed so that it can be observed and
		 * update the test call/Z20K2 with the appropriate function call and
		 * its arguments. Before it's fetched it will return undefined
		 *
		 * @return {Object|undefined}
		 */
		const storedFunction = computed( () => store.getStoredObject( functionZid.value ) );

		/**
		 * Returns the label data for the tester call key
		 *
		 * @return {LabelData}
		 */
		const testerCallLabelData = computed( () => store.getLabelData( Constants.Z_TESTER_CALL ) );

		/**
		 * Returns the label data for the tester validation key
		 *
		 * @return {LabelData}
		 */
		const testerValidationLabelData = computed( () => store.getLabelData( Constants.Z_TESTER_VALIDATION ) );

		// Methods
		/**
		 * Initializes Test validator/Z20K3 with a function call to the equality function
		 * of the type returned by the Test call/Z20K2, which is passed as input parameter.
		 *
		 * @param {string} outputType
		 */
		function initializeTestValidation( outputType ) {
			function setupValidation( equalityFunctionZid ) {
				// Set test validation function call Zid
				emit( 'set-value', {
					keyPath: [
						Constants.Z_TESTER_VALIDATION,
						Constants.Z_FUNCTION_CALL_FUNCTION,
						Constants.Z_REFERENCE_ID
					],
					value: equalityFunctionZid || ''
				} );
				// Set tester validation function arguments
				store.setFunctionCallArguments( {
					keyPath: [ ...props.keyPath.split( '.' ), Constants.Z_TESTER_VALIDATION ],
					functionZid: equalityFunctionZid || undefined
				} );
			}

			const type = store.getStoredObject( outputType );
			const equalityZid = type[ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_TYPE_EQUALITY ];
			if ( !equalityZid || ( typeof equalityZid !== 'string' ) || !isValidZidFormat( equalityZid ) ) {
				// No equality function: we set the validator function call to empty and exit
				setupValidation();
				return;
			}
			// We fetch the equality function zid and set the validator function call
			store.fetchZids( { zids: [ equalityZid ] } ).then( () => {
				setupValidation( equalityZid );
			} );
		}

		/**
		 * Initializes Test call/Z20K2 with a function call to the given functionZid
		 */
		function initializeTestCall() {
			if ( store.isCreateNewPage && !!functionZid.value ) {
				// Set test call function call Zid
				emit( 'set-value', {
					keyPath: [
						Constants.Z_TESTER_CALL,
						Constants.Z_FUNCTION_CALL_FUNCTION,
						Constants.Z_REFERENCE_ID
					],
					value: functionZid.value
				} );
				// Set test call function arguments
				store.setFunctionCallArguments( {
					keyPath: [ ...props.keyPath.split( '.' ), Constants.Z_TESTER_CALL ],
					functionZid: functionZid.value
				} );
				// Get function output type and dismiss anything that's not a reference
				const outputType = storedFunction.value[ Constants.Z_PERSISTENTOBJECT_VALUE ][
					Constants.Z_FUNCTION_RETURN_TYPE ];
				if ( !outputType || ( typeof outputType !== 'string' ) || !isValidZidFormat( outputType ) ) {
					return;
				}
				store.fetchZids( { zids: [ outputType ] } ).then( () => {
					initializeTestValidation( outputType );
				} );
			}
		}

		// Watchers
		watch( storedFunction, ( newFunction ) => {
			if ( newFunction ) {
				initializeTestCall();
			}
		} );

		// Lifecycle
		onMounted( () => {
			if ( storedFunction.value ) {
				initializeTestCall();
			}
		} );

		return {
			callKey,
			functionKey,
			functionLabelData,
			testerCallLabelData,
			testerValidationLabelData,
			validationKey
		};
	},
	beforeCreate: function () {
		// Need to delay require of ZObjectKeyValue to avoid loop
		this.$options.components[ 'wl-z-object-key-value' ] = require( './ZObjectKeyValue.vue' );
	}
} );
</script>

<style lang="less">
@import '../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-tester {
	.ext-wikilambda-app-tester__content {
		padding-top: @spacing-75;
	}
}
</style>
