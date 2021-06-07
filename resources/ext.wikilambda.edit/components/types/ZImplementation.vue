<template>
	<!--
		WikiLambda Vue component for ZImplementation objects.

		@copyright 2020–2021 WikiLambda team; see AUTHORS.txt
		@license MIT
	-->
	<div>
		{{ functionLabel }}: <z-object-selector
			:type="Constants.Z_FUNCTION"
			:placeholder="$i18n( 'wikilambda-function-typeselector-label' )"
			:selected-id="zFunction.value"
			@input="updateZFunctionType"
		></z-object-selector>
		<z-function-signature
			:return-type="selectedFunctionReturnType"
			:arguments="selectedFunctionArguments"
		></z-function-signature>
		<z-code
			:zobject-id="zCodeId"
		></z-code>
	</div>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions,
	typeUtils = require( '../../mixins/typeUtils.js' ),
	ZCode = require( './ZCode.vue' ),
	ZObjectSelector = require( '../ZObjectSelector.vue' ),
	ZFunctionSignature = require( '../ZFunctionSignature.vue' );

module.exports = {
	components: {
		'z-code': ZCode,
		'z-object-selector': ZObjectSelector,
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
		mapGetters( [ 'getZObjectChildrenById', 'getZkeyLabels', 'getZkeys' ] ),
		{
			Constants: function () {
				return Constants;
			},
			zobject: function () {
				return this.getZObjectChildrenById( this.zobjectId );
			},
			zFunction: function () {
				return this.findKeyInArray(
					Constants.Z_REFERENCE_ID,
					this.getZObjectChildrenById(
						this.findKeyInArray( Constants.Z_IMPLEMENTATION_FUNCTION, this.zobject ).id
					)
				);
			},
			zCodeId: function () {
				return this.findKeyInArray( Constants.Z_IMPLEMENTATION_CODE, this.zobject ).id;
			},
			functionLabel: function () {
				return this.getZkeyLabels[ Constants.Z_IMPLEMENTATION_FUNCTION ];
			},
			selectedFunctionJson: function () {
				return this.getZkeys[ this.zFunction.value ];
			},
			selectedFunctionReturnType: function () {
				if ( this.selectedFunctionJson ) {
					return this.getZkeyLabels[ this.selectedFunctionJson[
						Constants.Z_PERSISTENTOBJECT_VALUE ][
						Constants.Z_FUNCTION_RETURN_TYPE ] ];
				}
				return;
			},
			selectedFunctionArguments: function () {
				var self = this;

				if ( this.selectedFunctionJson ) {
					return this.selectedFunctionJson[
						Constants.Z_PERSISTENTOBJECT_VALUE ][
						Constants.Z_FUNCTION_ARGUMENTS ]
						.reduce( function ( argumentString, argument ) {
							var argumentLabels = argument[ Constants.Z_ARGUMENT_LABEL ][
									Constants.Z_MULTILINGUALSTRING_VALUE ],
								userLang = argumentLabels.filter( function ( label ) {
									return label[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ] === self.getUserZlangZID ||
								label[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ][ Constants.Z_STRING_VALUE ] ===
									self.getUserZlangZID;
								} )[ 0 ] || argumentLabels[ 0 ],
								userLangLabel = userLang[ Constants.Z_MONOLINGUALSTRING_VALUE ],
								type = self.getZkeyLabels[ argument[ Constants.Z_ARGUMENT_TYPE ] ],
								key = userLangLabel ?
									( userLangLabel ) + ': ' :
									'';

							return argumentString.length ?
								argumentString + ', ' + key + type :
								argumentString + key + type;
						}, '' );
				}

				return;
			}
		}
	),
	methods: $.extend( {},
		mapActions( [ 'fetchZKeys', 'setZObjectValue' ] ),
		{
			updateZFunctionType: function ( val ) {
				this.setZObjectValue( {
					id: this.zFunction.id,
					value: val
				} );
			}
		}
	)
};
</script>
