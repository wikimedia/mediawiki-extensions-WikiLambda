<template>
	<!--
		WikiLambda Vue interface module for generic ZObject manipulation.

		@copyright 2020–2021 WikiLambda team; see AUTHORS.txt
		@license MIT
	-->
	<div id="ext-wikilambda-app">
		<template v-if="getZObjectInitialized">
			<router-view></router-view>
		</template>
		<span v-else>
			{{ $i18n( 'wikilambda-loading' ) }}
		</span>
	</div>
</template>

<script>
var mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions;

module.exports = {
	name: 'App',
	inject: {
		viewmode: { default: false }
	},
	computed: $.extend( mapGetters( [
		'getZObjectInitialized'
	] ), {
	} ),
	methods: mapActions( [ 'initializeZObject', 'initialize' ] ),
	created: function () {
		// Set zobject
		this.initializeZObject();
		this.initialize();
	}
};
</script>
