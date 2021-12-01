<template>
	<div v-if="resultId">
		<z-function-call-runner
			:zobject-id="functionCallId"
		></z-function-call-runner>
	</div>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	ZFunctionCallRunner = require( './ZFunctionCallRunner.vue' ),
	mapActions = require( 'vuex' ).mapActions,
	mapGetters = require( 'vuex' ).mapGetters;

module.exports = {
	components: {
		'z-function-call-runner': ZFunctionCallRunner
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
		getZObjectChildrenById: 'getZObjectChildrenById',
		getZObjectTypeById: 'getZObjectTypeById',
		getZkeys: 'getZkeys',
		getZObjectAsJsonById: 'getZObjectAsJsonById',
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
						zFunctionId = this.getZObjectAsJson.Z2K2.Z14K1.Z9K1;
				}

				return this.injectZObject( {
					zobject: zFunctionId,
					key: 'Z7K1',
					id: zFunctionCall.id,
					parent: this.functionCallId
				} );
			}.bind( this ) );
	}
};
</script>
