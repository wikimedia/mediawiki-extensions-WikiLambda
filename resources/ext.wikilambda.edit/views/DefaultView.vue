<template>
	<!--
		WikiLambda Vue root component to render the Default View

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div>
		<!-- Root zobject key value has no key and the zobject Index is 0 -->
		<wl-z-object-key-value
			:edit="edit"
		></wl-z-object-key-value>

		<wl-z-object-json
			:readonly="true"
			:zobject-raw="getZObjectAsJson"
		></wl-z-object-json>
	</div>
</template>

<script>

var
	ZObjectKeyValue = require( '../components/default-view-types/ZObjectKeyValue.vue' ),
	ZObjectJson = require( '../components/ZObjectJson.vue' ),
	mapGetters = require( 'vuex' ).mapGetters;

// @vue/component
module.exports = exports = {
	name: 'wl-default-view',
	components: {
		'wl-z-object-key-value': ZObjectKeyValue,
		'wl-z-object-json': ZObjectJson
	},
	data: function () {
		return {};
	},
	computed: $.extend( mapGetters( [ 'getZObjectAsJson', 'getViewMode' ] ), {
		edit: function () {
			return !this.getViewMode;
		}
	} )
};
</script>
