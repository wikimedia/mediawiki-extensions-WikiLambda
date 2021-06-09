<template>
	<!--
		WikiLambda Vue component for ZFunction objects.

		@copyright 2020–2021 WikiLambda team; see AUTHORS.txt
		@license MIT
	-->
	<div>
		<z-function-signature
			:arguments="scriptFunctionArguments"
			:return-type="getZkeyLabels[ zReturnType.value ]"
		></z-function-signature>
		<div>
			{{ zReturnTypeLabel }}:
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
	typeUtils = require( '../../mixins/typeUtils.js' ),
	ZFunctionSignature = require( '../ZFunctionSignature.vue' );

module.exports = {
	components: {
		'z-argument-list': ZArgumentList,
		'z-object-selector': ZObjectSelector,
		'z-implementation-list': ZImplementationList,
		'z-function-signature': ZFunctionSignature
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
			'getUserZlangZID'
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
						[ Constants.Z_REFERENCE_ID, Constants.Z_STRING_VALUE ],
						this.getZObjectChildrenById( returnType.id )
					);
				}

				return returnType;
			},
			zReturnTypeLabel: function () {
				return this.getZkeyLabels[ Constants.Z_FUNCTION_RETURN_TYPE ];
			},
			scriptFunctionArguments: function () {
				var zobject = this.zArgumentList,
					self = this,
					functionArgumentsString = '';

				function getArgumentType( argumentChildren ) {
					var argumentType = self.findKeyInArray( Constants.Z_ARGUMENT_TYPE, argumentChildren );

					if ( !argumentType ) {
						return 'Any';
					}

					if ( argumentType.value === 'object' ) {
						return self.findKeyInArray(
							[ Constants.Z_REFERENCE_ID, Constants.Z_STRING_VALUE ],
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
						userLang = argumentLabels.filter( function ( label ) {
							return label[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ] === self.getUserZlangZID ||
								label[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ][ Constants.Z_STRING_VALUE ] ===
									self.getUserZlangZID;
						} )[ 0 ] || argumentLabels[ 0 ],
						userLangLabel = typeof userLang[ Constants.Z_MONOLINGUALSTRING_VALUE ] === 'object' ?
							userLang[ Constants.Z_MONOLINGUALSTRING_VALUE ][ Constants.Z_STRING_VALUE ] :
							userLang[ Constants.Z_MONOLINGUALSTRING_VALUE ],
						type = self.getZkeyLabels[ argumentType.value ],
						key = userLangLabel ?
							( userLangLabel ) + ': ' :
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
