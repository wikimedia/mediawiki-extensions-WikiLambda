<template>
	<!--
		WikiLambda Vue component for displaying and modifying ZTesters.

		@copyright 2020–2021 WikiLambda team; see AUTHORS.txt
		@license MIT
	-->
	<div>
		<div>{{ callLabel }}:</div>
		<z-function-call
			:zobject-id="zCall.id"
		>
		</z-function-call>
		{{ validatorLabel }}:{{ ' ' }}
		<z-reference
			:search-type="Constants.Z_FUNCTION"
			:zobject-id="zValidation.id"
		></z-reference>
	</div>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions,
	typeUtils = require( '../../mixins/typeUtils.js' ),
	ZFunctionCall = require( './ZFunctionCall.vue' ),
	ZReference = require( './ZReference.vue' );

module.exports = {
	components: {
		'z-function-call': ZFunctionCall,
		'z-reference': ZReference
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
		'getViewMode',
		'getNestedZObjectById'
	] ),
	{
		Constants: function () {
			return Constants;
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
		zCall: function () {
			return this.findKeyInArray( Constants.Z_TESTER_CALL, this.zobject );
		},
		zValidation: function () {
			return this.findKeyInArray( Constants.Z_TESTER_VALIDATION, this.zobject );
		}
	} ),
	methods: $.extend( mapActions( [
		'fetchZKeys',
		'setZObjectValue'
	] ), {} )
};
</script>
