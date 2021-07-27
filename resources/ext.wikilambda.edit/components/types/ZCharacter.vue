<template>
	<!--
		WikiLambda Vue component for ZString objects.

		@copyright 2020–2021 WikiLambda team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-zstring">
		<span>
			<span v-if="readonly || viewmode">{{ zobjectStringValueItem.value }}</span>
			<input
				v-else
				class="ext-wikilambda-zstring ext-wikilambda-zcharacter"
				:value="zobjectStringValueItem.value"
				maxlength="1"
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
		readonly: {
			type: Boolean,
			default: false
		},
		zobjectId: {
			type: Number,
			required: true
		}
	},
	mixins: [ typeUtils ],
	computed: $.extend( mapGetters( {
		getZObjectById: 'getZObjectById',
		getZObjectChildrenById: 'getZObjectChildrenById',
		viewmode: 'getViewMode',
		getNestedZObjectById: 'getNestedZObjectById'
	} ), {
		zobjectStringValueItem: function () {
			return this.getNestedZObjectById( this.zobjectId, [
				Constants.Z_CHARACTER_VALUE,
				Constants.Z_STRING_VALUE
			] );
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
.ext-wikilambda-zcharacter {
	width: 30px;
}
</style>
