<template>
	<!--
		WikiLambda Vue interface module for generic ZObject manipulation.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div :class="classZObject">
		<!-- Depending on the type, it will render a different component -->
		<wl-z-object-selector
			v-if="type === Constants.Z_OBJECT"
			:type="Constants.Z_TYPE"
			:return-type="Constants.Z_TYPE"
			:placeholder="$i18n( 'wikilambda-argument-typeselector-label' ).text()"
			@input="changeZObjectType"
		></wl-z-object-selector>

		<component
			:is="determineComponent"
			v-else-if="type !== undefined"
			:zobject-id="zobjectId"
			:type="type"
			:persistent="persistent"
			:readonly="readonly"
			:parent-type="parentType"
			:search-type="referenceType"
		></component>
	</div>
</template>

<script>
var Constants = require( '../Constants.js' ),
	typeUtils = require( '../mixins/typeUtils.js' ),
	ZObjectGeneric = require( './ZObjectGeneric.vue' ),
	ZTypedList = require( './main-types/ZTypedList.vue' ),
	ZMultilingualString = require( './main-types/ZMultilingualString.vue' ),
	ZReference = require( './main-types/ZReference.vue' ),
	ZString = require( './main-types/ZString.vue' ),
	ZCode = require( './main-types/ZCode.vue' ),
	ZArgument = require( './main-types/ZArgument.vue' ),
	ZFunctionCall = require( './main-types/ZFunctionCall.vue' ),
	ZObjectSelector = require( './ZObjectSelector.vue' ),
	ZFunction = require( './main-types/ZFunction.vue' ),
	ZBoolean = require( './main-types/ZBoolean.vue' ),
	ZImplementation = require( './main-types/ZImplementation.vue' ),
	ZArgumentReference = require( './main-types/ZArgumentReference.vue' ),
	ZTester = require( './main-types/ZTester.vue' ),
	ZPersistentObject = require( './main-types/ZPersistentObject.vue' ),
	ZCharacter = require( './main-types/ZCharacter.vue' ),
	ZResponseEnvelope = require( './main-types/ZResponseEnvelope.vue' ),
	ZType = require( './main-types/ZType.vue' ),
	ZTypedPair = require( './main-types/ZTypedPair.vue' ),
	ZTypedMap = require( './main-types/ZTypedMap.vue' ),
	ZFunctionCallToType = require( './main-types/ZFunctionCallToType.vue' ),
	ZKey = require( './main-types/ZKey.vue' ),
	mapActions = require( 'vuex' ).mapActions,
	mapGetters = require( 'vuex' ).mapGetters;

// @vue/component
module.exports = exports = {
	name: 'wl-z-object',
	components: {
		'wl-z-multilingual-string': ZMultilingualString,
		'wl-z-reference': ZReference,
		'wl-z-string': ZString,
		'wl-z-object-generic': ZObjectGeneric,
		'wl-z-code': ZCode,
		'wl-z-argument': ZArgument,
		'wl-z-function-call': ZFunctionCall,
		'wl-z-object-selector': ZObjectSelector,
		'wl-z-function': ZFunction,
		'wl-z-boolean': ZBoolean,
		'wl-z-implementation': ZImplementation,
		'wl-z-argument-reference': ZArgumentReference,
		'wl-z-tester': ZTester,
		'wl-z-persistentobject': ZPersistentObject,
		'wl-z-character': ZCharacter,
		'wl-z-responseenvelope': ZResponseEnvelope,
		'wl-z-type': ZType,
		'wl-z-typed-list': ZTypedList,
		'wl-z-typed-pair': ZTypedPair,
		'wl-z-typed-map': ZTypedMap,
		'wl-z-function-call-to-type': ZFunctionCallToType,
		'wl-z-key': ZKey
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
		},
		referenceType: {
			type: String,
			required: false,
			default: null
		}
	},
	data: function () {
		return {
			Constants: Constants
		};
	},
	computed: $.extend( mapGetters( [ 'getZObjectById', 'getZObjectTypeById' ] ),
		{
			type: function () {
				return this.getZObjectTypeById( this.zobjectId );
			},
			zObject: function () {
				return this.getZObjectById( this.zobjectId );
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
						return 'wl-z-persistentobject';
					case Constants.Z_STRING:
						return 'wl-z-string';
					case Constants.Z_REFERENCE:
						return 'wl-z-reference';
					case Constants.Z_MULTILINGUALSTRING:
						return 'wl-z-multilingual-string';
					case Constants.Z_TYPED_LIST:
						if ( this.zObject && this.zObject.value === 'array' ) {
							return 'wl-z-typed-list';
						} else {
							return 'wl-z-object-generic';
						}
					case Constants.Z_TYPED_PAIR:
						return 'wl-z-typed-pair';
					case Constants.Z_TYPED_MAP:
						return 'wl-z-typed-map';
					case Constants.Z_CODE:
						return 'wl-z-code';
					case Constants.Z_ARGUMENT:
						return 'wl-z-argument';
					case Constants.Z_FUNCTION_CALL:
						return 'wl-z-function-call';
					case Constants.Z_FUNCTION:
						// Prevent rendering the ZFunction component is not the root element
						if ( this.parentType === Constants.Z_PERSISTENTOBJECT ) {
							return 'wl-z-function';
						} else {
							return 'wl-z-object-generic';
						}
					case Constants.Z_BOOLEAN:
						return 'wl-z-boolean';
					case Constants.Z_IMPLEMENTATION:
						return 'wl-z-implementation';
					case Constants.Z_ARGUMENT_REFERENCE:
						return 'wl-z-argument-reference';
					case Constants.Z_NOTHING:
						return 'wl-z-nothing';
					case Constants.Z_TESTER:
						return 'wl-z-tester';
					case Constants.Z_CHARACTER:
						return 'wl-z-character';
					case Constants.Z_RESPONSEENVELOPE:
						return 'wl-z-responseenvelope';
					case Constants.Z_TYPE:
						return 'wl-z-type';
					case Constants.Z_FUNCTION_CALL_TO_TYPE:
						return 'wl-z-function-call-to-type';
					case Constants.Z_KEY:
						return 'wl-z-key';
					default:
						return 'wl-z-object-generic';
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
		this.fetchZKeys( { zids: [ this.type ] } );
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
