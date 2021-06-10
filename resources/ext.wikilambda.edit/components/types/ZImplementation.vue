<template>
	<!--
		WikiLambda Vue component for ZImplementation objects.

		@copyright 2020–2021 WikiLambda team; see AUTHORS.txt
		@license MIT
	-->
	<div>
		<div>
			{{ functionLabel }}: <z-object-selector
				:type="Constants.Z_FUNCTION"
				:placeholder="$i18n( 'wikilambda-function-typeselector-label' )"
				:selected-id="zFunction.value"
				@input="updateZFunctionType"
			></z-object-selector>
		</div>
		<div>
			<select v-model="implMode">
				<option value="code">
					{{ $i18n( 'wikilambda-implementation-selector-code' ) }}
				</option>
				<option value="composition">
					{{ $i18n( 'wikilambda-implementation-selector-composition' ) }}
				</option>
			</select>
		</div>
		<z-function-signature
			:return-type="selectedFunctionReturnType"
			:arguments="selectedFunctionArgumentString"
		></z-function-signature>
		<z-code
			v-if="implMode === 'code'"
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
	data: function () {
		return {
			implMode: 'code'
		};
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
			zCodeLanguage: function () {
				return this.findKeyInArray(
					Constants.Z_STRING_VALUE,
					this.getZObjectChildrenById(
						this.findKeyInArray(
							Constants.Z_PROGRAMMING_LANGUAGE_CODE,
							this.getZObjectChildrenById(
								this.findKeyInArray(
									Constants.Z_CODE_LANGUAGE,
									this.getZObjectChildrenById( this.zCodeId )
								).id
							)
						).id
					)
				).value;
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
						.map( function ( argument ) {
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

							return {
								label: userLangLabel,
								zid: argument[ Constants.Z_ARGUMENT_KEY ],
								key: key,
								type: type
							};
						} );
				}

				return [];
			},
			selectedFunctionArgumentString: function () {
				return this.selectedFunctionArguments
					.reduce( function ( argumentString, argument ) {
						var key = argument.key,
							type = argument.type;

						return argumentString.length ?
							argumentString + ', ' + key + type :
							argumentString + key + type;
					}, '' );
			}
		}
	),
	methods: $.extend( {},
		mapActions( [ 'fetchZKeys', 'setZObjectValue', 'initializeZCodeFunction' ] ),
		{
			updateZFunctionType: function ( val ) {
				this.setZObjectValue( {
					id: this.zFunction.id,
					value: val
				} );
			}
		}
	),
	watch: {
		zCodeLanguage: function () {
			this.initializeZCodeFunction( {
				zCodeId: this.zCodeId,
				language: this.zCodeLanguage,
				functionId: this.zFunction.value,
				argumentList: this.selectedFunctionArguments
			} );
		}
	}
};
</script>
