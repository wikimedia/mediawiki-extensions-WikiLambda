<template>
	<!--
		WikiLambda Vue interface module for generic ZObject manipulation.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div :class="classZObject">
		<!-- Depending on the type, it will render a different component -->
		<z-object-selector
			v-if="type === Constants.Z_OBJECT"
			:type="Constants.Z_TYPE"
			:return-type="Constants.Z_TYPE"
			:placeholder="$i18n( 'wikilambda-argument-typeselector-label' ).text()"
			@input="changeZObjectType"
		></z-object-selector>

		<component
			:is="determineComponent"
			v-else-if="type !== undefined"
			:zobject-id="zobjectId"
			:type="type"
			:persistent="persistent"
			:readonly="readonly"
			:parent-type="parentType"
		></component>
	</div>
</template>

<script>
var Constants = require( '../Constants.js' ),
	typeUtils = require( '../mixins/typeUtils.js' ),
	ZObjectGeneric = require( './ZObjectGeneric.vue' ),
	ZList = require( './types/ZList.vue' ),
	ZTypedList = require( './types/ZTypedList.vue' ),
	ZMultilingualString = require( './types/ZMultilingualString.vue' ),
	ZReference = require( './types/ZReference.vue' ),
	ZString = require( './types/ZString.vue' ),
	ZCode = require( './types/ZCode.vue' ),
	ZArgument = require( './types/ZArgument.vue' ),
	ZFunctionCall = require( './types/ZFunctionCall.vue' ),
	ZObjectSelector = require( './ZObjectSelector.vue' ),
	ZFunction = require( './types/ZFunction.vue' ),
	ZBoolean = require( './types/ZBoolean.vue' ),
	ZImplementation = require( './types/ZImplementation.vue' ),
	ZArgumentReference = require( './types/ZArgumentReference.vue' ),
	ZTester = require( './types/ZTester.vue' ),
	ZPersistentObject = require( './types/ZPersistentObject.vue' ),
	ZCharacter = require( './types/ZCharacter.vue' ),
	ZResponseEnvelope = require( './types/ZResponseEnvelope.vue' ),
	ZType = require( './types/ZType.vue' ),
	ZTypedPair = require( './types/ZTypedPair.vue' ),
	ZTypedMap = require( './types/ZTypedMap.vue' ),
	ZFunctionCallToType = require( './types/ZFunctionCallToType.vue' ),
	ZKey = require( './types/ZKey.vue' ),
	mapActions = require( 'vuex' ).mapActions,
	mapGetters = require( 'vuex' ).mapGetters;

// @vue/component
module.exports = exports = {
	name: 'z-object',
	components: {
		'z-list': ZList,
		'z-multilingual-string': ZMultilingualString,
		'z-reference': ZReference,
		'z-string': ZString,
		'z-object-generic': ZObjectGeneric,
		'z-code': ZCode,
		'z-argument': ZArgument,
		'z-function-call': ZFunctionCall,
		'z-object-selector': ZObjectSelector,
		'z-function': ZFunction,
		'z-boolean': ZBoolean,
		'z-implementation': ZImplementation,
		'z-argument-reference': ZArgumentReference,
		'z-tester': ZTester,
		'z-persistentobject': ZPersistentObject,
		'z-character': ZCharacter,
		'z-responseenvelope': ZResponseEnvelope,
		'z-type': ZType,
		'z-typed-list': ZTypedList,
		'z-typed-pair': ZTypedPair,
		'z-typed-map': ZTypedMap,
		'z-function-call-to-type': ZFunctionCallToType,
		'z-key': ZKey
	},
	mixins: [ typeUtils ],
	props: {
		zobjectId: {
			type: Number,
			required: false,
			default: 0
		},
		persistent: {
			type: Boolean,
			required: true
		},
		readonly: {
			type: Boolean,
			default: false
		},
		parentType: {
			type: String,
			required: false,
			default: ''
		}
	},
	data: function () {
		return {
			Constants: Constants
		};
	},
	computed: $.extend( mapGetters( [ 'getZObjectTypeById' ] ),
		{
			type: function () {
				return this.getZObjectTypeById( this.zobjectId );
			},
			isInlineComponent: function () {
				return [
					Constants.Z_STRING,
					Constants.Z_REFERENCE,
					Constants.Z_BOOLEAN,
					Constants.Z_ARGUMENT_REFERENCE,
					Constants.Z_CHARACTER
				].indexOf( this.type ) !== -1;
			},
			classZObject: function () {
				return {
					'ext-wikilambda-zobject': true,
					'ext-wikilambda-zobject-inline': this.isInlineComponent
				};
			},
			determineComponent: function () {
				switch ( this.type ) {
					case Constants.Z_PERSISTENTOBJECT:
						return 'z-persistentobject';
					case Constants.Z_STRING:
						return 'z-string';
					case Constants.Z_REFERENCE:
						return 'z-reference';
					case Constants.Z_MULTILINGUALSTRING:
						return 'z-multilingual-string';
					case Constants.Z_LIST:
						return 'z-list';
					case Constants.Z_TYPED_LIST:
						return 'z-typed-list';
					case Constants.Z_TYPED_PAIR:
						return 'z-typed-pair';
					case Constants.Z_TYPED_MAP:
						return 'z-typed-map';
					case Constants.Z_CODE:
						return 'z-code';
					case Constants.Z_ARGUMENT:
						return 'z-argument';
					case Constants.Z_FUNCTION_CALL:
						return 'z-function-call';
					case Constants.Z_FUNCTION:
						// Prevent rendering the ZFunction component is not the root element
						if ( this.parentType === Constants.Z_PERSISTENTOBJECT ) {
							return 'z-function';
						} else {
							return 'z-object-generic';
						}
					case Constants.Z_BOOLEAN:
						return 'z-boolean';
					case Constants.Z_IMPLEMENTATION:
						return 'z-implementation';
					case Constants.Z_ARGUMENT_REFERENCE:
						return 'z-argument-reference';
					case Constants.Z_NOTHING:
						return 'z-nothing';
					case Constants.Z_TESTER:
						return 'z-tester';
					case Constants.Z_CHARACTER:
						return 'z-character';
					case Constants.Z_RESPONSEENVELOPE:
						return 'z-responseenvelope';
					case Constants.Z_TYPE:
						return 'z-type';
					case Constants.Z_FUNCTION_CALL_TO_TYPE:
						return 'z-function-call-to-type';
					case Constants.Z_KEY:
						return 'z-key';
					default:
						return 'z-object-generic';
				}
			}
		} ),
	methods: $.extend( {},
		mapActions( [ 'fetchZKeys', 'changeType' ] ),
		{
			changeZObjectType: function ( zid ) {
				this.changeType( {
					id: this.zobjectId,
					type: zid
				} );
			}
		}
	),
	mounted: function () {
		this.fetchZKeys( [ this.type ] );
	}
};
</script>

<style lang="less">
.ext-wikilambda-zobject {
	display: block;

	.ext-wikilambda-zobject-inline {
		display: inline-block;
	}
}
</style>
