<template>
	<!--
		WikiLambda Vue component for ZFunctionCall objects.

		@copyright 2020–2021 WikiLambda team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-function-call-block">
		{{ zFunctionCallKeyLabels[ Constants.Z_FUNCTION_CALL_FUNCTION ] }}:
		<z-object-selector
			v-if="!selectedFunction"
			:type="Constants.Z_FUNCTION"
			:placeholder="$i18n( 'wikilambda-function-typeselector-label' )"
			:selected-id="zFunctionId"
			@input="typeHandler"
		></z-object-selector>
		<template v-else>
			<button
				:title="$i18n( 'wikilambda-editor-zobject-removekey-tooltip' )"
				@click="typeHandler"
			>
				{{ $i18n( 'wikilambda-editor-removeitem' ) }}
			</button>
			<z-reference
				:zobject-key="selectedFunction[ Constants.Z_PERSISTENTOBJECT_ID ]"
				search-type="Z8"
				:readonly="true"
			></z-reference>
		</template>
		<ul>
			<li v-for="argument in zFunctionArguments" :key="argument.key">
				{{ argument.label }}:
				<z-object-key
					:zobject-id="findArgumentId(argument.key)"
					:persistent="false"
					:parent-type="Constants.Z_FUNCTION_CALL"
					:z-key="argument.key"
				></z-object-key>
			</li>
		</ul>
		<button @click="callFunctionHandler">
			<label> {{ $i18n( 'wikilambda-call-function' ) }} </label>
		</button>
		<div v-if="resultZObject || orchestrating" class="ext-wikilambda-orchestrated-result">
			<template v-if="resultZObject">
				<span>{{ $i18n( 'wikilambda-orchestrated' ) }}</span>
				<z-key-mode-selector
					:mode="orchestratedMode"
					parent-type="Z7"
					:available-modes="displayModes"
					@change="orchestratedMode = $event"
				></z-key-mode-selector>
				<div>
					<z-object-json
						v-if="orchestratedMode === Constants.Z_KEY_MODES.JSON"
						:readonly="true"
						:zobject-id="resultId"
					></z-object-json>
					<z-object-key
						v-else
						:zobject-id="resultId"
						:parent-type="Constants.Z_PAIR"
						:readonly="true"
					></z-object-key>
				</div>
			</template>
			<template v-else-if="orchestrating">
				<em>{{ $i18n( 'wikilambda-orchestrated-loading' ) }}</em>
			</template>
		</div>
	</div>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	mapActions = require( 'vuex' ).mapActions,
	mapGetters = require( 'vuex' ).mapGetters,
	ZObjectSelector = require( '../ZObjectSelector.vue' ),
	ZObjectJson = require( '../ZObjectJson.vue' ),
	ZObjectKey = require( '../ZObjectKey.vue' ),
	ZKeyModeSelector = require( '../ZKeyModeSelector.vue' ),
	ZReference = require( './ZReference.vue' ),
	typeUtils = require( '../../mixins/typeUtils.js' );

module.exports = {
	components: {
		'z-object-selector': ZObjectSelector,
		'z-object-json': ZObjectJson,
		'z-object-key': ZObjectKey,
		'z-key-mode-selector': ZKeyModeSelector,
		'z-reference': ZReference
	},
	mixins: [ typeUtils ],
	props: {
		zobjectId: {
			type: Number,
			required: true
		}
	},
	data: function () {
		return {
			orchestratedMode: Constants.Z_KEY_MODES.LITERAL,
			resultId: null,
			orchestrating: false
		};
	},
	computed: $.extend( mapGetters( {
		getZObjectChildrenById: 'getZObjectChildrenById',
		getZObjectTypeById: 'getZObjectTypeById',
		getZkeys: 'getZkeys',
		getZObjectAsJsonById: 'getZObjectAsJsonById'
	} ), {
		zobject: function () {
			return this.getZObjectChildrenById( this.zobjectId );
		},
		resultZObject: function () {
			return this.getZObjectAsJsonById( this.resultId );
		},
		Constants: function () {
			return Constants;
		},
		zFunctionId: function () {
			var func = this.findKeyInArray( Constants.Z_FUNCTION_CALL_FUNCTION, this.zobject );

			if ( func.value === 'object' ) {
				return this.findKeyInArray(
					[ Constants.Z_REFERENCE_ID, Constants.Z_STRING_VALUE ],
					this.getZObjectChildrenById( func.id )
				).value;
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
		},
		displayModes: function () {
			return Constants.Z_MODE_SELECTOR_MODES.filter( function ( mode ) {
				return [ Constants.Z_KEY_MODES.LITERAL, Constants.Z_KEY_MODES.JSON ].indexOf( mode.key ) > -1;
			} );
		}
	} ),
	methods: $.extend( mapActions( [
		'fetchZKeys',
		'addZObject',
		'callZFunction',
		'changeType',
		'initializeResultId',
		'injectZObject',
		'resetZObject',
		'removeZObject'
	] ), {
		typeHandler: function ( zid ) {
			var zFunctionCallFunction = this.findKeyInArray( Constants.Z_FUNCTION_CALL_FUNCTION, this.zobject ),
				argumentKeys = this.zFunctionArguments.map( function ( arg ) {
					return arg.key;
				} );

			this.injectZObject( {
				zobject: zid,
				key: 'Z7K1',
				id: zFunctionCallFunction.id,
				parent: this.zobjectId
			} ).then( function () {
				this.zobject.forEach( function ( row ) {
					if ( argumentKeys.indexOf( row.key ) > -1 ) {
						this.removeZObject( row.id );
					}
				}.bind( this ) );
			}.bind( this ) );
		},
		findArgumentId: function ( key ) {
			return this.findKeyInArray( key, this.zobject ).id;
		},
		callFunctionHandler: function () {
			var self = this,
				ZfunctionObject = this.getZObjectAsJsonById( this.zobjectId );

			this.orchestrating = true;

			this.initializeResultId( this.resultId )
				.then( function ( resultId ) {
					self.resultId = resultId;

					return self.callZFunction( { zobject: ZfunctionObject, resultId: self.resultId } );
				} )
				.then( function () {
					self.orchestrating = false;
				} );
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
		},
		zFunctionId: function () {
			if ( this.zFunctionId ) {
				this.fetchZKeys( [ this.zFunctionId ] );
			}
		}
	},
	mounted: function () {
		this.fetchZKeys( [ Constants.Z_FUNCTION_CALL, this.zFunctionId ] );
	}
};
</script>

<style lang="less">
.ext-wikilambda-function-call-block {
	background: rgba( 0, 0, 0, 0.03 );
	outline: 1px dotted #888;
	margin: 5px;
	padding: 5px;
}

.ext-wikilambda-orchestrated-result {
	display: block;
	padding: 1em;
	background: #eef;
	outline: 1px dashed #888;
}

.ext-wikilambda-orchestrated-result > span {
	display: inline-block;
	vertical-align: top;
	margin-top: 5px;
}
</style>
