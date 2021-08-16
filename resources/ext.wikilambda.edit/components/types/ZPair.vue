<template>
	<!--
		WikiLambda Vue component for ZPair objects.

		@copyright 2020–2021 WikiLambda team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-zpair">
		<div>
			<z-object-key
				:zobject-id="zFirst.id"
				:parent-type="Constants.Z_PAIR"
				:readonly="readonly"
			></z-object-key>
		</div>
		<div class="ext-wikilambda-zpair__show-more">
			<button
				@click.prevent="showSecond = !showSecond"
			>
				Show More
			</button>
		</div>
		<div v-if="showSecond">
			<hr>
			<z-object-key
				:zobject-id="zSecond.id"
				:parent-type="Constants.Z_PAIR"
				:readonly="readonly"
			></z-object-key>
		</div>
	</div>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	typeUtils = require( '../../mixins/typeUtils.js' ),
	ZObjectKey = require( '../ZObjectKey.vue' ),
	mapGetters = require( 'vuex' ).mapGetters;

module.exports = {
	components: {
		'z-object-key': ZObjectKey
	},
	mixins: [ typeUtils ],
	props: {
		zobjectId: {
			type: Number,
			required: true
		},
		readonly: {
			type: Boolean,
			default: false
		}
	},
	data: function () {
		return {
			showSecond: false
		};
	},
	computed: $.extend( mapGetters( [
		'getZObjectChildrenById'
	] ), {
		Constants: function () {
			return Constants;
		},
		zobject: function () {
			return this.getZObjectChildrenById( this.zobjectId );
		},
		zFirst: function () {
			return this.findKeyInArray( Constants.Z_PAIR_FIRST, this.zobject );
		},
		zSecond: function () {
			return this.findKeyInArray( Constants.Z_PAIR_SECOND, this.zobject );
		}
	} )
};
</script>

<style lang="less">
.ext-wikilambda-zpair {
	&__show-more {
		padding: 10px 0;
	}
}
</style>
