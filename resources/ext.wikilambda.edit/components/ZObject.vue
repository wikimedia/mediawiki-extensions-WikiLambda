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
			:viewmode="viewmode"
			@input="changeZObjectType"
		></z-object-selector>

		<z-string
			v-else-if="type === Constants.Z_STRING"
			:zobject-id="zobjectId"
			:viewmode="viewmode"
		></z-string>

		<z-reference
			v-else-if="type === Constants.Z_REFERENCE"
			:zobject-id="zobjectId"
			:viewmode="viewmode"
		></z-reference>

		<z-multilingual-string
			v-else-if="type === Constants.Z_MULTILINGUALSTRING"
			:zobject-id="zobjectId"
			:viewmode="viewmode"
		></z-multilingual-string>

		<z-list
			v-else-if="type === Constants.Z_LIST"
			:zobject-id="zobjectId"
			:viewmode="viewmode"
		></z-list>

		<z-code
			v-else-if="type === Constants.Z_CODE"
			:zobject-id="zobjectId"
			:viewmode="viewmode"
		></z-code>

		<z-argument
			v-else-if="type === Constants.Z_ARGUMENT"
			:zobject-id="zobjectId"
			:viewmode="viewmode"
		></z-argument>

		<z-function-call
			v-else-if="type === Constants.Z_FUNCTION_CALL"
			:zobject-id="zobjectId"
			:viewmode="viewmode"
		></z-function-call>

		<z-function
			v-else-if="type === Constants.Z_FUNCTION"
			:zobject-id="zobjectId"
			:viewmode="viewmode"
		></z-function>

		<z-object-generic
			v-else-if="type !== undefined"
			:zobject-id="zobjectId"
			:type="type"
			:persistent="persistent"
			:viewmode="viewmode"
		></z-object-generic>
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
		'z-function': ZFunction
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
		viewmode: {
			type: Boolean,
			required: true
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
				return (
					( this.type === Constants.Z_STRING ) ||
					( this.type === Constants.Z_REFERENCE )
				);
			},
			classZObject: function () {
				return {
					'ext-wikilambda-zobject': true,
					'ext-wikilambda-zobject-inline': this.isInlineComponent
				};
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
