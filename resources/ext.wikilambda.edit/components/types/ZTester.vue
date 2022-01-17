<template>
	<!--
		WikiLambda Vue component for displaying and modifying ZTesters.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div>
		{{ functionLabel }}:{{ ' ' }}
		<z-reference
			:search-type="Constants.Z_FUNCTION"
			:zobject-id="zFunction.id"
		></z-reference>
		<span class="ext-wikilambda-is-tester-associated">
			({{ isTesterAttached ?
				$i18n( 'wikilambda-function-is-attached' ) :
				$i18n( 'wikilambda-function-is-not-attached' )
			}})
		</span>
		<div>{{ callLabel }}:</div>
		<z-function-call
			:zobject-id="zCall.id"
			hide-call-button
		>
		</z-function-call>
		<div>{{ validatorLabel }}:</div>
		<z-function-call
			:zobject-id="zValidation.id"
			hide-first-argument
			hide-call-button
		>
		</z-function-call>
		<z-function-tester-report
			:z-function-id="zFunctionId"
			:z-tester-id="zTesterId"
		>
			<template #run-testers="{ click }">
				<button @click="click">
					{{ $i18n( 'wikilambda-tester-run-tester' ) }}
				</button>
			</template>
		</z-function-tester-report>
	</div>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions,
	typeUtils = require( '../../mixins/typeUtils.js' ),
	ZFunctionCall = require( './ZFunctionCall.vue' ),
	ZReference = require( './ZReference.vue' ),
	ZFunctionTesterReport = require( '../function/ZFunctionTesterReport.vue' );

// @vue/component
module.exports = {
	components: {
		'z-function-call': ZFunctionCall,
		'z-reference': ZReference,
		'z-function-tester-report': ZFunctionTesterReport
	},
	mixins: [ typeUtils ],
	props: {
		zobjectId: {
			type: Number,
			required: true
		}
	},
	computed: $.extend( mapGetters( [
		'getZObjectChildrenById',
		'getZkeyLabels',
		'getZkeys',
		'getNestedZObjectById',
		'getZObjectById'
	] ),
	{
		Constants: function () {
			return Constants;
		},
		functionLabel: function () {
			return this.getZkeyLabels[ Constants.Z_TESTER_FUNCTION ];
		},
		callLabel: function () {
			return this.getZkeyLabels[ Constants.Z_TESTER_CALL ];
		},
		validatorLabel: function () {
			return this.getZkeyLabels[ Constants.Z_TESTER_VALIDATION ];
		},
		zobject: function () {
			return this.getZObjectChildrenById( this.zobjectId );
		},
		zFunction: function () {
			return this.findKeyInArray( Constants.Z_TESTER_FUNCTION, this.zobject );
		},
		zCall: function () {
			return this.findKeyInArray( Constants.Z_TESTER_CALL, this.zobject );
		},
		zValidation: function () {
			return this.findKeyInArray( Constants.Z_TESTER_VALIDATION, this.zobject );
		},
		zFunctionId: function () {
			return this.getNestedZObjectById( this.zCall.id, [
				Constants.Z_FUNCTION_CALL_FUNCTION,
				Constants.Z_REFERENCE_ID
			] ).value || '';
		},
		selectedFunctionJson: function () {
			return this.getZkeys[ this.zFunctionId ];
		},
		zTesterId: function () {
			return this.getNestedZObjectById( this.getZObjectById( this.zobjectId ).parent, [
				Constants.Z_PERSISTENTOBJECT_ID,
				Constants.Z_STRING_VALUE
			] ).value;
		},
		isTesterAttached: function () {
			return this.selectedFunctionJson && this.selectedFunctionJson.Z2K2.Z8K3.filter( function ( zid ) {
				return zid === this.zTesterId;
			}.bind( this ) ).length > 0;
		}
	} ),
	methods: $.extend( mapActions( [
		'fetchZKeys',
		'setZObjectValue'
	] ), {} )
};
</script>

<style lang="less">
.ext-wikilambda-is-tester-associated {
	font-size: 0.8em;
	font-style: italic;
}
</style>
