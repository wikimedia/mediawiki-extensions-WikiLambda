<template>
	<!--
		WikiLambda Vue component for ZString objects.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-zstring">
		<span>
			<span v-if="readonly || viewmode">{{ zobjectStringValueItem.value }}</span>
			<input
				v-else
				class="ext-wikilambda-zstring"
				:value="zobjectStringValueItem.value"
				@input="onInput"
			>
		</span>
	</div>
</template>

<script>
var Constants = require( './../../Constants.js' ),
	typeUtils = require( './../../mixins/typeUtils.js' ),
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions;

// @vue/component
module.exports = exports = {
	name: 'z-string',
	mixins: [ typeUtils ],
	inject: {
		viewmode: { default: false }
	},
	props: {
		readonly: {
			type: Boolean,
			default: false
		},
		zobjectId: {
			type: Number,
			required: true
		}
	},
	computed: $.extend( mapGetters( {
		getZObjectChildrenById: 'getZObjectChildrenById'
	} ), {
		zobjectStringValueItem: function () {
			var stringValueItem = this.findKeyInArray( Constants.Z_STRING_VALUE, this.zobjectChildren );
			if ( !stringValueItem ) {
				return {};
			} else {
				return stringValueItem;
			}
		},
		zobjectChildren: function () {
			return this.getZObjectChildrenById( this.zobjectId );
		}
	} ),
	methods: $.extend( {},
		mapActions( [ 'setZObjectValue', 'setIsZObjectDirty' ] ),
		{
		/**
		 * called setObjectValueById to update the current zobject entry value
		 *
		 * @param {Object} event
		 */
			onInput: function ( event ) {
				var payload = {
					id: this.zobjectStringValueItem.id,
					value: event.target.value
				};
				this.setZObjectValue( payload );
				this.setIsZObjectDirty( true );
			}
		} )
};
</script>

<style lang="less">
.ext-wikilambda-zstring {
	display: inline-block;
	margin-top: 3px;
}
</style>
