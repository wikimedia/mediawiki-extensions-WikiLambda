<template>
	<!--
		WikiLambda Vue component for evaluation of ZFunction objects.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div v-if="resultId">
		<wl-z-function-call-runner
			:zobject-id="functionCallId"
		></wl-z-function-call-runner>
	</div>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	ZFunctionCallRunner = require( './ZFunctionCallRunner.vue' ),
	mapActions = require( 'vuex' ).mapActions,
	mapGetters = require( 'vuex' ).mapGetters;

// @vue/component
module.exports = exports = {
	name: 'wl-z-function-evaluator',
	components: {
		'wl-z-function-call-runner': ZFunctionCallRunner
	},
	data: function () {
		return {
			functionCallId: '',
			resultId: ''
		};
	},
	computed: mapGetters( {
		getNestedZObjectById: 'getNestedZObjectById',
		getCurrentZObjectId: 'getCurrentZObjectId',
		getCurrentZObjectType: 'getCurrentZObjectType',
		getZObjectAsJson: 'getZObjectAsJson'
	} ),
	methods: mapActions( [
		'initializeResultId',
		'addZFunctionCall',
		'injectZObject'
	] ),
	mounted: function () {
		this.initializeResultId( this.functionCallId )
			.then( function ( id ) {
				this.functionCallId = id;

				return this.addZFunctionCall( { id: this.functionCallId } );
			}.bind( this ) )
			.then( function () {
				return this.initializeResultId( this.resultId );
			}.bind( this ) )
			.then( function ( id ) {
				this.resultId = id;

				var zFunctionCall = this.getNestedZObjectById( this.functionCallId, [
					Constants.Z_FUNCTION_CALL_FUNCTION
				] );
				var zFunctionId;

				switch ( this.getCurrentZObjectType ) {
					case Constants.Z_FUNCTION:
						zFunctionId = this.getCurrentZObjectId;
						break;
					case Constants.Z_IMPLEMENTATION:
						// eslint-disable-next-line max-len
						var zImplementationFunction = this.getZObjectAsJson[ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_IMPLEMENTATION_FUNCTION ];
						if ( zImplementationFunction ) {
							zFunctionId = zImplementationFunction[ Constants.Z_REFERENCE_ID ];
						}
				}

				return this.injectZObject( {
					zobject: zFunctionId,
					key: Constants.Z_FUNCTION_CALL_FUNCTION,
					id: zFunctionCall.id,
					parent: this.functionCallId
				} );
			}.bind( this ) );
	}
};
</script>
