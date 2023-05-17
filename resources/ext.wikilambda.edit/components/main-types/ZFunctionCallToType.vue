<template>
	<!--
		WikiLambda Vue component for ZFunctionCallToType objects.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-function-call-to-type-block">
		<template v-if="!allArgumentsTypeSet">
			<div v-for="( argument, index ) in functionCallArguments" :key="argument.id">
				<wl-z-object-selector
					:type="Constants.zType"
					:placeholder="$i18n( 'wikilambda-ztyped-map-placeholder' ).text()"
					:disabled="readonly"
					@input="onTypeChange( $event, argument.id, index )"
				></wl-z-object-selector>
			</div>
		</template>
		<template v-else>
			<!-- eslint-disable-next-line vue/no-unregistered-components -->
			<wl-z-object
				v-for="key in objectKeys"
				:key="key.id"
				:zobject-id="key.id"
				:readonly="readonly"
				:persistent="false"
			></wl-z-object>
		</template>
	</div>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	ZObjectSelector = require( '../ZObjectSelector.vue' ),
	mapActions = require( 'vuex' ).mapActions,
	mapGetters = require( 'vuex' ).mapGetters,
	typeUtils = require( '../../mixins/typeUtils.js' );

// @vue/component
module.exports = exports = {
	name: 'wl-z-function-call-to-type',
	components: {
		'wl-z-object-selector': ZObjectSelector
	},
	mixins: [ typeUtils ],
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
			functionCallArgumentsType: []
		};
	},
	computed: $.extend( mapGetters( [
		'getZObjectChildrenByIdRecursively',
		'getNestedZObjectById'
	] ), {
		zobjectChildren: function () {
			return this.getZObjectChildrenByIdRecursively( this.zobjectId );
		},
		Constants: function () {
			return Constants;
		},
		zObjectType: function () {
			// We can receive a straigh reference, a function call, or a functioncall with a reference
			var typeFromFunctionCallWithReference = this.getNestedZObjectById(
					this.zobjectId,
					[ Constants.Z_OBJECT_TYPE, Constants.Z_FUNCTION_CALL_FUNCTION, Constants.Z_REFERENCE_ID ]
				) || {},
				typeFromFunctionCall = this.getNestedZObjectById(
					this.zobjectId,
					[ Constants.Z_OBJECT_TYPE, Constants.Z_FUNCTION_CALL_FUNCTION ]
				) || {},
				typeFromReference = this.getNestedZObjectById(
					this.zobjectId,
					[ Constants.Z_OBJECT_TYPE, Constants.Z_REFERENCE_ID ]
				) || {};

			return typeFromFunctionCallWithReference.value || typeFromFunctionCall.value || typeFromReference.value;
		},
		// This are the argument needed for the function call to be performed
		functionCallArguments: function () {
			var keys = this.zobjectChildren.filter( function ( child ) {
				return child.key.indexOf( this.zObjectType ) !== -1;
			}.bind( this ) );

			return keys;
		},
		// This are the individual keys from the type of the function call
		objectKeys: function () {
			// we return all the immediate children that are not Z_OBJECT_TYPE (Z1K1)
			return this.zobjectChildren.filter( function ( child ) {
				return child.key !== Constants.Z_OBJECT_TYPE && child.parent === this.zobjectId;
			}.bind( this ) );
		},
		allArgumentsTypeSet: function () {
			return this.functionCallArguments.every( ( argument ) => argument.value !== '' );
		},
		dynamicZKey: function () {
			return this.zObjectType + mw.msg(
				'parentheses',
				this.functionCallArgumentsType.join( mw.msg( 'comma-separator' ) )
			);
		}
	} ),
	methods: $.extend( mapActions( [
		'changeType',
		'retriveTypeOfFunctionToType'
	] ), {
		onTypeChange: function ( type, argumentId, index ) {
			this.changeType( {
				type: Constants.Z_REFERENCE,
				value: type,
				id: argumentId
			} );
			this.argumentsType[ index ] = type;
		}
	} ),
	watch: {
		allArgumentsTypeSet: function ( allValuesSet ) {
			if ( allValuesSet ) {
				this.retriveTypeOfFunctionToType( { objectId: this.zobjectId, dynamicZKey: this.dynamicZKey } )
					.then( function () {
						this.changeType( {
							id: this.zobjectId,
							type: this.dynamicZKey
						} );
					}.bind( this ) );
			}
		}
	},
	beforeCreate: function () {
		this.$options.components[ 'wl-z-object' ] = require( '../ZObject.vue' );
	}
};
</script>

<style lang="less">
.ext-wikilambda-function-call-to-type-block {
	background: rgba( 0, 0, 0, 0.03 );
	outline: 1px dotted #888;
	margin: 5px;
	padding: 5px;
}

.ext-wikilambda-orchestrated-result {
	display: block;
	padding: 1em;
	background: #eef;
	outline: 1px dashed #888;
}

.ext-wikilambda-orchestrated-result > span {
	display: inline-block;
	vertical-align: top;
	margin-top: 5px;
}
</style>
