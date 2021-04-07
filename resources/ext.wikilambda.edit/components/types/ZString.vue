<template>
	<!--
		WikiLambda Vue interface module for generic ZObject manipulation.

		@copyright 2020–2021 WikiLambda team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-zstring">
		<span>
			<span v-if="viewmode">{{ zobjectStringValueItem.value }}</span>
			<input
				v-else
				class="ext-wikilambda-zstring"
				:value="zobjectStringValueItem.value"
				@change="onInput"
			>
		</span>
	</div>
</template>

<script>
var Constants = require( './../../Constants.js' ),
	typeUtils = require( './../../mixins/typeUtils.js' ),
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions;

module.exports = {
	name: 'ZString',
	props: {
		viewmode: {
			type: Boolean,
			required: true
		},
		zobjectId: {
			type: Number,
			required: true
		}
	},
	mixins: [ typeUtils ],
	computed: $.extend( mapGetters( {
		getZObjectById: 'getZObjectById',
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
		mapActions( [ 'setZObjectValue' ] ),
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
