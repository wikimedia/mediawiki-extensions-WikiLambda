<template>
	<!--
		WikiLambda Vue interface module for generic ZObject manipulation.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div id="ext-wikilambda-app" class="ext-wikilambda-edit">
		<template v-if="getZObjectInitialized">
			<component :is="getCurrentView" :bind="getQueryParams"></component>
		</template>
		<span v-else>
			{{ $i18n( 'wikilambda-loading' ) }}
		</span>
	</div>
</template>

<script>
var mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions,
	FunctionEditor = require( '../views/FunctionEditor.vue' ),
	FunctionViewer = require( '../views/FunctionViewer.vue' ),
	ZObjectViewer = require( '../views/ZObjectViewer.vue' ),
	ZObjectEditor = require( '../views/ZObjectEditor.vue' );

// @vue/component
module.exports = exports = {
	name: 'app',
	components: {
		'function-editor': FunctionEditor,
		'function-viewer': FunctionViewer,
		'zobject-viewer': ZObjectViewer,
		'zobject-editor': ZObjectEditor
	},
	inject: {
		viewmode: { default: false }
	},
	computed: $.extend(
		mapGetters( [
			'getZObjectInitialized'
		] ), mapGetters(
			'router',
			[ 'getCurrentView', 'getQueryParams' ]
		)
	),
	methods: $.extend(
		mapActions( [ 'initializeZObject', 'initialize' ] ),
		mapActions( 'router', [ 'evaluateUri', 'navigate' ] )
	),
	created: function () {
		// Set zobject
		this.initializeZObject().then(
			function () {
				this.initialize( this.$i18n );
				$.$i18n = this.$i18n;
				this.evaluateUri();
			}.bind( this )
		);

		window.onpopstate = function () {
			this.evaluateUri();
		}.bind( this );
	}
};
</script>
