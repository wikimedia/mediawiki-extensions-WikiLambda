<!--
	WikiLambda Vue component for Z20/Tester objects.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-tester">
		<!-- Function selection block -->
		<div
			class="ext-wikilambda-tester-function"
			data-testid="z-test-function-select-container"
		>
			<div class="ext-wikilambda-key-block">
				<label
					:lang="functionLabelData.langCode"
					:dir="functionLabelData.langDir"
				>{{ functionLabelData.label }}</label>
			</div>
			<wl-z-object-key-value
				:key="functionRowId"
				:row-id="functionRowId"
				:skip-key="true"
				:skip-indent="true"
				:edit="edit"
			></wl-z-object-key-value>
		</div>
		<!-- Tester call block -->
		<div
			class="ext-wikilambda-tester-content"
			role="ext-wikilambda-tester-call"
			data-testid="tester-call"
		>
			<div class="ext-wikilambda-key-block">
				<label
					:lang="testerCallLabelData.langCode"
					:dir="testerCallLabelData.langDir"
				>{{ testerCallLabelData.label }}</label>
			</div>
			<wl-z-object-key-value
				:key="testerCallRowId"
				:skip-key="true"
				:row-id="testerCallRowId"
				:error-id="testerCallRowId"
				:edit="edit"
			></wl-z-object-key-value>
		</div>
		<!-- Tester result validation block -->
		<div
			class="ext-wikilambda-tester-content"
			role="ext-wikilambda-tester-validation"
			data-testid="tester-validation"
		>
			<div class="ext-wikilambda-key-block">
				<label
					:lang="testerValidationLabelData.langCode"
					:dir="testerValidationLabelData.langDir"
				>{{ testerValidationLabelData.label }}</label>
			</div>
			<wl-z-object-key-value
				:key="testerValidationRowId"
				:skip-key="true"
				:row-id="testerValidationRowId"
				:error-id="testerValidationRowId"
				:edit="edit"
			></wl-z-object-key-value>
		</div>
	</div>
</template>

<script>
const { defineComponent } = require( 'vue' );
const Constants = require( '../../Constants.js' ),
	isValidZidFormat = require( '../../mixins/typeUtils.js' ).methods.isValidZidFormat,
	mapActions = require( 'vuex' ).mapActions,
	mapGetters = require( 'vuex' ).mapGetters;

module.exports = exports = defineComponent( {
	name: 'wl-z-tester',
	components: {
		// Leave components as an empty object to add the ZObjectKeyValue later
	},
	props: {
		rowId: {
			type: Number,
			required: false,
			default: 0
		},
		edit: {
			type: Boolean,
			required: true
		}
	},
	computed: Object.assign( mapGetters( [
		'createObjectByType',
		'getLabelData',
		'getZTesterFunctionRowId',
		'getZTesterCallRowId',
		'getZTesterValidationRowId',
		'getZReferenceTerminalValue',
		'isCreateNewPage',
		'getStoredObject'
	] ), {
		/**
		 * Returns the row Id of the target function key: Z20K1
		 *
		 * @return {number|undefined}
		 */
		functionRowId: function () {
			return this.getZTesterFunctionRowId( this.rowId );
		},

		/**
		 * Returns the LabelData object for the test Function/Z20K1 key
		 *
		 * @return {LabelData}
		 */
		functionLabelData: function () {
			return this.getLabelData( Constants.Z_TESTER_FUNCTION );
		},

		/**
		 * Returns the Zid of the selected function/Z20K1
		 *
		 * @return {string}
		 */
		functionZid: function () {
			return this.getZReferenceTerminalValue( this.functionRowId );
		},

		/**
		 * Returns the stored function object given the selected function Zid.
		 * This computed property is needed so that it can be observed and
		 * update the test call/Z20K2 with the appropriate function call and
		 * its arguments. Before it's fetched it will return undefined
		 *
		 * @return {Object|undefined}
		 */
		storedFunction: function () {
			return this.getStoredObject( this.functionZid );
		},

		/**
		 * Returns the row Id of the tester call: Z20K2
		 *
		 * @return {number|undefined}
		 */
		testerCallRowId: function () {
			return this.getZTesterCallRowId( this.rowId );
		},

		/**
		 * Returns the row Id of the tester validation function call: Z20K3
		 *
		 * @return {number|undefined}
		 */
		testerValidationRowId: function () {
			return this.getZTesterValidationRowId( this.rowId );
		},

		/**
		 * Returns the label data for the tester call key
		 *
		 * @return {LabelData}
		 */
		testerCallLabelData: function () {
			return this.getLabelData( Constants.Z_TESTER_CALL );
		},

		/**
		 * Returns the label data for the tester validation key
		 *
		 * @return {LabelData}
		 */
		testerValidationLabelData: function () {
			return this.getLabelData( Constants.Z_TESTER_VALIDATION );
		}
	} ),
	methods: Object.assign( mapActions( [
		'fetchZids',
		'setZFunctionCallArguments'
	] ), {
		/**
		 * Initializes Test call/Z20K2 with a function call to the given functionZid
		 */
		initializeTestCall: function () {
			if ( this.isCreateNewPage && !!this.functionZid ) {
				// Set test call function call Zid
				this.$emit( 'set-value', {
					keyPath: [
						Constants.Z_TESTER_CALL,
						Constants.Z_FUNCTION_CALL_FUNCTION,
						Constants.Z_REFERENCE_ID
					],
					value: this.functionZid
				} );
				// Set test call function arguments
				this.setZFunctionCallArguments( {
					parentId: this.testerCallRowId,
					functionZid: this.functionZid
				} );
				// Get function output type and dismiss anything that's not a reference
				const outputType = this.storedFunction[ Constants.Z_PERSISTENTOBJECT_VALUE ][
					Constants.Z_FUNCTION_RETURN_TYPE ];
				if ( !outputType || ( typeof outputType !== 'string' ) || !isValidZidFormat( outputType ) ) {
					return;
				}
				this.fetchZids( { zids: [ outputType ] } ).then( () => {
					this.initializeTestValidation( outputType );
				} );
			}
		},
		/**
		 * Initializes Test validator/Z20K3 with a function call to the equality function
		 * of the type returned by the Test call/Z20K2, which is passed as input parameter.
		 *
		 * @param {string} outputType
		 */
		initializeTestValidation: function ( outputType ) {
			const type = this.getStoredObject( outputType );
			const equalityZid = type[ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_TYPE_EQUALITY ];
			if ( !equalityZid || ( typeof equalityZid !== 'string' ) || !isValidZidFormat( equalityZid ) ) {
				// Set to blank Function Call if the new test call output doesn't have an equality function
				const blankFunctionCall = this.createObjectByType( { type: Constants.Z_FUNCTION_CALL } );
				this.$emit( 'set-value', {
					keyPath: [ Constants.Z_TESTER_VALIDATION ],
					value: blankFunctionCall
				} );
				return;
			}
			this.fetchZids( { zids: [ equalityZid ] } ).then( () => {
				// Set test validation function call Zid
				this.$emit( 'set-value', {
					keyPath: [
						Constants.Z_TESTER_VALIDATION,
						Constants.Z_FUNCTION_CALL_FUNCTION,
						Constants.Z_REFERENCE_ID
					],
					value: equalityZid
				} );
				// Set tester validation function arguments
				this.setZFunctionCallArguments( {
					parentId: this.testerValidationRowId,
					functionZid: equalityZid
				} );
			} );
		}
	} ),
	watch: {
		storedFunction: function ( newFunction ) {
			if ( newFunction ) {
				this.initializeTestCall();
			}
		}
	},
	beforeCreate: function () {
		// Need to delay require of ZObjectKeyValue to avoid loop
		this.$options.components[ 'wl-z-object-key-value' ] = require( './ZObjectKeyValue.vue' );
	},
	mounted: function () {
		if ( this.storedFunction ) {
			this.initializeTestCall();
		}
	}
} );
</script>

<style lang="less">
@import '../../ext.wikilambda.edit.variables.less';

.ext-wikilambda-tester {
	.ext-wikilambda-tester-content {
		padding-top: @spacing-75;

		> .ext-wikilambda-key-block {
			margin-bottom: 0;

			label {
				font-weight: bold;
				color: @color-base;
			}
		}
	}

	.ext-wikilambda-tester-function {
		.ext-wikilambda-key-block {
			margin-bottom: 0;

			label {
				font-weight: bold;
				color: @color-base;
			}
		}
	}
}
</style>
