<!--
	WikiLambda Vue component for Z20/Tester objects.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-app-tester" data-testid="z-tester">
		<!-- Function selection block -->
		<wl-z-object-key-value
			data-testid="tester-function-select"
			class="ext-wikilambda-app-tester__function"
			:key-path="`${ keyPath }.${ functionKey }`"
			:object-value="objectValue[ functionKey ]"
			:edit="edit"
			:skip-key="false"
			:skip-indent="true"
			:skip-mode-selector="true"
			:highlight-key="true"
		></wl-z-object-key-value>

		<!-- Tester call block -->
		<wl-z-object-key-value
			data-testid="tester-call"
			class="ext-wikilambda-app-tester__content"
			:key-path="`${ keyPath }.${ callKey }`"
			:object-value="objectValue[ callKey ]"
			:edit="edit"
			:skip-key="false"
			:highlight-key="true"
			:default-expanded="defaultExpanded"
		></wl-z-object-key-value>

		<!-- Tester result validation block -->
		<wl-z-object-key-value
			data-testid="tester-validation"
			class="ext-wikilambda-app-tester__content"
			:key-path="`${ keyPath }.${ validationKey }`"
			:object-value="objectValue[ validationKey ]"
			:edit="edit"
			:skip-key="false"
			:highlight-key="true"
			:default-expanded="defaultExpanded"
		></wl-z-object-key-value>
	</div>
</template>

<script>
const { defineComponent, computed, watch, onMounted } = require( 'vue' );

const Constants = require( '../../Constants.js' );
const useMainStore = require( '../../store/index.js' );
const useType = require( '../../composables/useType.js' );
const useZObject = require( '../../composables/useZObject.js' );

module.exports = exports = defineComponent( {
	name: 'wl-z-tester',
	components: {
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

		// Function Selection
		const functionKey = Constants.Z_TESTER_FUNCTION;

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

		// Function Call
		const callKey = Constants.Z_TESTER_CALL;

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

		// Function Validation
		const validationKey = Constants.Z_TESTER_VALIDATION;

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

		// UI display
		/**
		 * Returns whether tester call and validation sections should be expanded
		 * by default. This is true only when creating a brand new tester so users
		 * can immediately edit both areas.
		 *
		 * @return {boolean}
		 */
		const defaultExpanded = computed( () => !!store.isCreateNewPage );

		// Watch
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
			validationKey,
			defaultExpanded
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
