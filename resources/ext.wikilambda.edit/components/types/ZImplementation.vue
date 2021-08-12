<template>
	<!--
		WikiLambda Vue component for ZImplementation objects.

		@copyright 2020–2021 WikiLambda team; see AUTHORS.txt
		@license MIT
	-->
	<div>
		<div>
			{{ functionLabel }}:{{ ' ' }}
			<z-object-selector
				v-if="!viewmode"
				:type="Constants.Z_FUNCTION"
				:placeholder="$i18n( 'wikilambda-function-typeselector-label' )"
				:selected-id="zFunction.value"
				@input="updateZFunctionType"
			></z-object-selector>
			<template v-else>
				<z-reference
					v-if="zFunction.value"
					:zobject-key="zFunction.value"
					:readonly="true"
				></z-reference>
				<span v-else>{{ $i18n( 'wikilambda-invalidzobject' ) }}</span>
			</template>
		</div>
		<div v-if="!viewmode">
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
			:arguments="getZargumentsString"
		></z-function-signature>
		<z-code
			v-if="implMode === 'code'"
			:zobject-id="zCodeId"
		></z-code>
		<z-object
			v-if="implMode === 'composition'"
			:zobject-id="zCompositionId"
			:persistent="false"
		></z-object>
		<z-function-tester-report
			:z-function-id="zFunction.value || ''"
			:z-implementation-id="zImplementationId"
		></z-function-tester-report>
	</div>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions,
	typeUtils = require( '../../mixins/typeUtils.js' ),
	ZCode = require( './ZCode.vue' ),
	ZObjectSelector = require( '../ZObjectSelector.vue' ),
	ZFunctionSignature = require( '../ZFunctionSignature.vue' ),
	ZObjectKey = require( '../ZObjectKey.vue' ),
	ZReference = require( './ZReference.vue' ),
	ZFunctionTesterReport = require( '../function/ZFunctionTesterReport.vue' );

module.exports = {
	components: {
		'z-code': ZCode,
		'z-object-selector': ZObjectSelector,
		'z-function-signature': ZFunctionSignature,
		'z-object-key': ZObjectKey,
		'z-reference': ZReference,
		'z-function-tester-report': ZFunctionTesterReport
	},
	mixins: [ typeUtils ],
	provide: {
		allowArgRefMode: true
	},
	inject: {
		viewmode: { default: false }
	},
	props: {
		zobjectId: {
			type: Number,
			required: true
		}
	},
	data: function () {
		return {
			implMode: null
		};
	},
	computed: $.extend( {},
		mapGetters( [
			'getZObjectById',
			'getZObjectChildrenById',
			'getZkeyLabels',
			'getZkeys',
			'getNestedZObjectById',
			'getZarguments',
			'getZargumentsString'
		] ),
		{
			Constants: function () {
				return Constants;
			},
			zobject: function () {
				return this.getZObjectChildrenById( this.zobjectId );
			},
			zImplementationId: function () {
				return this.getNestedZObjectById( this.getZObjectById( this.zobjectId ).parent, [
					Constants.Z_PERSISTENTOBJECT_ID,
					Constants.Z_REFERENCE_ID
				] ).value;
			},
			zFunction: function () {
				return this.findKeyInArray(
					[ Constants.Z_REFERENCE_ID, Constants.Z_STRING_VALUE ],
					this.getZObjectChildrenById(
						this.findKeyInArray( Constants.Z_IMPLEMENTATION_FUNCTION, this.zobject ).id
					)
				);
			},
			zCodeId: function () {
				return this.findKeyInArray( Constants.Z_IMPLEMENTATION_CODE, this.zobject ).id;
			},
			zCompositionId: function () {
				return this.findKeyInArray( Constants.Z_IMPLEMENTATION_COMPOSITION, this.zobject ).id;
			},
			zCodeLanguage: function () {
				return this.getNestedZObjectById( this.zCodeId, [
					Constants.Z_CODE_LANGUAGE,
					Constants.Z_PROGRAMMING_LANGUAGE_CODE,
					Constants.Z_STRING_VALUE
				] ).value;
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
				return Object.keys( this.getZarguments ).map( function ( arg ) {
					return this.getZarguments[ arg ];
				}.bind( this ) );
			}
		}
	),
	methods: $.extend( {},
		mapActions( [
			'fetchZKeys',
			'setZObjectValue',
			'initializeZCodeFunction',
			'setZImplementationType',
			'setAvailableZArguments'
		] ),
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
			if ( typeof this.zCodeLanguage !== 'undefined' ) {
				this.initializeZCodeFunction( {
					zCodeId: this.zCodeId,
					language: this.zCodeLanguage,
					functionId: this.zFunction.value,
					argumentList: this.selectedFunctionArguments
				} );
			}
		},
		implMode: function ( mode, prevMode ) {
			if ( !prevMode ) {
				return;
			}

			this.setZImplementationType( {
				zobjectId: this.zobjectId,
				mode: mode
			} );
		},
		zFunction: {
			immediate: true,
			handler: function () {
				if ( this.zFunction.value ) {
					this.fetchZKeys( [ this.zFunction.value ] );
				}
			}
		},
		selectedFunctionJson: {
			immediate: true,
			handler: function () {
				if ( this.selectedFunctionJson ) {
					var zKeys = [];

					this.selectedFunctionJson[
						Constants.Z_PERSISTENTOBJECT_VALUE ][
						Constants.Z_FUNCTION_ARGUMENTS ]
						.forEach( function ( argument ) {
							zKeys.push( argument[ Constants.Z_ARGUMENT_TYPE ] );
						} );

					zKeys.push( this.selectedFunctionJson[
						Constants.Z_PERSISTENTOBJECT_VALUE ][
						Constants.Z_FUNCTION_RETURN_TYPE ] );

					this.fetchZKeys( zKeys ).then( function () {
						this.setAvailableZArguments( this.zFunction.value );
					}.bind( this ) );
				}
			}
		}
	},
	beforeCreate: function () {
		this.$options.components[ 'z-object' ] = require( '../ZObject.vue' );
	},
	mounted: function () {
		if ( this.zCodeId ) {
			this.implMode = 'code';
		} else if ( this.zCompositionId ) {
			this.implMode = 'composition';
		}
	}
};
</script>
