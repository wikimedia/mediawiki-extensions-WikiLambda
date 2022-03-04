<template>
	<!--
		WikiLambda Vue interface module for generic ZObject manipulation.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div id="ext-wikilambda-app" class="ext-wikilambda-edit">
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

// @vue/component
module.exports = exports = {
	name: 'app',
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
		this.initializeZObject().then(
			function () {
				this.initialize( this.$i18n );
				$.$i18n = this.$i18n;
			}.bind( this )
		);

	}
};
</script>
