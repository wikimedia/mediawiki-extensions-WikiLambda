<template>
	<!--
		WikiLambda Vue interface module for top-level view encapsulation.

		@copyright 2020–2021 WikiLambda team; see AUTHORS.txt
		@license MIT
	-->
	<!-- TODO: Add a loading indicator, once T254695 is done upstream. -->
	<div id="ext-wikilambda-view">
		<z-object
			:persistent="true"
		></z-object>
		<button @click="$store.dispatch( 'toggleExpertMode' )">
			<template v-if="$store.getters.isExpertMode">
				{{ $i18n( 'wikilambda-disable-expert-mode' ) }}
			</template>
			<template v-else>
				{{ $i18n( 'wikilambda-enable-expert-mode' ) }}
			</template>
		</button>
	</div>
</template>

<script>
var ZObject = require( './ZObject.vue' ),
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions,
	ZObjectJson = require( './ZObjectJson.vue' );

module.exports = {
	name: 'ZObjectViewer',
	components: {
		'z-object': ZObject,
		'z-object-json': ZObjectJson
	},
	computed: mapGetters( {
		ZObjectJson: 'getZObjectAsJson'
	} ),
	methods: mapActions( [ 'initialize' ] ),
	created: function () {
		this.initialize();
	}
};
</script>

<style lang="less">
.ext-wikilambda-view-nojsfallback {
	display: none;
}

.ext-wikilambda-view-nojswarning {
	font-weight: bold;
	margin-bottom: 1em;
}
</style>
