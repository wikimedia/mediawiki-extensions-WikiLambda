<template>
	<div>
		<div class="ext-wikilambda-function-definition">
			{{ scriptFunctionArguments }}: {{
				getZkeyLabels[ zReturnType.value ] || 'Any'
			}}
		</div>
		<div>
			{{ $i18n( 'wikilambda-return-typeselector-label' ) }}:
			<z-object-selector
				:type="Constants.Z_FUNCTION"
				:placeholder="$i18n( 'wikilambda-return-typeselector-label' )"
				:selected-id="zReturnType.value"
				:viewmode="viewmode"
				@input="updateZReturnType"
			></z-object-selector>
		</div>
		<z-argument-list
			:zobject-id="zArgumentId"
			:viewmode="viewmode"
		></z-argument-list>
	</div>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions,
	ZArgumentList = require( './ZArgumentList.vue' ),
	ZObjectSelector = require( '../ZObjectSelector.vue' ),
	typeUtils = require( '../../mixins/typeUtils.js' );

module.exports = {
	components: {
		'z-argument-list': ZArgumentList,
		'z-object-selector': ZObjectSelector
	},
	mixins: [ typeUtils ],
	props: {
		zobjectId: {
			type: Number,
			required: true
		},
		viewmode: {
			type: Boolean,
			default: false
		}
	},
	computed: $.extend( {},
		mapGetters( [
			'getZObjectChildrenById',
			'getNextObjectId',
			'getZObjectTypeById',
			'getZkeyLabels'
		] ),
		{
			Constants: function () {
				return Constants;
			},
			zobject: function () {
				return this.getZObjectChildrenById( this.zobjectId );
			},
			zArgumentId: function () {
				return this.zobject.filter( function ( item ) {
					return item.key === Constants.Z_FUNCTION_ARGUMENTS;
				} )[ 0 ].id;
			},
			zArgumentList: function () {
				return this.getZObjectChildrenById( this.zArgumentId );
			},
			zReturnType: function () {
				var returnType = this.findKeyInArray( Constants.Z_FUNCTION_RETURN_TYPE, this.zobject );

				if ( returnType.value === 'object' ) {
					return this.findKeyInArray(
						Constants.Z_REFERENCE_ID,
						this.getZObjectChildrenById( returnType.id )
					);
				}

				return returnType;
			},
			scriptFunctionArguments: function () {
				var zobject = this.zArgumentList,
					self = this,
					functionArgumentsString = '( ';

				function getArgumentType( argumentChildren ) {
					var argumentType = argumentChildren.filter( function ( item ) {
						return item.key === Constants.Z_ARGUMENT_TYPE;
					} )[ 0 ];

					if ( argumentType.value === 'object' ) {
						return self.findKeyInArray(
							Constants.Z_REFERENCE_ID,
							self.getZObjectChildrenById( argumentType.id )
						);
					}

					return argumentType;
				}

				zobject.forEach( function ( argument, index ) {
					var argumentChildren = self.getZObjectChildrenById( argument.id ),
						argumentType = getArgumentType( argumentChildren ),
						argumentKey = argumentChildren.filter( function ( item ) {
							return item.key === Constants.Z_ARGUMENT_KEY;
						} )[ 0 ],
						argumentKeyChildren = self.getZObjectChildrenById( argumentKey.id ),
						argumentId = argumentKeyChildren[ 1 ].value,
						type = self.getZkeyLabels[ argumentType.value ],
						key = argumentId ?
							( argumentId ) + ': ' :
							'';

					if ( type === undefined ) {
						type = 'Any';
					}

					functionArgumentsString += key + type;
					if ( zobject && zobject.length - 1 === index ) {
						functionArgumentsString += ' ';
					} else {
						functionArgumentsString += ', ';
					}
				} );
				functionArgumentsString += ')';
				return functionArgumentsString;
			}
		}
	),
	methods: $.extend( mapActions( [ 'fetchZKeys', 'setZObjectValue' ] ), {
		updateZReturnType: function ( type ) {
			var payload = {
				id: this.zReturnType.id,
				value: type
			};

			this.setZObjectValue( payload );
		}
	} ),
	mounted: function () {

		var zids = [ Constants.Z_ARGUMENT ];
		if ( this.zReturnType && this.zReturnType.value ) {
			zids.push( this.zReturnType.value );
		}
		this.fetchZKeys( zids );
	}
};
</script>

<style lang="less">
.ext-wikilambda-function-definition {
	font-family: 'Courier New', 'Courier', monospace;
	padding: 1em;
	margin-bottom: 1em;
	background: #efe;
	outline: 1px dashed #888;
}
</style>
