<template>
	<!--
		WikiLambda Vue interface module for generic ZObject manipulation.

		@copyright 2020–2021 WikiLambda team; see AUTHORS.txt
		@license MIT
	-->
	<div id="ext-wikilambda-app">
		<!--
			I am using v-show instead than v-if on the template,
			as the v-show will trigger a render before the object is initialized
		-->
		<template v-if="zObjectInitialized">
			<z-object-editor
				v-if="viewmode === false"
			></z-object-editor>
			<z-object-viewer
				v-if="viewmode === true"
			></z-object-viewer>
		</template>
		<span v-else>
			{{ $i18n( 'wikilambda-loading' ) }}
		</span>
	</div>
</template>

<script>
var ZObjectEditor = require( './ZObjectEditor.vue' ),
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions,
	ZObjectViewer = require( './ZObjectViewer.vue' );

module.exports = {
	name: 'App',
	components: {
		'z-object-editor': ZObjectEditor,
		'z-object-viewer': ZObjectViewer
	},
	computed: mapGetters( {
		zObjectInitialized: 'getZObjectInitialized',
		viewmode: 'getViewMode'
	} ),
	methods: mapActions( [ 'initializeZObject' ] ),
	created: function () {
		// Set zobject
		this.initializeZObject();
	}
};
</script>
