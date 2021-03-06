<template>
	<!--
		WikiLambda Vue interface module for generic ZObject manipulation.

		@copyright 2020–2021 WikiLambda team; see AUTHORS.txt
		@license MIT
	-->
	<div :class="classZObject">
		<!-- Depending on the type, it will render a different component -->
		<z-object-selector
			v-if="type === Constants.Z_OBJECT"
			:type="Constants.Z_TYPE"
			:placeholder="$i18n( 'wikilambda-argument-typeselector-label' )"
			@input="changeZObjectType"
		></z-object-selector>

		<component
			:is="determineComponent"
			v-else-if="type !== undefined"
			:zobject-id="zobjectId"
			:type="type"
			:persistent="persistent"
			:readonly="readonly"
		></component>
	</div>
</template>

<script>
var Constants = require( '../Constants.js' ),
	typeUtils = require( '../mixins/typeUtils.js' ),
	ZObjectGeneric = require( './ZObjectGeneric.vue' ),
	ZList = require( './types/ZList.vue' ),
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
	ZNothing = require( './types/ZNothing.vue' ),
	mapActions = require( 'vuex' ).mapActions,
	mapGetters = require( 'vuex' ).mapGetters;

module.exports = {
	name: 'ZObject',
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
		'z-nothing': ZNothing
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
					Constants.Z_ARGUMENT_REFERENCE
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
					case Constants.Z_STRING:
						return 'z-string';
					case Constants.Z_REFERENCE:
						return 'z-reference';
					case Constants.Z_MULTILINGUALSTRING:
						return 'z-multilingual-string';
					case Constants.Z_LIST:
						return 'z-list';
					case Constants.Z_CODE:
						return 'z-code';
					case Constants.Z_ARGUMENT:
						return 'z-argument';
					case Constants.Z_FUNCTION_CALL:
						return 'z-function-call';
					case Constants.Z_FUNCTION:
						return 'z-function';
					case Constants.Z_BOOLEAN:
						return 'z-boolean';
					case Constants.Z_IMPLEMENTATION:
						return 'z-implementation';
					case Constants.Z_ARGUMENT_REFERENCE:
						return 'z-argument-reference';
					case Constants.Z_NOTHING:
						return 'z-nothing';
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
