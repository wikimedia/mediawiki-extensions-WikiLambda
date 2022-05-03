<template>
	<!--
		WikiLambda Vue component for ZResponseEnvelope objects.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-zresponseenvelope">
		<div>
			<z-object-key
				:zobject-id="zFirst.id"
				:parent-type="Constants.Z_RESPONSEENVELOPE"
				:readonly="readonly"
			></z-object-key>
		</div>
		<div class="ext-wikilambda-zresponseenvelope__show-more">
			<cdx-button
				@click.prevent="showSecond = !showSecond"
			>
				Show More
			</cdx-button>
		</div>
		<div v-if="showSecond">
			<hr>
			<z-object-key
				:zobject-id="zSecond.id"
				:parent-type="Constants.Z_RESPONSEENVELOPE"
				:readonly="readonly"
			></z-object-key>
		</div>
	</div>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	typeUtils = require( '../../mixins/typeUtils.js' ),
	ZObjectKey = require( '../ZObjectKey.vue' ),
	CdxButton = require( '@wikimedia/codex' ).CdxButton,
	mapGetters = require( 'vuex' ).mapGetters;

// @vue/component
module.exports = exports = {
	components: {
		'z-object-key': ZObjectKey,
		'cdx-button': CdxButton
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
			return this.findKeyInArray( Constants.Z_RESPONSEENVELOPE_VALUE, this.zobject );
		},
		zSecond: function () {
			return this.findKeyInArray( Constants.Z_RESPONSEENVELOPE_METADATA, this.zobject );
		}
	} )
};
</script>

<style lang="less">
.ext-wikilambda-zresponseenvelope {
	&__show-more {
		padding: 10px 0;
	}
}
</style>
