<template>
	<!--
		WikiLambda Vue component for ZFunction objects.

		@copyright 2020–2021 WikiLambda team; see AUTHORS.txt
		@license MIT
	-->
	<div>
		<div class="ext-wikilambda-function-definition">
			{{ scriptFunctionArguments }}: {{
				getZkeyLabels[ zReturnType.value ] || 'Any'
			}}
		</div>
		<div>
			{{ $i18n( 'wikilambda-return-typeselector-label' ) }}:
			<z-object-selector
				:type="Constants.Z_TYPE"
				:placeholder="$i18n( 'wikilambda-return-typeselector-label' )"
				:selected-id="zReturnType.value"
				@input="updateZReturnType"
			></z-object-selector>
		</div>
		<z-argument-list
			:zobject-id="zArgumentId"
		></z-argument-list>
		<z-implementation-list
			:zobject-id="zImplementationId"
		></z-implementation-list>
	</div>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions,
	ZArgumentList = require( './ZArgumentList.vue' ),
	ZImplementationList = require( './ZImplementationList.vue' ),
	ZObjectSelector = require( '../ZObjectSelector.vue' ),
	typeUtils = require( '../../mixins/typeUtils.js' );

module.exports = {
	components: {
		'z-argument-list': ZArgumentList,
		'z-object-selector': ZObjectSelector,
		'z-implementation-list': ZImplementationList
	},
	mixins: [ typeUtils ],
	props: {
		zobjectId: {
			type: Number,
			required: true
		}
	},
	computed: $.extend( {},
		mapGetters( [
			'getZObjectChildrenById',
			'getNextObjectId',
			'getZObjectTypeById',
			'getZkeyLabels',
			'getZObjectAsJsonById',
			'zLang'
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
			zImplementationId: function () {
				return this.zobject.filter( function ( item ) {
					return item.key === Constants.Z_FUNCTION_IMPLEMENTATIONS;
				} )[ 0 ].id;
			},
			zImplementationList: function () {
				return this.getZObjectChildrenById( this.zImplementationId );
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
						argumentLabels = self.getZObjectAsJsonById(
							self.findKeyInArray(
								Constants.Z_MULTILINGUALSTRING_VALUE,
								self.getZObjectChildrenById(
									self.findKeyInArray(
										Constants.Z_ARGUMENT_LABEL,
										argumentChildren
									).id
								)
							).id,
							true
						),
						userLangLabel = argumentLabels.filter( function ( label ) {
							return label[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ] === self.zLang;
						} )[ 0 ] || argumentLabels[ 0 ],
						type = self.getZkeyLabels[ argumentType.value ],
						key = userLangLabel ?
							( userLangLabel[ Constants.Z_MONOLINGUALSTRING_VALUE ] ) + ': ' :
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
