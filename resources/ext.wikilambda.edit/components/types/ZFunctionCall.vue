<template>
	<!--
		WikiLambda Vue component for ZFunctionCall objects.

		@copyright 2020–2021 WikiLambda team; see AUTHORS.txt
		@license MIT
	-->
	<div>
		{{ zFunctionCallKeyLabels[ Constants.Z_FUNCTION_CALL_FUNCTION ] }}:
		<z-object-selector
			:type="Constants.Z_FUNCTION"
			:placeholder="$i18n( 'wikilambda-function-typeselector-label' )"
			:selected-id="zFunctionId"
			@input="typeHandler"
		></z-object-selector>
		<ul>
			<li v-for="argument in zFunctionArguments" :key="argument.key">
				{{ argument.label }} ({{ argument.key }}):
				<z-object
					:zobject-id="findArgumentId(argument.key)"
					:persistent="false"
				></z-object>
			</li>
		</ul>
		<button @click="callFunctionHandler">
			<label> {{ $i18n( 'wikilambda-call-function' ) }} </label>
		</button>
		<div>
			{{ $i18n( 'wikilambda-orchestrated' ) }}:
			<z-object-json
				:readonly="true"
				:zobject-raw="getOrchestrationResult"
			></z-object-json>
		</div>
	</div>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	mapActions = require( 'vuex' ).mapActions,
	mapGetters = require( 'vuex' ).mapGetters,
	mapState = require( 'vuex' ).mapState,
	ZObjectSelector = require( '../ZObjectSelector.vue' ),
	ZObjectJson = require( '../ZObjectJson.vue' ),
	typeUtils = require( '../../mixins/typeUtils.js' );

module.exports = {
	components: {
		'z-object-selector': ZObjectSelector,
		'z-object-json': ZObjectJson
	},
	mixins: [ typeUtils ],
	props: {
		zobjectId: {
			type: Number,
			required: true
		}
	},
	computed: $.extend( mapState( {
	} ), mapGetters( {
		getZObjectChildrenById: 'getZObjectChildrenById',
		getZObjectTypeById: 'getZObjectTypeById',
		getZkeys: 'getZkeys',
		getZObjectAsJsonById: 'getZObjectAsJsonById',
		getOrchestrationResult: 'getOrchestrationResult'
	} ), {
		zobject: function () {
			return this.getZObjectChildrenById( this.zobjectId );
		},
		Constants: function () {
			return Constants;
		},
		zFunctionId: function () {
			var func = this.findKeyInArray( Constants.Z_FUNCTION_CALL_FUNCTION, this.zobject );

			if ( func.value === 'object' ) {
				return this.findKeyInArray( Constants.Z_REFERENCE_ID, this.getZObjectChildrenById( func.id ) ).value;
			}
			return func.value;
		},
		selectedFunction: function () {
			return this.getZkeys[ this.zFunctionId ];
		},
		zFunctionCall: function () {
			return this.getZkeys[ Constants.Z_FUNCTION_CALL ];
		},
		zFunctionCallKeys: function () {
			if ( this.zFunctionCall ) {
				return this.zFunctionCall[ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_TYPE_KEYS ];
			}
			return [];
		},
		zFunctionCallKeyLabels: function () {
			var labels = {};
			this.zFunctionCallKeys.forEach( function ( keyObject ) {
				var key = keyObject[ Constants.Z_KEY_ID ];
				labels[ key ] = keyObject[
					Constants.Z_KEY_LABEL ][
					Constants.Z_MULTILINGUALSTRING_VALUE ][
					0 ][
					Constants.Z_MONOLINGUALSTRING_VALUE ];
			} );
			return labels;
		},
		zFunctionKeys: function () {
			if ( !this.selectedFunction ) {
				return [];
			} else {
				return this.selectedFunction[ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_FUNCTION_ARGUMENTS ];
			}
		},
		zFunctionArguments: function () {
			var labels = [];
			this.zFunctionKeys.forEach( function ( keyObject ) {
				var key = keyObject[ Constants.Z_ARGUMENT_KEY ],
					label = keyObject[
						Constants.Z_ARGUMENT_LABEL ][
						Constants.Z_MULTILINGUALSTRING_VALUE ][
						0 ][
						Constants.Z_MONOLINGUALSTRING_VALUE ],
					type = keyObject[ Constants.Z_ARGUMENT_TYPE ];

				labels.push( {
					key: key,
					label: label,
					type: type
				} );
			} );

			return labels;
		},
		zImplementationLanguages: function () {
			if ( this.selectedFunction ) {
				// we check if the function has implementations
				if ( this.selectedFunction[ Constants.Z_PERSISTENTOBJECT_VALUE ] &&
					this.selectedFunction[
						Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_FUNCTION_IMPLEMENTATIONS ].length > 0 ) {
					return this.selectedFunction[
						Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_FUNCTION_IMPLEMENTATIONS ];
				}
			}
			return null;
		}
	} ),
	methods: $.extend( mapActions( [
		'fetchZKeys',
		'setZObjectValue',
		'addZObject',
		'addZObjects',
		'callZFunction',
		'changeType',
		'resetZObject'
	] ), {
		typeHandler: function ( zid ) {
			var self = this,
				zFunctionCallFunction = this.findKeyInArray( Constants.Z_FUNCTION_CALL_FUNCTION, this.zobject );
			self.resetZObject( self.zobjectId )
				.then( function () {
					if ( zid ) {
						self.setZObjectValue( {
							id: zFunctionCallFunction.id,
							value: zid
						} );
					}
				} );
		},
		findArgumentId: function ( key ) {
			return this.findKeyInArray( key, this.zobject ).id;
		},
		callFunctionHandler: function () {
			var ZfunctionObject = this.getZObjectAsJsonById( this.zobjectId );

			// remove when the orchestrator is able to fetch custom function directly fdrom the DB

			if ( !this.zImplementationLanguages ) {
				this.callZFunction( { zobject: ZfunctionObject } );
			} else {
				// we replace the Reference to a function to the actual function
				// using OO.copy to get a deep copy of the function ZObject.
				ZfunctionObject[ Constants.Z_FUNCTION_CALL_FUNCTION ] =
					OO.copy( this.selectedFunction[ Constants.Z_PERSISTENTOBJECT_VALUE ] );

				// Remove labels, as the schemata is throwing errors on this.
				ZfunctionObject.Z7K1.Z8K1.forEach( function ( thing ) {
					thing.Z17K3.Z12K1 = [];
				} );

				this.callZFunction( { zobject: ZfunctionObject } );
			}
		}
	} ),
	watch: {
		zFunctionArguments: function ( value ) {
			var self = this;
			value.forEach( function ( arg ) {
				// Don't perform this action if the key already exists
				if ( self.findKeyInArray( arg.key, self.zobject ) ) {
					return;
				}
				self.addZObject( {
					key: arg.key,
					value: 'object',
					parent: self.zobjectId
				} )
					.then( function ( objectId ) {
						var payload = {
							id: objectId,
							type: arg.type
						};
						self.changeType( payload );
					} );
			} );
		}
	},
	beforeCreate: function () {
		this.$options.components[ 'z-object' ] = require( '../ZObject.vue' );
	},
	mounted: function () {
		this.fetchZKeys( [ Constants.Z_FUNCTION_CALL, this.zFunctionId ] );
	}
};
</script>
